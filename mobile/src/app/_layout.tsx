import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Alert, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { startSupabaseSessionRefresh } from '@/lib/supabase';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useEffect(() => startSupabaseSessionRefresh(), []);
  useEffect(() => {
    if (!__DEV__) return;
    const mode = process.env.EXPO_PUBLIC_STORAGE_CHECK;
    if (mode !== 'check' && mode !== 'cleanup') return;
    void import('@/dev/check-session-storage')
      .then(({ runDeviceStorageCheck }) => runDeviceStorageCheck(mode))
      .then((message) => Alert.alert('Prueba local de almacenamiento', message))
      .catch(() => Alert.alert('Prueba local de almacenamiento', 'La prueba falló. No se muestran valores ni detalles nativos.'));
  }, []);
  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
