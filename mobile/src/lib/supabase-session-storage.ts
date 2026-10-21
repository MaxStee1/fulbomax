import * as SecureStore from 'expo-secure-store';

const CHUNK_BYTES = 1024;
const MAX_BYTES = 64 * 1024;
// Un punto de código puede dejar hasta tres bytes libres al final de un fragmento.
const MAX_CHUNKS = Math.ceil(MAX_BYTES / (CHUNK_BYTES - 3));
const ERROR_MESSAGE = 'No se pudo acceder al almacenamiento seguro de la sesión.';

const options: SecureStore.SecureStoreOptions = {
  keychainService: 'fulbomax.supabase.session',
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

type Backend = Pick<typeof SecureStore, 'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'>;
type Bank = 0 | 1;
type State = {
  v: 1;
  active: Bank | null;
  counts: [number, number];
  bytes: number;
  legacy: boolean;
};
class InvalidState extends Error {}

// Compartido por instancias y Fast Refresh, no solo por una llamada de Supabase.
// El contrato es un único runtime JS: no coordina otros procesos/extensiones.
const queueSymbol = Symbol.for('fulbomax.secure-store.queues.v1');
const runtime = globalThis as typeof globalThis & {
  [queueSymbol]?: Map<string, Promise<void>>;
};
const queues = (runtime[queueSymbol] ??= new Map());

function utf8Bytes(value: string) {
  let bytes = 0;
  for (const character of value) {
    const point = character.codePointAt(0)!;
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return bytes;
}

function splitValue(value: string) {
  const chunks: string[] = [];
  let chunk = '';
  let bytes = 0;
  let total = 0;
  for (const character of value) {
    const width = utf8Bytes(character);
    total += width;
    if (total > MAX_BYTES) throw new InvalidState();
    if (bytes + width > CHUNK_BYTES) {
      chunks.push(chunk);
      chunk = '';
      bytes = 0;
    }
    chunk += character;
    bytes += width;
  }
  chunks.push(chunk);
  return { chunks, bytes: total };
}

function decodeState(raw: string): State {
  try {
    const state = JSON.parse(raw);
    if (
      !state || state.v !== 1 ||
      ![null, 0, 1].includes(state.active) ||
      typeof state.legacy !== 'boolean' ||
      !Array.isArray(state.counts) || state.counts.length !== 2 ||
      !state.counts.every((n: unknown) => Number.isInteger(n) && Number(n) >= 0 && Number(n) <= MAX_CHUNKS) ||
      !Number.isInteger(state.bytes) || state.bytes < 0 || state.bytes > MAX_BYTES ||
      (state.active === null ? state.bytes !== 0 : state.legacy || state.counts[state.active] < 1)
    ) throw new InvalidState();
    return {
      v: 1,
      active: state.active,
      counts: [state.counts[0], state.counts[1]],
      bytes: state.bytes,
      legacy: state.legacy,
    };
  } catch {
    throw new InvalidState();
  }
}

export function createSupabaseSessionStorage(backend: Backend = SecureStore) {
  function names(key: string) {
    if (!/^[\w.-]+$/.test(key) || key.startsWith('fm1.')) throw new InvalidState();
    const base = `fm1.${key.length}.${key}`;
    return {
      meta: `${base}.state`,
      chunk: (bank: Bank, index: number) => `${base}.b${bank}.${index}`,
    };
  }

  async function readState(key: string): Promise<State> {
    const raw = await backend.getItemAsync(names(key).meta, options);
    return raw === null
      ? { v: 1, active: null, counts: [0, 0], bytes: 0, legacy: true }
      : decodeState(raw);
  }

  async function writeState(key: string, state: State) {
    await backend.setItemAsync(names(key).meta, JSON.stringify(state), options);
  }

  async function clean(key: string, state: State): Promise<State> {
    for (const bank of [0, 1] as const) {
      if (bank === state.active || state.counts[bank] === 0) continue;
      for (let index = 0; index < state.counts[bank]; index++) {
        await backend.deleteItemAsync(names(key).chunk(bank, index), options);
      }
      // No olvidar fragmentos hasta confirmar todas sus eliminaciones.
      state = { ...state, counts: [...state.counts] };
      state.counts[bank] = 0;
      await writeState(key, state);
    }
    if (!state.legacy) {
      await backend.deleteItemAsync(key, options);
      if (state.active === null) await backend.deleteItemAsync(names(key).meta, options);
    }
    return state;
  }

  async function save(key: string, value: string, state: State) {
    const { chunks, bytes } = splitValue(value);
    const bank: Bank = state.active === 0 ? 1 : 0;
    const intent: State = { ...state, counts: [...state.counts] };
    intent.counts[bank] = chunks.length;
    // Registrar TODOS los slots antes de escribir: permite recuperar una interrupción.
    await writeState(key, intent);
    for (let index = 0; index < chunks.length; index++) {
      await backend.setItemAsync(names(key).chunk(bank, index), chunks[index], options);
    }
    // Único punto de publicación: el lector nunca usa el banco incompleto.
    const committed: State = { ...intent, active: bank, bytes, legacy: false };
    await writeState(key, committed);
    await clean(key, committed);
  }

  async function exclusive<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const lock = `${options.keychainService}:${key}`;
    const pending = (queues.get(lock) ?? Promise.resolve()).then(operation);
    const settled = pending.then(() => {}, () => {});
    queues.set(lock, settled);
    try {
      return await pending;
    } catch {
      // No conservar causas nativas ni emitir logs con valores/credenciales.
      throw new Error(ERROR_MESSAGE);
    } finally {
      if (queues.get(lock) === settled) queues.delete(lock);
    }
  }

  return {
    getItem: (key: string) => exclusive(key, async () => {
      const state = await clean(key, await readState(key));
      if (state.active === null) {
        if (!state.legacy) return null;
        const legacy = await backend.getItemAsync(key, options);
        if (legacy !== null) await save(key, legacy, state);
        else await backend.deleteItemAsync(names(key).meta, options);
        return legacy;
      }
      const chunks: string[] = [];
      for (let index = 0; index < state.counts[state.active]; index++) {
        const chunk = await backend.getItemAsync(names(key).chunk(state.active, index), options);
        if (chunk === null || utf8Bytes(chunk) > CHUNK_BYTES) throw new InvalidState();
        chunks.push(chunk);
      }
      const value = chunks.join('');
      if (utf8Bytes(value) !== state.bytes) throw new InvalidState();
      return value;
    }),
    setItem: (key: string, value: string) => exclusive(key, async () => {
      // Rechazar tamaños excesivos antes de modificar el estado persistido.
      splitValue(value);
      const state = await clean(key, await readState(key));
      await save(key, value, state);
    }),
    removeItem: (key: string) => exclusive(key, async () => {
      let state: State;
      try {
        state = await readState(key);
      } catch (error) {
        if (!(error instanceof InvalidState)) throw error;
        // Ante un manifiesto corrupto, barrer el espacio acotado de ambos bancos.
        state = { v: 1, active: null, counts: [MAX_CHUNKS, MAX_CHUNKS], bytes: 0, legacy: false };
      }
      // Tombstone ANTES de eliminar: un cierre interrumpido no recupera tokens viejos.
      state = { ...state, active: null, bytes: 0, legacy: false };
      await writeState(key, state);
      await clean(key, state);
    }),
  };
}

export const supabaseSessionStorage = createSupabaseSessionStorage();
