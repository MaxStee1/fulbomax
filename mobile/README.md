# Fulbomax móvil

Proyecto Expo SDK 57 con TypeScript y Expo Router. El contexto funcional y las reglas están en [docs](../docs/README.md).

## Configuración local

1. Instalar las dependencias del lockfile desde `mobile/` con `npm ci`.
2. Si todavía no existe `.env.local`, copiar `.env.example` a `.env.local`. No sobrescribir un archivo local existente.
3. Completar `EXPO_PUBLIC_SUPABASE_URL` con la URL HTTPS del proyecto y `EXPO_PUBLIC_SUPABASE_KEY` con su clave **publicable** desde el panel de Supabase. Nunca usar claves secretas ni `service_role`.

`.env.example` tiene valores vacíos. `.env.local` está excluido de Git; sus valores no deben copiarse al código ni a documentación. Las variables `EXPO_PUBLIC_` son visibles en el cliente compilado: solo admiten configuración pública. El cliente valida la URL y el formato de la clave sin mostrarlos en errores.

## Arranque

Desde `mobile/`:

```powershell
npx expo start
```

Abrir en Expo Go compatible con SDK 57 mediante el QR, o usar un development build. SecureStore está incluido en Expo Go; su config plugin se aplica al generar un nuevo build nativo. Recargar completamente la app tras cambiar `.env.local`. La vista web se inicia con `npm run web`.

## Cliente y almacenamiento

- `src/lib/supabase.ts` exporta un cliente único. El layout gestiona la renovación automática en primer plano y elimina el listener al desmontar.
- Android/iPhone: sesión persistida mediante Expo SecureStore, sin criptografía propia. En iOS se limita al dispositivo y a cuando está desbloqueado; el plugin excluye el almacén del backup automático de Android.
- Sesiones de hasta 64 KiB UTF-8: fragmentos de hasta 1024 bytes, sin partir puntos de código Unicode. Todos los fragmentos y el manifiesto permanecen en SecureStore con la misma protección.
- Dos bancos permiten escribir la sesión nueva sin tocar la vigente; un manifiesto pequeño publica el banco completo. Registra los slots antes de escribirlos para recuperar y limpiar operaciones interrumpidas. Migra los valores del adaptador anterior.
- Las llamadas del adaptador se serializan por clave en un único runtime JS, incluso entre instancias/Fast Refresh. No ofrece exclusión entre procesos, extensiones o runtimes independientes. Esta serialización se conserva y es distinta de la coordinación interna de Supabase: con Supabase JS/Auth JS 2.117.3, el cliente omite la opción obsoleta `auth.lock` siguiendo la [guía de migración oficial](https://github.com/supabase/supabase-js/blob/master/packages/core/auth-js/migrations/lockless-coordination.md).
- `removeItem` publica primero una marca de borrado y después elimina ambos bancos y el valor anterior. Si falla tras esa marca, el siguiente acceso reintenta la limpieza sin devolver la sesión eliminada. Si falla antes de publicar, informa error: no se debe dar por completado el cierre local. El futuro flujo de Auth deberá esperar el cierre de Supabase; este adaptador no revoca tokens remotos ni impide una nueva escritura solicitada después del borrado.
- Un fallo de limpieza posterior al commit puede devolver error aunque la nueva sesión ya esté publicada; reintentar recupera el estado completo. Se rechazan manifiestos/fragmentos inválidos y tamaños superiores a 64 KiB; nunca se trunca ni usa almacenamiento en texto plano. Auth tiene `debug: false` explícito.
- Web: sesión solo en memoria; no se guarda en localStorage. Es una vista de desarrollo, no una decisión de soporte web del producto.
- La pantalla y sus botones mantienen los avisos «Próximamente». Este paso no implementa registro, login, aprobación del club, TOTP ni enlaces de recuperación. Estos controles siguen sujetos a [Seguridad](../docs/seguridad.md) y [Decisiones pendientes](../docs/decisiones.md).

### Alternativas comparadas antes de implementar

| Alternativa documentada | Evaluación para este paso |
| --- | --- |
| [localStorage con SQLite, guía básica de Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) | Sencilla, pero su configuración básica no protege la sesión cifrada en reposo. No se adoptó. |
| [SecureStore directo](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/) | Mantenido por Expo y ya instalado; valores grandes pueden ser rechazados por la plataforma. |
| [LargeSecureStore, ejemplo de Supabase](https://supabase.com/docs/reference/javascript/initializing) | Combina AES con AsyncStorage y SecureStore. Es código de ejemplo con más dependencias y gestión criptográfica y de claves; no se incorporó ni se diseñó una variante propia. |
| [SQLite con SQLCipher](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/#sqlcipher) | Cifrado mantenido, pero añade otra dependencia, gestión de clave de base de datos y build nativo; no funciona en Expo Go. |

Se eligió conservar el mecanismo mantenido de Expo y fragmentar. El protocolo de fragmentación es código de Fulbomax, no una prestación transaccional oficial de SecureStore. Usa dos bancos acotados y un manifiesto, sin criptografía adicional ni dependencias nuevas. Depende de la sustitución de un valor nativo individual; si ese valor queda ilegible, falla sin ofrecer una sesión parcial. No garantiza durabilidad frente a cualquier fallo del sistema operativo ni recuperación de credenciales si se pierde el Keychain/Keystore.

## Comprobaciones

```powershell
npm run typecheck
npm test
npm run lint
git check-ignore .env.local
```

Las pruebas usan datos ficticios y mocks, sin red ni credenciales reales. ESLint aún no está instalado ni configurado; ejecutar lint ofrece instalarlo, y puede rechazarse para conservar las dependencias actuales.

### Comprobar en tu Android sin conectar autenticación

1. Conecta el teléfono y el PC a la misma red. Desde `mobile/`, inicia la prueba opcional:

   ```powershell
   $env:EXPO_PUBLIC_STORAGE_CHECK = 'check'
   npx expo start --clear
   ```

2. Abre el QR en Expo Go compatible con SDK 57 o en tu development build. Tras la pantalla de login aparecerá un aviso con resultados de sesión grande/Unicode, renovación, concurrencia y borrado **local**, todos con datos ficticios. No se llama a Supabase ni se modifica una sesión real desde esta prueba.
3. Al acabar queda una muestra ficticia protegida. Fuerza el cierre completo de la app desde Android y vuelve a abrir el proyecto. El aviso debe mostrar «Persistencia entre arranques: OK». Puedes repetir tras reiniciar y desbloquear el teléfono. No basta con Fast Refresh para probar persistencia entre procesos.
4. Para eliminar la muestra, detén Metro, cambia la variable y arranca de nuevo; recarga completamente el proyecto en el teléfono:

   ```powershell
   $env:EXPO_PUBLIC_STORAGE_CHECK = 'cleanup'
   npx expo start --clear
   ```

5. Confirma «Datos ficticios eliminados». Detén Metro y ejecuta `Remove-Item Env:EXPO_PUBLIC_STORAGE_CHECK`; después inicia la app normalmente. No edites ni compartas tus claves para ejecutar esta comprobación.

La comprobación está desactivada por defecto y no se ejecuta en producción. Según confirmación del usuario del 21 de octubre de 2026, en Android real pasaron las comprobaciones locales de sesión grande y Unicode, renovación y concurrencia, borrado y persistencia entre arranques; los datos ficticios se limpiaron. Esta evidencia corresponde al almacenamiento local con datos ficticios: no prueba autenticación real ni valida iPhone. Las interrupciones antes/después de cada operación y los errores nativos se cubren con simulaciones automatizadas; quedan pendientes las pruebas físicas de interrupción, fallos del Keychain/Keystore y pérdida de acceso al dispositivo. No se ha probado autenticación, rotación remota ni cierre remoto de sesión.

La auditoría del 14 de octubre de 2026 detectó 25 hallazgos (11 moderados y 14 altos) en dependencias preexistentes, con versiones que este paso no modificó. Revisarlos antes de publicar; no se aplicaron correcciones automáticas.

## Referencias oficiales consultadas

- [Supabase con Expo React Native](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native).
- [Sesiones y estado de la app en React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native).
- [Adaptador SecureStore para móvil](https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth).
- [SecureStore para Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/).
- [Variables de entorno Expo](https://docs.expo.dev/guides/environment-variables/) y [claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys).
