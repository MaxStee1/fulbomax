import { createSupabaseSessionStorage } from '@/lib/supabase-session-storage';

// Solo datos ficticios y una clave separada de cualquier sesión de Supabase.
const KEY = 'fulbomax-device-storage-check';
const fixture = JSON.stringify({ test: 'storage-v1', data: 'Fulbomax ⚽😀中'.repeat(1200) });
let running: Promise<string> | undefined;

export function runDeviceStorageCheck(mode: 'check' | 'cleanup'): Promise<string> {
  if (!__DEV__) return Promise.resolve('Prueba disponible solo en desarrollo.');
  running ??= check(mode);
  return running;
}

async function check(mode: 'check' | 'cleanup') {
  const storage = createSupabaseSessionStorage();
  if (mode === 'cleanup') {
    await storage.removeItem(KEY);
    if (await storage.getItem(KEY) !== null) throw new Error('Falló la limpieza de prueba.');
    return 'Datos ficticios eliminados. No se modificó ninguna sesión de Supabase.';
  }

  const persisted = (await storage.getItem(KEY)) === fixture;
  await storage.setItem(KEY, fixture);
  if (await storage.getItem(KEY) !== fixture) throw new Error('Falló la lectura de prueba.');
  const renewed = JSON.stringify({ test: 'renewed', data: '😀'.repeat(3000) });
  await Promise.all([storage.setItem(KEY, fixture), storage.setItem(KEY, renewed)]);
  if (await storage.getItem(KEY) !== renewed) throw new Error('Falló la renovación de prueba.');
  await storage.removeItem(KEY);
  if (await storage.getItem(KEY) !== null) throw new Error('Falló el borrado de prueba.');

  // Dejar únicamente una muestra ficticia para comprobar persistencia tras cerrar la app.
  await storage.setItem(KEY, fixture);
  return [
    'Sesión grande y Unicode: OK',
    'Renovación y concurrencia: OK',
    'Borrado local: OK',
    persisted ? 'Persistencia entre arranques: OK' : 'Persistencia entre arranques: pendiente; cierra y vuelve a abrir.',
    'Solo datos ficticios. Ejecuta el modo cleanup al terminar.',
  ].join('\n');
}
