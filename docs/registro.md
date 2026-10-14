# Registro y cuentas

## Alta y datos

- Registro público solo para jugadores, pendiente de aprobación del administrador.
- Datos obligatorios: nombre, apellidos, apodo, fecha de nacimiento, teléfono, serie habitual, posición habitual, correo y contraseña.
- La contraseña debe tener un mínimo de 8 caracteres.
- Foto opcional, pero recomendada, desde el torso hasta la cabeza.
- Los jugadores pueden editar sus datos personales, excepto la serie habitual. Solo administrador y owner pueden cambiarla.
- La creación de cuentas técnicas y asignación de roles se describe en [Roles](roles.md).

## Acceso

- Inicio de sesión con correo y contraseña, con recuperación por correo.
- Confirmación de correo activada. Es independiente de la aprobación del administrador para acceder al club.
- Segundo factor mediante aplicación autenticadora TOTP, obligatorio para administrador y owner desde la primera versión. La recuperación sigue pendiente.

El tratamiento de credenciales y datos debe cumplir [Seguridad](seguridad.md).
