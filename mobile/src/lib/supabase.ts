import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { validateSupabaseConfig } from './supabase-config';
import { supabaseSessionStorage } from './supabase-session-storage';

// Expo necesita referencias estáticas a process.env para incluir estas variables públicas.
const { url, key } = validateSupabaseConfig(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_KEY,
);
const isNative = Platform.OS !== 'web';

export const supabase = createClient(url, key, {
  auth: {
    debug: false,
    ...(isNative ? { storage: supabaseSessionStorage } : {}),
    persistSession: isNative,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// El layout registra un único listener y lo elimina al desmontarse o durante Fast Refresh.
export function startSupabaseSessionRefresh() {
  if (!isNative) return;

  function updateRefresh(state: AppStateStatus | null) {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  }

  updateRefresh(AppState.currentState);
  const subscription = AppState.addEventListener('change', updateRefresh);

  return () => {
    subscription.remove();
    void supabase.auth.stopAutoRefresh();
  };
}
