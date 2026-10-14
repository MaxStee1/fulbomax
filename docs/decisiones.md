# Decisiones pendientes

Las tecnologías confirmadas están en [Tecnología](tecnologia.md).

- Identificación de jornadas y relación con los partidos de cada serie.
- Modelo de partidos para registrar goles y tarjetas.
- Qué comprende «otros datos» editables por administradores.
- Qué datos personales puede consultar cada rol y de qué jugadores.
- Si se permiten otras combinaciones de roles además de jugador y rol técnico.
- Procedimiento seguro de transferencia de owner, aceptación del destinatario y rol que conserva el propietario anterior.
- Alcance de registro de firmas por serie para los roles autorizados.
- Cómo registrar la disposición, solicitar y registrar aprobaciones, y gestionar su revocación.
- Tratamiento de cambios de convocatoria después de registrar una firma y procedimiento de corrección, respetando las restricciones de jornada y los permisos confirmados.
- Recuperación segura de cuentas y del segundo factor.

## Configuración de Supabase pendiente

- Definir y probar los permisos y políticas por tabla conforme a [Seguridad](seguridad.md).
- Revisar `Require current password when updating` al implementar cambio y recuperación de contraseña.
- Protección de contraseñas filtradas: pendiente porque requiere plan Pro.
- Revisar el alcance de `Limit duration of AAL1 sessions` antes de conectar usuarios.
- Configurar el servicio de envío de correos y los enlaces de confirmación y recuperación.

Estas decisiones requieren confirmación antes de implementarse. Las reglas ya confirmadas están enlazadas en el [índice](README.md).
