# Auditoría de dependencias

## Estado al 21 de octubre de 2026

Revisión tras la actualización compatible de Expo SDK 57, sobre el commit `8cae05c`. Entorno: Node 22.17.1, npm 11.4.2; Expo 57.0.31, Router 57.0.29, CLI 57.0.32 y React Native 0.86.3.

- `npm audit --json`: **17 paquetes afectados: 14 altos y 3 moderados**, sin bajos ni críticos.
- `npm audit --omit=dev --json`: el mismo resultado. Las herramientas de Expo cuelgan de `dependencies`; esta clasificación de npm no demuestra que se ejecuten en el teléfono.
- Hay **3 vulnerabilidades raíz**, propagadas a sus dependientes. Los 17 registros no son 17 fallos independientes.
- SHA-256 de `mobile/package-lock.json`: `39dc2d0239e4fc00af4d9d198bc7ff9566a5e884b0adfce625b59ae8f963536e`.

No se modificaron dependencias ni se aplicaron correcciones automáticas. No se leyeron variables locales ni se incluyeron secretos. La auditoría consulta el registro público de npm; su resultado puede cambiar aunque no cambie el lockfile.

## Vulnerabilidades raíz y alcance

| Paquete instalado | Aviso y gravedad de npm | Alcance observado | Corrección disponible |
| --- | --- | --- | --- |
| `decode-uri-component@0.2.2` | [GHSA-vcc3-ghjq-m6fr / CVE-2026-45822](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), moderada; consumo excesivo de CPU con codificación porcentual malformada. npm afecta `<=0.4.2`. | **App móvil**: Router importa `query-string` para interpretar rutas y parámetros. Una URL controlada por terceros puede alcanzar el decodificador. No se demostró explotación en Fulbomax. | El [aviso del mantenedor](https://github.com/SamVerschueren/decode-uri-component/security/advisories/GHSA-vcc3-ghjq-m6fr) indica 0.5.0. Requiere resolver la incompatibilidad de módulos descrita abajo. |
| `braces@3.0.3` | [GHSA-vfj7-8cjw-p6xm / CVE-2026-93687](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), alta; patrones con anidación profunda agotan la pila. Afecta `<=3.0.3`. | **Herramientas de desarrollo y compilación**: globbing de Metro mediante `micromatch`. Requiere que un patrón no confiable llegue a ese procesamiento; no equivale a recibir datos de jugadores. | Sin versión corregida según el aviso; `latest` de npm sigue en 3.0.3. Seguimiento en el [repositorio oficial](https://github.com/micromatch/braces/issues/70). |
| `node-forge@1.4.0` | [GHSA-86w9-cpqp-85rv / CVE-2026-85393](https://github.com/advisories/GHSA-86w9-cpqp-85rv), alta; verificación RSA PKCS#1 v1.5 acepta estructuras malformadas, con falsificación bajo claves de exponente bajo. Afecta `<=1.4.0`. | **Herramientas de Expo**: certificados, firma y tareas iOS del CLI. `@expo/code-signing-certificates` sí llama a verificadores de certificados y firmas; no debe descartarse por usar también funciones de firma. No es el almacenamiento de sesión ni Supabase Auth. | Sin versión corregida según el aviso; `latest` sigue en 1.4.0. Es una corrección anterior incompleta; [seguimiento oficial](https://github.com/digitalbazaar/forge/issues/1149). |

La atribución del alcance se basa en dependencias y llamadas del código instalado; no se inspeccionó un APK/IPA de producción ni se ejecutaron ataques. No hay evidencia de que `braces` o `node-forge` se ejecuten en la app nativa publicada por estas cadenas. Sí importan para la seguridad del entorno que produce la app. El aviso original de decode indica `<0.4.2`, mientras que la base revisada de GitHub/npm incluye `<=0.4.2`; 0.2.2 está afectada en ambos casos.

## Cadenas y paquetes propagados

`→` significa dependencia, no que todo el código del padre sea vulnerable.

1. **Moderada, 3 registros:** `expo-router@57.0.29 → query-string@7.1.3 → decode-uri-component@0.2.2`. Los tres figuran en la auditoría.
2. **Alta, cadena Metro:** `expo@57.0.31 → @expo/metro@56.0.2 → metro-file-map@0.84.5 → micromatch@4.0.8 → braces@3.0.3`. También entra por `@expo/cli@57.0.32 → @expo/metro-config@57.0.13 → @expo/metro`, y por `react-native@0.86.3 → @react-native/community-cli-plugin@0.86.3 → metro/metro-config@0.84.5 → metro-file-map`. Hay ciclos de dependencias entre paquetes Metro.
3. **Alta, cadena certificados:** `expo → @expo/cli → node-forge@1.4.0` y `expo → @expo/cli → @expo/code-signing-certificates@0.0.6 → node-forge@1.4.0` (una instalación compartida).

Los **14 registros altos**, contando cada nombre una vez, son: `braces`, `micromatch`, `metro-file-map`, `metro`, `metro-config`, `metro-transform-worker`, `@expo/metro`, `@expo/metro-config`, `@react-native/community-cli-plugin`, `react-native`, `node-forge`, `@expo/code-signing-certificates`, `@expo/cli` y `expo`. Los dos últimos reciben avisos de ambas cadenas. Los demás son propagación, no avisos raíz nuevos.

## Comparación con el informe anterior

Se cotejaron los JSON locales conservados de las revisiones anteriores y el lockfile del commit `d5b99d5`, anterior a `8cae05c`.

| Problema | Antes | Ahora | Conclusión comprobada |
| --- | --- | --- | --- |
| `decode-uri-component` | 0.2.2 mediante `query-string@7.1.3` | Misma versión y cadena, aunque Router pasó de 57.0.26 a 57.0.29 | **Pendiente**; no se corrigió. |
| `uuid`, [GHSA-w5hq-g745-h8pq / CVE-2026-41907](https://github.com/advisories/GHSA-w5hq-g745-h8pq), moderada en npm | `@expo/config-plugins@57.0.10 → xcode@3.0.1 → uuid@7.0.3` | `@expo/config-plugins@57.0.11 → xcode@4.0.0`; xcode ya no depende de uuid. No aparece ninguna instalación de uuid en el árbol ni en el lockfile actual. | **Resuelto en este árbol por eliminación de la dependencia**, no por actualizar uuid. Era una cadena de herramientas iOS; el aviso se refiere a v3/v5/v6 con buffer de salida, no a cualquier uso de UUID. |
| `braces` | 3.0.3 | 3.0.3 | **Pendiente**, mismo aviso. No confundir con vulnerabilidades antiguas corregidas por 3.0.3. |
| `node-forge` | 1.4.0 | 1.4.0 | **Pendiente**, mismo aviso. Estar en 1.4.0 no resuelve esta verificación incompleta. |

El registro inicial del 14 de octubre tenía **25** paquetes afectados (11 moderados, 14 altos). Otro JSON anterior conservado tenía **20** (6 moderados, 14 altos). Ahora hay **17** (3 moderados, 14 altos). La última diferencia de tres registros corresponde a `uuid`, `xcode` y `@expo/config-plugins`, que ya no reciben ese aviso. Frente al registro de 25, tampoco aparecen como afectados `@expo/config`, `@expo/inline-modules`, `@expo/local-build-cache-provider`, `@expo/prebuild-config` ni `expo-splash-screen`: eran propagaciones, no otras cinco vulnerabilidades raíz. No se atribuye toda variación histórica exclusivamente a la actualización: los metadatos de avisos y propagación también cambian. Solo una de las cuatro raíces anteriores dejó de estar presente: **uuid**.

## Correcciones compatibles y siguiente paso

- La eliminación de uuid ya llegó mediante paquetes compatibles de SDK 57. No necesita un override a uuid 11; ese salto de interfaz no debe imponerse sobre xcode antiguo.
- **decode, prioridad por alcance móvil:** no hay parche publicado en `query-string@7` posterior a 7.1.3 ni en Router 57 posterior a 57.0.29 según el registro consultado. `query-string@7.1.3` requiere `decode-uri-component:^0.2.2` y hace `const decodeComponent = require(...)`, seguido de una llamada directa. La [versión 0.5.0](https://github.com/SamVerschueren/decode-uri-component/blob/v0.5.0/package.json) es ESM con exportación por defecto: un override simple fuera de rango cambia la forma del módulo y no es una corrección compatible demostrada. Node 22.17.1 cumple su mínimo Node 14.16; eso no valida la interoperabilidad con Metro/Hermes.
- npm propone Router 58.0.25 para decode. Sus [metadatos publicados](https://registry.npmjs.org/expo-router/58.0.25) eliminan `query-string`, pero incluyen paquetes Expo 58 y rangos de módulos nativos distintos. Es una posible solución mediante migración coordinada del SDK, no un reemplazo mínimo validado para SDK 57.
- **No hay un cambio de versión mínimo, publicado y confirmado compatible con SDK 57 que cierre las tres raíces pendientes.** El siguiente cambio acotado a evaluar es un backport mantenido para la cadena de decodificación que conserve la interfaz CommonJS de query-string 7, si se publica. Si se necesita resolver antes de ese backport, evaluar una migración coordinada a un SDK/Router que elimine esa cadena; no aplicarla automáticamente. Un parche local o adaptador ESM requeriría otra tarea, mantenimiento explícito y pruebas de rutas/URLs válidas, Unicode, entradas malformadas y exportación nativa; no se da por aprobado aquí.
- Para braces y node-forge, seguir las correcciones oficiales y la integración en Expo/Metro. Mientras tanto, limitar el entorno de compilación a proyectos/patrones y certificados de confianza, y evitar exponer Metro a redes no confiables. Son mitigaciones, no correcciones. No sustituir verificadores criptográficos con código propio.
- Descartar las recomendaciones automáticas de retroceder a Expo 44.0.6 o React Native 0.72.17: rompen la combinación SDK 57 y no constituyen una solución compatible. `fixAvailable:true` en un paquete intermedio tampoco demuestra un parche disponible para la raíz. No se ejecutó `npm audit fix`, ni siquiera sin `--force`.

Después de cualquier corrección aprobada: comprobar versiones con Expo, repetir auditoría y árbol, pruebas y TypeScript, exportar Android/iOS y probar navegación/URLs en dispositivos. La reducción del contador no sustituye verificar cada aviso.

## Reproducir

Desde la raíz, en PowerShell; comandos de consulta, sin instalación ni corrección:

```powershell
Set-Location mobile
node --version
npm --version
Get-FileHash -Algorithm SHA256 package-lock.json
npm audit --json
npm audit --omit=dev --json
npm ls decode-uri-component query-string uuid braces micromatch node-forge xcode --all
npm explain decode-uri-component
npm explain braces
npm explain node-forge
npm view decode-uri-component@0.5.0 version engines type exports --json
npm view query-string@7 version --json
npm view expo-router@57 version --json
npm view expo-router@58.0.25 dependencies --json
npm view braces dist-tags --json
npm view node-forge dist-tags --json
```

`npm audit` devuelve código 1 cuando encuentra vulnerabilidades; distinguirlo de un fallo de red (el primer intento aislado falló por DNS, las consultas posteriores al registro sí completaron). Los JSON actuales se conservaron localmente en `mobile/.expo/audit-2026-10-21.json` y `audit-2026-10-21-production.json`; `.expo` está ignorado, no es evidencia disponible tras clonar. Los resultados esenciales y las fuentes están en este documento. No adjuntar `.env.local` ni configuración de autenticación para reproducirlo.

Comprobaciones locales de esta revisión: 17/17 pruebas existentes aprobadas y TypeScript sin errores. La comprobación de versiones Expo con `EXPO_NO_DOTENV=1`, `EXPO_OFFLINE=1` e `expo install --check` no indicó desajustes; el propio CLI advierte que la validación offline es limitada. ESLint no está configurado: el intento de lint trató de instalarlo automáticamente, se detuvo y se revirtió su cambio en package.json; no completó ninguna instalación. Estas comprobaciones no prueban ausencia de explotación ni compatibilidad de futuras correcciones.

La [documentación de npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/) explica la propagación de metavisos y las propuestas de remediación; el alcance móvil se evaluó además por el código instalado. Consultar este informe antes de cambiar dependencias o preparar una publicación.
