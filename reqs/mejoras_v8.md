# Mejoras — XIM App v8

## MEJORA-18: Notificación por mail cuando un alumno completa un entrenamiento

**Contexto:** Cuando un alumno marca un día como completado, Ximena quiere recibir un mail avisándole, para poder revisar las notas y dar feedback si es necesario.

### Implementación

**Servicio:** Resend (resend.com) — se integra nativamente con Supabase Edge Functions.

**Configuración requerida:**
1. Crear cuenta en Resend y obtener API key.
2. Agregar las siguientes variables de entorno en Supabase (Dashboard → Settings → Edge Functions → Secrets):
   - `RESEND_API_KEY` — API key de Resend
   - `TRAINER_EMAIL` — dirección de mail destino (ej: ximena@gmail.com)
   - `APP_URL` — URL base de la app (ej: https://xim-app.pages.dev)

**Edge Function:**
- Crear `supabase/functions/notify-workout-completed/index.ts`
- Se dispara desde el frontend inmediatamente después de que `createWorkoutLog` retorna exitosamente — no usar trigger de base de datos, llamar la función explícitamente desde `useWorkoutLogs.ts` para tener control sobre errores sin afectar el flujo principal.
- Si el mail falla, loguear el error pero no mostrar error al alumno — el entrenamiento ya quedó guardado y eso es lo importante.

**Contenido del mail:**

```
Asunto: 💪 [Nombre alumno] completó un entrenamiento

[Nombre alumno] acaba de completar el Día [N] — Semana [N] de [Nombre rutina].

Fecha: [fecha y hora]

[Si hay nota general]
📝 Nota del entrenamiento:
"[texto de la nota]"

[Si hay notas por ejercicio]
💬 Notas por ejercicio:
- [Nombre ejercicio]: "[nota]"
- [Nombre ejercicio]: "[nota]"

→ Ver detalle completo: [link a /admin/students/:id]
```

- Si no hay notas de ningún tipo, el mail igual se envía pero sin esa sección.
- El link al detalle debe llevar directamente al entrenamiento recién completado.

**Flujo en `useWorkoutLogs.ts`:**
```typescript
// Después de createWorkoutLog exitoso:
supabase.functions.invoke('notify-workout-completed', {
  body: { workoutLogId: log.id }
}).catch(err => console.error('Error sending notification:', err))
// Sin await — no bloquear el flujo del alumno
```

---

## MEJORA-19: Copiar rutina existente como base para una nueva

**Contexto:** Cuando Ximena va a crear una rutina nueva para un alumno, muchas veces quiere partir de una rutina anterior (del mismo alumno u otro) y hacerle ajustes, en lugar de armar todo desde cero.

**Nota:** Esta mejora estaba documentada como MEJORA-07 en `bugs_y_mejoras_v3.md` pero nunca fue implementada.

### Dónde

`/admin/routines/new` — pantalla de creación de nueva rutina.

### Flujo

1. Al entrar a crear una nueva rutina, antes del formulario vacío, mostrar una opción: **"Empezar desde una rutina existente"** (botón o link secundario).

2. Al tocarlo, abrir un selector con las rutinas disponibles. Mostrar:
   - Nombre de la rutina
   - Alumno al que pertenece
   - Estado (activa / archivada)
   - Cantidad de semanas y días
   - Ordenadas por fecha de creación descendente

3. Al seleccionar una rutina y confirmar, pre-cargar el formulario `RoutineForm` con todos sus datos:
   - Cantidad de semanas
   - Días con sus nombres opcionales
   - Bloques con sus letras
   - Ejercicios con sus posiciones y notas
   - Series de todas las semanas (tipo, cantidad, peso)
   - **El alumno destinatario y el nombre de la rutina quedan en blanco** para que Ximena los complete.

4. Ximena edita lo que necesita y guarda normalmente (como borrador o activando directamente).

### Reglas importantes

- La copia es completamente independiente de la original. Modificar la nueva rutina no afecta la rutina de origen en ningún caso.
- La copia es un deep copy — todos los objetos son nuevos, sin referencias compartidas.
- Solo se copian ejercicios con `active = true` — no copiar ejercicios que fueron eliminados con soft delete.
- Si el formulario ya tiene datos ingresados y el usuario elige "Empezar desde una rutina existente", mostrar confirmación: "¿Querés reemplazar los datos actuales con la rutina seleccionada?"

### Implementación

La copia se hace en el frontend al momento de cargar el formulario — no se crean registros en la base de datos hasta que Ximena guarda. Usar `getRoutineWithDetails` del hook `useRoutines` para traer todos los datos de la rutina origen y mapearlos al formato `FormData` de `RoutineForm`, generando nuevos IDs locales para cada elemento con `generateId()`.
