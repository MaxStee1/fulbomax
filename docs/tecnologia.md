# Tecnología

## Decisión confirmada

- App móvil con React Native, Expo y TypeScript.
- Android y iPhone; priorizar Android si el lanzamiento se hace por etapas.
- Supabase para autenticación, base de datos y almacenamiento.

## Proyecto Supabase

- Proyecto creado: `fulbomax`, región São Paulo (`sa-east-1`).
- Ajustes al crearlo: Data API activada, exposición automática de tablas desactivada y RLS automático activado.
- Son ajustes iniciales; los requisitos de autorización se definen en [Seguridad](seguridad.md) y la configuración pendiente en [Decisiones pendientes](decisiones.md).

## Comprobación del entorno — 13 de octubre de 2026

- [Expo requiere Node LTS](https://docs.expo.dev/get-started/create-a-project/). Su [tabla de compatibilidad](https://docs.expo.dev/versions/latest/) indica Node mínimo 22.13.x para SDK 57: Node v22.17.1 cumple ese mínimo y se confirmó localmente.
- [npm 11.4.2](https://github.com/npm/cli/blob/v11.4.2/package.json) requiere Node `^20.17.0 || >=22.9.0`: v22.17.1 cumple. Expo admite npm, pero no publica en estas páginas una garantía específica para esa versión.
- En este entorno, `npm --version` falla en PowerShell al buscar un `npm-cli.js` inexistente en el prefijo del usuario. `C:\Program Files\nodejs\npm.cmd --version` devuelve 10.9.2. No se pudo confirmar npm 11.4.2 instalado y operativo; revisar esta diferencia antes de crear la app.
- Comprobación documental y de versiones, sin instalar ni ejecutar una app. La versión concreta del SDK y la plantilla deben verificarse al iniciar la implementación.

## Estructura actual

```text
fulbomax/
├── AGENTS.md       # instrucciones existentes
├── docs/           # contexto existente
└── mobile/         # proyecto Expo
    ├── src/        # pantallas en app/ y componentes compartidos
    ├── assets/     # recursos
    ├── package.json
    ├── app.json
    └── tsconfig.json
```

El proyecto existente usa Expo SDK 57 y Expo Router. Conservar `AGENTS.md` y `docs/` en la raíz; no regenerar ni sobrescribir el proyecto para integrar los servicios.
