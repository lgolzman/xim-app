# Backlog — XIM App (próximo ciclo)

Funcionalidades documentadas para implementar en una iteración futura, una vez que la app esté estable y en uso regular con todos los alumnos.

---

## FUTURO-01: Reportes para la entrenadora

**Dónde:** Panel de administración — nueva sección "Reportes".

**Contexto:** Ximena necesita saber de un vistazo qué alumnos se están entrenando, con qué frecuencia, y si están siguiendo la rutina como fue planificada o haciendo modificaciones.

### Reporte 1: Actividad de alumnos

Mostrar, para un rango de días configurable (últimos 7, 14, 30 días), qué alumnos entrenaron y cuántas veces. Una tabla simple:

| Alumno | Últimos 7 días | Últimos 14 días | Último entrenamiento |
|--------|---------------|-----------------|----------------------|
| Lucía  | 3 sesiones    | 6 sesiones      | hace 2 días          |
| Martín | 0 sesiones    | 1 sesión        | hace 11 días         |

Destacar visualmente los alumnos que no entrenaron en los últimos N días (configurable, default 7).

### Reporte 2: Alumnos con modificaciones o comentarios

Listar los entrenamientos recientes donde el alumno:
- Registró pesos o reps distintos a los planificados, o
- Escribió una nota (general o por ejercicio)

Formato: lista cronológica inversa con alumno, día de rutina, fecha, y un resumen de qué modificó o qué escribió. Al tocar cada ítem, ver el detalle completo del entrenamiento.

**Implementación:** Ambos reportes son queries sobre `workout_logs`, `logged_sets` y `workout_exercise_notes` con filtros de fecha. No requieren infraestructura nueva.

---

## FUTURO-02: Notificación a Ximena cuando un alumno completa un entrenamiento

**Contexto:** Ximena quiere saber cuando un alumno termina de entrenar, para poder revisar las notas y dar feedback rápido si es necesario.

**Opciones de implementación (de menor a mayor complejidad):**

### Opción A: Email (más simple)
Al guardar un `workout_log`, disparar un email a Ximena con:
- Nombre del alumno
- Día de rutina completado
- Semana
- Si escribió notas (sin mostrar el contenido, solo indicar que hay notas)
- Link directo al detalle del entrenamiento en la app

Implementación: Supabase Edge Function que se dispara con un trigger `AFTER INSERT ON workout_logs` y envía el email via Resend o SendGrid.

### Opción B: Telegram (recomendada)
Misma lógica que el email pero envía un mensaje a un bot de Telegram configurado por Ximena. Más inmediato que el email y no se pierde entre otros correos.

Mensaje ejemplo:
```
💪 Lucía acaba de entrenar
Día 2 — Semana 3 (Mayo 2026)
📝 Dejó notas en 2 ejercicios
→ Ver detalle: [link]
```

Implementación: Supabase Edge Function + Telegram Bot API. El bot y el chat ID se configuran como variables de entorno en Supabase.

### Opción C: WhatsApp
Similar a Telegram pero via Twilio o WhatsApp Business API. Más complejo de configurar y tiene costos por mensaje.

**Recomendación:** Arrancar con Opción A (email) por simplicidad, y migrar a Telegram (Opción B) si Ximena prefiere la inmediatez. Ximena ya tiene experiencia con bots de Telegram (timbre del departamento), así que la Opción B puede ser natural para ella.

---

## FUTURO-03: Indicador rápido en el panel de la entrenadora

**Contexto:** Una alternativa simple a las notificaciones proactivas, sin infraestructura extra.

**Qué hacer:** Al entrar al panel de administración, mostrar un resumen visible:
- "X alumnos entrenaron hoy"
- "X alumnos entrenaron esta semana"
- Badge con cantidad de entrenamientos con notas no revisadas (si se implementa un sistema de "marcar como revisado")

Es un cambio simple sobre datos que ya existen y le da a Ximena el contexto de un vistazo sin necesidad de notificaciones externas.
