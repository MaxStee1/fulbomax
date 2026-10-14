# Seguridad

Requisitos desde la primera versión. La tecnología elegida está en [Tecnología](tecnologia.md) y los ajustes sin resolver en [Decisiones pendientes](decisiones.md).

## Autenticación y sesiones

- Usar un servicio de autenticación establecido; no diseñar criptografía propia.
- Nunca guardar contraseñas en texto plano, incluirlas en registros ni mostrarlas al administrador.
- Proteger sesiones, comunicaciones y almacenamiento de credenciales en el dispositivo.
- Definir recuperación segura de cuentas y del segundo factor, respetando el acceso confirmado en [Registro y cuentas](registro.md).
- Exigir en el servidor el segundo factor según el rol; habilitar TOTP en el panel no basta para cumplir la obligación de acceso.

### Ajustes actuales de Supabase Auth

- Proveedor Email y cambio seguro de correo activados.
- `Secure password change` activado.
- `Require current password when updating` desactivado por ahora; su revisión está pendiente antes de implementar cambio y recuperación de contraseña.

## Autorización y datos

- Comprobar en el servidor permisos, aprobación de cuenta y acceso a cada recurso. No confiar únicamente en restricciones de la interfaz.
- Definir y probar permisos y políticas por tabla; los ajustes iniciales de Data API y RLS no sustituyen esta comprobación.
- Hacer cumplir las restricciones de gestión de cuentas y transferencia de owner de [Roles](roles.md). El procedimiento seguro de transferencia aún debe definirse.
- Aplicar mínimo privilegio al acceso a datos personales y fotos.
- Mantener secretos fuera de la aplicación cliente y del repositorio; usar ejemplos de configuración sin valores reales.
- Validar entradas y limitar intentos de autenticación y operaciones sensibles.

## Auditoría y verificación

- Registrar acciones sensibles con actor, fecha y cambio, sin exponer secretos.
- Para correcciones de firmas, incluir también el motivo exigido en [Jornadas](jornadas.md).
- Revisar dependencias y realizar pruebas de acceso no autorizado y de las reglas entre series.
