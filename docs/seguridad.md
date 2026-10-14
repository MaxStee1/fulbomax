# Seguridad

Requisitos desde la primera versión; las decisiones de servicio, segundo factor y recuperación siguen en [Decisiones pendientes](decisiones.md).

## Autenticación y sesiones

- Usar un servicio de autenticación establecido; no diseñar criptografía propia.
- Nunca guardar contraseñas en texto plano, incluirlas en registros ni mostrarlas al administrador.
- Proteger sesiones, comunicaciones y almacenamiento de credenciales en el dispositivo.
- Definir recuperación segura de cuentas y del segundo factor, respetando el acceso confirmado en [Registro y cuentas](registro.md).

## Autorización y datos

- Comprobar en el servidor permisos, aprobación de cuenta y acceso a cada recurso. No confiar únicamente en restricciones de la interfaz.
- Aplicar mínimo privilegio al acceso a datos personales y fotos.
- Mantener secretos fuera de la aplicación cliente y del repositorio; usar ejemplos de configuración sin valores reales.
- Validar entradas y limitar intentos de autenticación y operaciones sensibles.

## Auditoría y verificación

- Registrar acciones sensibles con actor, fecha y cambio, sin exponer secretos.
- Revisar dependencias y realizar pruebas de acceso no autorizado y de las reglas entre series.
