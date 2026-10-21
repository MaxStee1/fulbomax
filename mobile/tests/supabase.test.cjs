const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Pruebas sin red, credenciales reales ni dependencias adicionales de testing.
function loadModule(filename, mocks = {}, env = {}, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib', filename), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    URL,
    process: { env },
    require(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      throw new Error('Importación sin mock en la prueba.');
    },
    ...globals,
  });
  return exports;
}

const config = loadModule('supabase-config.ts');
const fixture = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  EXPO_PUBLIC_SUPABASE_KEY: 'sb_publishable_valor_ficticio',
};

test('acepta configuración pública y rechaza configuraciones inseguras sin revelar valores', () => {
  const result = config.validateSupabaseConfig(
    fixture.EXPO_PUBLIC_SUPABASE_URL,
    fixture.EXPO_PUBLIC_SUPABASE_KEY,
  );
  assert.equal(result.url, fixture.EXPO_PUBLIC_SUPABASE_URL);
  assert.equal(result.key, fixture.EXPO_PUBLIC_SUPABASE_KEY);
  assert.throws(() => config.validateSupabaseConfig(), /Configura EXPO_PUBLIC/);
  for (const url of ['no-es-url', 'http://example.supabase.co', 'https://usuario:privado@example.com']) {
    assert.throws(() => config.validateSupabaseConfig(url, fixture.EXPO_PUBLIC_SUPABASE_KEY), /URL HTTPS sin credenciales/);
  }
  for (const key of ['sb_secret_ficticia', 'eyJ.jwt.heredado', 'texto-invalido']) {
    assert.throws(() => config.validateSupabaseConfig(fixture.EXPO_PUBLIC_SUPABASE_URL, key),
      (error) => error.message.includes('clave publicable') && !error.message.includes(key));
  }
});

test('la sesión usa SecureStore con el mismo servicio y protección al leer, guardar y eliminar', async () => {
  const items = new Map();
  const calls = [];
  const store = {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7,
    async getItemAsync(key, options) { calls.push(options); return items.get(key) ?? null; },
    async setItemAsync(key, value, options) { calls.push(options); items.set(key, value); },
    async deleteItemAsync(key, options) { calls.push(options); items.delete(key); },
  };
  const { supabaseSessionStorage: storage } = loadModule('supabase-session-storage.ts', {
    'expo-secure-store': store,
  });
  await storage.setItem('session-test', 'token-ficticio');
  assert.equal(await storage.getItem('session-test'), 'token-ficticio');
  await storage.removeItem('session-test');
  assert.equal(await storage.getItem('session-test'), null);
  assert.ok(calls.length >= 4);
  for (const options of calls) {
    assert.equal(options.keychainService, 'fulbomax.supabase.session');
    assert.equal(options.keychainAccessible, 7);
  }
});

test('los errores nativos se propagan sin exponer tokens ni usar almacenamiento alternativo', async () => {
  const fail = async () => { throw new Error('detalle-con-token-ficticio'); };
  const { supabaseSessionStorage: storage } = loadModule('supabase-session-storage.ts', {
    'expo-secure-store': {
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7,
      getItemAsync: fail,
      setItemAsync: fail,
      deleteItemAsync: fail,
    },
  });
  for (const operation of [
    () => storage.getItem('session-test'),
    () => storage.setItem('session-test', 'token-ficticio'),
    () => storage.removeItem('session-test'),
  ]) {
    await assert.rejects(operation, (error) =>
      error.message === 'No se pudo acceder al almacenamiento seguro de la sesión.' && !error.cause);
  }
});

function loadClient(platform) {
  const actions = [];
  const storage = {};
  let options;
  let listener;
  const client = loadModule('supabase.ts', {
    'react-native-url-polyfill/auto': {},
    './supabase-config': config,
    './supabase-session-storage': { supabaseSessionStorage: storage },
    '@supabase/supabase-js': {
      createClient(_url, _key, configOptions) {
        options = configOptions;
        return { auth: {
          startAutoRefresh() { actions.push('start'); },
          stopAutoRefresh() { actions.push('stop'); },
        } };
      },
    },
    'react-native': {
      Platform: { OS: platform },
      AppState: {
        currentState: 'background',
        addEventListener(event, callback) {
          assert.equal(event, 'change');
          listener = callback;
          return { remove() { listener = undefined; actions.push('remove'); } };
        },
      },
    },
  }, fixture);
  return { client, storage, options, actions, changeState: (state) => listener(state), hasListener: () => !!listener };
}

test('en móvil renueva solo en primer plano y elimina el listener al desmontar', () => {
  for (const platform of ['android', 'ios']) {
    const setup = loadClient(platform);
    assert.equal(setup.options.auth.storage, setup.storage);
    assert.equal(setup.options.auth.persistSession, true);
    assert.equal(setup.options.auth.detectSessionInUrl, false);
    assert.equal(setup.options.auth.debug, false);
    assert.equal(Object.hasOwn(setup.options.auth, 'lock'), false);
    const cleanup = setup.client.startSupabaseSessionRefresh();
    setup.changeState('active');
    setup.changeState('inactive');
    cleanup();
    assert.deepEqual(setup.actions, ['stop', 'start', 'stop', 'remove', 'stop']);
    assert.equal(setup.hasListener(), false);
  }
});

test('la vista web no persiste sesiones ni accede al almacén nativo', () => {
  const setup = loadClient('web');
  assert.equal(setup.options.auth.persistSession, false);
  assert.equal(setup.options.auth.storage, undefined);
  assert.equal(setup.client.startSupabaseSessionRefresh(), undefined);
  assert.equal(setup.hasListener(), false);
});

// Simula límite por valor y corte de energía antes/después de cada operación.
// No representa una ejecución en Android/iOS real.
function storageHarness(initial = new Map()) {
  const items = new Map(initial);
  const calls = [];
  let fault;
  let off = false;
  async function operation(type, key, action, value) {
    if (off) throw new Error('native-failure-sensitive-canary');
    const record = { type, key };
    if (type === 'set' && key.endsWith('.state')) record.active = JSON.parse(value).active;
    calls.push(record);
    const hit = fault?.at === calls.length;
    if (hit && fault.phase === 'before') { off = true; throw new Error('native-failure-sensitive-canary'); }
    await new Promise((resolve) => setImmediate(resolve));
    const result = action();
    if (hit && fault.phase === 'after') { off = true; throw new Error('native-failure-sensitive-canary'); }
    return result;
  }
  const native = {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 7,
    getItemAsync: (key) => operation('get', key, () => items.get(key) ?? null),
    setItemAsync: (key, value) => operation('set', key, () => {
      assert.ok(Buffer.byteLength(value, 'utf8') <= 1024, 'Un valor nativo excedió 1 KiB.');
      items.set(key, value);
    }, value),
    deleteItemAsync: (key) => operation('delete', key, () => { items.delete(key); }),
  };
  let module;
  function adapter() {
    module ??= loadModule('supabase-session-storage.ts', { 'expo-secure-store': native });
    return module.createSupabaseSessionStorage();
  }
  return {
    native, items, calls, adapter,
    fail(at, phase) { calls.length = 0; fault = { at, phase }; off = false; },
    restart() { calls.length = 0; fault = undefined; off = false; module = undefined; return adapter(); },
  };
}

const storageError = (error) =>
  error.message === 'No se pudo acceder al almacenamiento seguro de la sesión.' && !error.cause;

function assertOnlyCommittedChunks(items, key) {
  const base = `fm1.${key.length}.${key}`;
  const state = JSON.parse(items.get(`${base}.state`));
  assert.equal(state.legacy, false);
  assert.equal(state.counts[1 - state.active], 0);
  assert.equal(items.has(key), false);
  assert.equal(items.size, state.counts[state.active] + 1);
  for (const value of items.values()) assert.ok(Buffer.byteLength(value, 'utf8') <= 1024);
}

test('sesiones grandes, límites exactos y Unicode sobreviven al reinicio del adaptador', async () => {
  const harness = storageHarness();
  let adapter = harness.adapter();
  for (const value of [
    '', 'x'.repeat(1024), 'x'.repeat(2048), 'x'.repeat(2049),
    JSON.stringify({ access_token: 'fake'.repeat(3000), user: { name: 'Árbitro ⚽ 😀 中' } }),
    '中'.repeat(21845), // 65535 bytes, no caracteres.
    '😀'.repeat(16384), // Límite exacto: 65536 bytes.
  ]) {
    await adapter.setItem('large', value);
    adapter = harness.restart();
    assert.equal(await adapter.getItem('large'), value);
    assertOnlyCommittedChunks(harness.items, 'large');
  }
  const snapshot = new Map(harness.items);
  await assert.rejects(() => adapter.setItem('large', 'x'.repeat(65537)), storageError);
  assert.deepEqual(harness.items, snapshot);
});

test('renovaciones con crecimiento y reducción eliminan todos los fragmentos anteriores', async () => {
  const harness = storageHarness();
  const adapter = harness.adapter();
  for (const size of [9000, 24000, 120, 17000, 10]) {
    const session = JSON.stringify({ refresh_token: `fake-${size}`, data: '⚽'.repeat(size / 3) });
    await adapter.setItem('renew', session);
    assert.equal(await adapter.getItem('renew'), session);
    assertOnlyCommittedChunks(harness.items, 'renew');
  }
  await adapter.removeItem('renew');
  assert.equal(await adapter.getItem('renew'), null);
  assert.equal(harness.items.size, 0);
});

test('lecturas, escrituras concurrentes y borrado se serializan entre instancias', async () => {
  const harness = storageHarness();
  const first = harness.adapter();
  const second = harness.adapter();
  const pending = [];
  for (let index = 0; index < 12; index++) {
    const value = `fake-${index}:` + '⚽'.repeat(1500);
    pending.push(first.setItem('race', value));
    pending.push(second.getItem('race').then((result) => assert.equal(result, value)));
  }
  pending.push(second.removeItem('race'));
  pending.push(first.getItem('race').then((result) => assert.equal(result, null)));
  await Promise.all(pending);
  assert.equal(harness.items.size, 0);
  await Promise.all([first.setItem('a', 'uno'), second.setItem('ab', 'dos')]);
  assert.equal(await first.getItem('a'), 'uno');
  assert.equal(await second.getItem('ab'), 'dos');
});

test('interrumpir cualquier paso de una renovación conserva una sola sesión completa', async () => {
  const seed = storageHarness();
  const oldValue = 'old-fake:'.repeat(350);
  const newValue = 'new-fake:'.repeat(650);
  await seed.adapter().setItem('crash', oldValue);
  const snapshot = new Map(seed.items);
  const success = storageHarness(snapshot);
  await success.adapter().setItem('crash', newValue);
  const commit = success.calls.findIndex((call) => call.type === 'set' && call.active === 1) + 1;
  assert.ok(commit > 0);
  for (const phase of ['before', 'after']) {
    for (let at = 1; at <= success.calls.length; at++) {
      const harness = storageHarness(snapshot);
      harness.fail(at, phase);
      await assert.rejects(() => harness.adapter().setItem('crash', newValue), storageError);
      const restarted = harness.restart();
      const committed = phase === 'before' ? at > commit : at >= commit;
      assert.equal(await restarted.getItem('crash'), committed ? newValue : oldValue);
      assertOnlyCommittedChunks(harness.items, 'crash');
    }
  }
});

test('un borrado interrumpido no resucita la sesión tras publicar el tombstone', async () => {
  const seed = storageHarness();
  const value = 'fake:'.repeat(900);
  await seed.adapter().setItem('logout', value);
  seed.items.set('logout', 'legacy-fake');
  const snapshot = new Map(seed.items);
  const success = storageHarness(snapshot);
  await success.adapter().removeItem('logout');
  const tombstone = success.calls.findIndex((call) => call.type === 'set' && call.active === null) + 1;
  for (const phase of ['before', 'after']) {
    for (let at = 1; at <= success.calls.length; at++) {
      const harness = storageHarness(snapshot);
      harness.fail(at, phase);
      await assert.rejects(() => harness.adapter().removeItem('logout'), storageError);
      const committed = phase === 'before' ? at > tombstone : at >= tombstone;
      assert.equal(await harness.restart().getItem('logout'), committed ? null : value);
      if (committed) assert.equal(harness.items.size, 0);
    }
  }
});

test('migra valores anteriores y recupera una migración interrumpida', async () => {
  const value = JSON.stringify({ refresh_token: 'fake', metadata: '中⚽😀'.repeat(900) });
  const harness = storageHarness(new Map([['migration', value]]));
  harness.fail(5, 'after');
  await assert.rejects(() => harness.adapter().getItem('migration'), storageError);
  assert.equal(await harness.restart().getItem('migration'), value);
  assertOnlyCommittedChunks(harness.items, 'migration');
});

test('una primera escritura interrumpida recupera null o el valor completo sin huérfanos', async () => {
  const value = 'fake-first-'.repeat(500);
  const success = storageHarness();
  await success.adapter().setItem('first', value);
  const commit = success.calls.findIndex((call) => call.type === 'set' && call.active === 0) + 1;
  for (const phase of ['before', 'after']) {
    for (let at = 1; at <= success.calls.length; at++) {
      const harness = storageHarness();
      harness.fail(at, phase);
      await assert.rejects(() => harness.adapter().setItem('first', value), storageError);
      const committed = phase === 'before' ? at > commit : at >= commit;
      assert.equal(await harness.restart().getItem('first'), committed ? value : null);
      if (committed) assertOnlyCommittedChunks(harness.items, 'first');
      else assert.equal(harness.items.size, 0);
    }
  }
});

test('un tombstone interrumpido durante migración nunca vuelve a leer el valor legado', async () => {
  const harness = storageHarness(new Map([['legacy-logout', 'fake-legacy']]));
  harness.fail(3, 'before'); // lectura, tombstone, eliminación del valor legado.
  await assert.rejects(() => harness.adapter().removeItem('legacy-logout'), storageError);
  assert.equal(await harness.restart().getItem('legacy-logout'), null);
  assert.equal(harness.items.size, 0);
});

test('fragmentos faltantes/corruptos no retornan sesiones parciales ni recurren al valor anterior', async () => {
  for (const corrupt of [null, 'alterado']) {
    const harness = storageHarness();
    await harness.adapter().setItem('broken', 'safe-fake'.repeat(1000));
    const chunkKey = [...harness.items.keys()].find((key) => key.includes('.b0.0'));
    if (corrupt === null) harness.items.delete(chunkKey);
    else harness.items.set(chunkKey, corrupt);
    harness.items.set('broken', 'legacy-fake');
    await assert.rejects(() => harness.adapter().getItem('broken'), storageError);
    await harness.adapter().removeItem('broken');
    assert.equal(harness.items.size, 0);
  }
  const harness = storageHarness();
  await harness.adapter().setItem('badmeta', 'fake'.repeat(800));
  const metaKey = [...harness.items.keys()].find((key) => key.endsWith('.state'));
  harness.items.set(metaKey, 'invalid-manifest');
  await assert.rejects(() => harness.adapter().getItem('badmeta'), storageError);
  await harness.adapter().removeItem('badmeta');
  assert.equal(harness.items.size, 0);
});

test('los fallos de almacenamiento no bloquean la cola ni escriben logs sensibles', async () => {
  const logs = [];
  const harness = storageHarness();
  const adapter = loadModule('supabase-session-storage.ts', { 'expo-secure-store': harness.native }, {}, {
    console: Object.fromEntries(['debug', 'log', 'warn', 'error', 'info'].map((method) => [method, (...args) => logs.push(args)])),
  }).supabaseSessionStorage;
  harness.fail(3, 'before');
  await assert.rejects(() => adapter.setItem('errors', 'fake-canary'.repeat(900)), storageError);
  harness.restart();
  await adapter.setItem('errors', 'renovado-ficticio');
  assert.equal(await adapter.getItem('errors'), 'renovado-ficticio');
  await adapter.removeItem('errors');
  assert.equal(logs.length, 0);
});

test('las claves internas no se interpretan como valores legados de otra sesión', async () => {
  const harness = storageHarness();
  const adapter = harness.adapter();
  await adapter.setItem('namespace', 'fake-protected');
  const snapshot = new Map(harness.items);
  for (const key of snapshot.keys()) {
    await assert.rejects(() => adapter.getItem(key), storageError);
    await assert.rejects(() => adapter.setItem(key, 'fake-overwrite'), storageError);
    await assert.rejects(() => adapter.removeItem(key), storageError);
  }
  assert.deepEqual(harness.items, snapshot);
  assert.equal(await adapter.getItem('namespace'), 'fake-protected');
});

test('el diagnóstico optativo usa solo su clave ficticia y permite comprobar reinicio y limpieza', async () => {
  const harness = storageHarness(new Map([['do-not-touch', 'sentinela-ficticia']]));
  const mocks = { '@/lib/supabase-session-storage': { createSupabaseSessionStorage: () => harness.adapter() } };
  const loadCheck = () => loadModule('../dev/check-session-storage.ts', mocks, {}, { __DEV__: true });
  assert.match(await loadCheck().runDeviceStorageCheck('check'), /Persistencia entre arranques: pendiente/);
  assert.match(await loadCheck().runDeviceStorageCheck('check'), /Persistencia entre arranques: OK/);
  assert.match(await loadCheck().runDeviceStorageCheck('cleanup'), /Datos ficticios eliminados/);
  assert.equal(harness.items.size, 1);
  assert.equal(harness.items.get('do-not-touch'), 'sentinela-ficticia');
  const production = loadModule('../dev/check-session-storage.ts', {
    '@/lib/supabase-session-storage': { createSupabaseSessionStorage: () => { throw new Error('No debe ejecutarse'); } },
  }, {}, { __DEV__: false });
  assert.match(await production.runDeviceStorageCheck('check'), /solo en desarrollo/);
});
