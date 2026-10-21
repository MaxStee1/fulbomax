export function validateSupabaseConfig(urlValue?: string, keyValue?: string) {
  const url = urlValue?.trim();
  const key = keyValue?.trim();

  if (!url || !key) {
    throw new Error('Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_KEY en .env.local.');
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password) {
      throw new Error();
    }
  } catch {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL debe ser una URL HTTPS sin credenciales.');
  }

  // Rechaza claves secretas y JWT heredados antes de crear el cliente.
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error('EXPO_PUBLIC_SUPABASE_KEY debe ser una clave publicable de Supabase.');
  }

  return { url, key };
}
