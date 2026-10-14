import { useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
  const theme = useTheme();
  const passwordInput = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [notice, setNotice] = useState('');
  const isDark = theme.background === '#000000';
  const accent = isDark ? '#87D9B0' : '#176B45';
  const onAccent = isDark ? '#102E20' : '#FFFFFF';
  const errorColor = isDark ? '#FFB4AB' : '#B3261E';

  function showUpcoming(action: string) {
    Keyboard.dismiss();
    setNotice(`${action} estará disponible próximamente.`);
  }

  function handleLogin() {
    const trimmedEmail = email.trim();
    const nextEmailError = !trimmedEmail
      ? 'Ingresa tu correo electrónico.'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
        ? 'Ingresa un correo válido, por ejemplo: nombre@correo.cl.'
        : '';
    const nextPasswordError = password.trim() ? '' : 'Ingresa tu contraseña.';
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setNotice('');
    if (!nextEmailError && !nextPasswordError) {
      showUpcoming('El inicio de sesión');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <SafeAreaView style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
            <View style={styles.content}>
              <View style={styles.brand}>
                <View accessible={false} style={[styles.badge, { backgroundColor: accent }]}>
                  <ThemedText style={[styles.badgeText, { color: onAccent }]}>F</ThemedText>
                </View>
                <ThemedText accessibilityRole="header" style={styles.brandName}>Fulbomax</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.presentation}>
                  Tu club, tu equipo, tu próxima jornada.
                </ThemedText>
              </View>

              <ThemedView type="backgroundElement" style={styles.card}>
                <View style={styles.heading}>
                  <ThemedText accessibilityRole="header" style={styles.title}>
                    Bienvenido a tu club
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    Ingresa con tu correo y contraseña.
                  </ThemedText>
                </View>

                <View style={styles.field}>
                  <ThemedText type="smallBold">Correo electrónico</ThemedText>
                  <TextInput
                    accessibilityLabel="Correo electrónico"
                    accessibilityHint={emailError || undefined}
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        backgroundColor: theme.background,
                        borderColor: emailError ? errorColor : theme.textSecondary,
                      },
                    ]}
                    placeholder="nombre@correo.cl"
                    placeholderTextColor={theme.textSecondary}
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      setEmailError('');
                      setNotice('');
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => passwordInput.current?.focus()}
                  />
                  {!!emailError && (
                    <ThemedText
                      accessibilityRole="alert"
                      accessibilityLiveRegion="polite"
                      type="small"
                      style={{ color: errorColor }}>
                      {emailError}
                    </ThemedText>
                  )}
                </View>

                <View style={styles.field}>
                  <ThemedText type="smallBold">Contraseña</ThemedText>
                  <View style={[
                    styles.passwordRow,
                    {
                      backgroundColor: theme.background,
                      borderColor: passwordError ? errorColor : theme.textSecondary,
                    },
                  ]}>
                    <TextInput
                      ref={passwordInput}
                      accessibilityLabel="Contraseña"
                      accessibilityHint={passwordError || undefined}
                      style={[styles.passwordInput, { color: theme.text }]}
                      placeholder="Tu contraseña"
                      placeholderTextColor={theme.textSecondary}
                      value={password}
                      onChangeText={(value) => {
                        setPassword(value);
                        setPasswordError('');
                        setNotice('');
                      }}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="off"
                      returnKeyType="go"
                      onSubmitEditing={handleLogin}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      onPress={() => setShowPassword((visible) => !visible)}
                      style={({ pressed }) => [styles.visibilityButton, pressed && styles.pressed]}>
                      <ThemedText type="smallBold" style={{ color: accent }}>
                        {showPassword ? 'Ocultar' : 'Mostrar'}
                      </ThemedText>
                    </Pressable>
                  </View>
                  {!!passwordError && (
                    <ThemedText
                      accessibilityRole="alert"
                      accessibilityLiveRegion="polite"
                      type="small"
                      style={{ color: errorColor }}>
                      {passwordError}
                    </ThemedText>
                  )}
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => showUpcoming('La recuperación de contraseña')}
                  style={({ pressed }) => [styles.forgotButton, pressed && styles.pressed]}>
                  <ThemedText type="smallBold" style={{ color: accent }}>Olvidé mi contraseña</ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleLogin}
                  style={({ pressed }) => [
                    styles.loginButton, { backgroundColor: accent }, pressed && styles.pressed,
                  ]}>
                  <ThemedText style={[styles.loginButtonText, { color: onAccent }]}>Iniciar sesión</ThemedText>
                </Pressable>
                {!!notice && (
                  <ThemedView style={styles.notice}>
                    <ThemedText accessibilityRole="alert" accessibilityLiveRegion="polite" type="small">
                      {notice}
                    </ThemedText>
                  </ThemedView>
                )}
              </ThemedView>

              <View style={styles.registration}>
                <ThemedText themeColor="textSecondary" type="small">¿Todavía no tienes cuenta?</ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => showUpcoming('El registro de jugadores')}
                  style={({ pressed }) => [styles.registerButton, pressed && styles.pressed]}>
                  <ThemedText style={{ color: accent, fontWeight: '700' }}>Registrarse</ThemedText>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: Spacing.four },
  content: { width: '100%', maxWidth: 460, alignSelf: 'center', gap: Spacing.three },
  brand: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  badge: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  badgeText: { fontSize: 30, lineHeight: 36, fontWeight: '800' },
  brandName: { fontSize: 36, lineHeight: 44, fontWeight: '800', letterSpacing: -1 },
  presentation: { textAlign: 'center', fontSize: 15, lineHeight: 22 },
  card: { padding: Spacing.four, borderRadius: 24, gap: Spacing.three },
  heading: { gap: Spacing.two, marginBottom: Spacing.two },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  field: { gap: Spacing.two },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 52, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12 },
  passwordInput: { flex: 1, minWidth: 0, minHeight: 52, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16 },
  visibilityButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12 },
  forgotButton: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' },
  loginButton: { minHeight: 54, borderRadius: 12, justifyContent: 'center', alignItems: 'center', padding: Spacing.three },
  loginButtonText: { fontWeight: '700', textAlign: 'center' },
  notice: { padding: Spacing.three, borderRadius: 12 },
  registration: { alignItems: 'center', gap: Spacing.one },
  registerButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: Spacing.four },
  pressed: { opacity: 0.7 },
});
