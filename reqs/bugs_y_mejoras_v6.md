# Bugs — XIM App v6

## BUG-11: Editar una rutina activa borra el historial de entrenamientos del alumno

**Dónde:** `RoutineEdit.tsx` y `useRoutines.ts` — flujo de edición de rutina activa.

**Qué pasa:** Cuando Ximena edita una rutina que ya está activa y presiona "Guardar y activar", los entrenamientos que el alumno ya registró se pierden. Al volver a entrar, la app le ofrece empezar desde el Día 1 como si nunca hubiera entrenado.

**Causa probable:** Al guardar los cambios, el código está ejecutando el mismo flujo que al activar una rutina nueva — probablemente borrando y recreando los registros de la rutina, o cambiando el `routine_id` de forma que los `workout_logs` existentes quedan huérfanos o asociados a una rutina archivada.

**Qué debe pasar:** Editar una rutina activa debe modificar los datos existentes (UPDATE) sin tocar los `workout_logs` ni los `logged_sets` asociados. Los registros históricos del alumno son intocables.

**Fix requerido:**

1. En `useRoutines.ts`, la función de actualización de rutina debe hacer UPDATE sobre las tablas existentes (`routines`, `routine_days`, `routine_blocks`, `block_exercises`, `prescribed_sets`), nunca DELETE + INSERT de la rutina completa. Si se agregan o quitan ejercicios/bloques/días, operar quirúrgicamente sobre los registros afectados.

2. En `RoutineEdit.tsx`, cuando la rutina ya está en estado `active`, el botón debe decir **"Guardar cambios"** en lugar de "Guardar y activar". Al presionarlo, solo guardar los cambios sin modificar el estado de la rutina ni disparar el trigger de archivo.

3. El botón "Guardar como borrador" tampoco debe aparecer cuando la rutina ya está activa — no tiene sentido volver una rutina activa a borrador desde la edición.

4. El flujo "Guardar y activar" solo debe ejecutarse cuando la rutina está en estado `draft`. En ese caso sí corresponde cambiar el estado a `active` (y el trigger archiva la anterior automáticamente).

**Resumen de botones según estado de la rutina:**
- Rutina en `draft`: botones "Guardar como borrador" y "Guardar y activar"
- Rutina en `active`: botón "Guardar cambios" únicamente
- Rutina en `archived`: solo lectura, sin botones de guardado

---

## MEJORA-15: Bloques colapsables durante el entrenamiento

**Dónde:** `WorkoutExecution.tsx`

**Contexto:** Al entrar a registrar un entrenamiento, se muestran todos los bloques expandidos de una vez. En mobile esto implica mucho scroll y el alumno pierde el hilo de por dónde va.

**Qué hacer:**

- Al entrar al día, mostrar solo el **Bloque A expandido** y el resto colapsados.
- Cada bloque tiene un header ("Bloque A", "Bloque B superset", etc.). Ese header muestra un botón "✓ Terminé este bloque" cuando el bloque está expandido.
- Cuando el alumno toca "Terminé este bloque", el bloque se colapsa y el siguiente se expande automáticamente.
- El alumno puede expandir y colapsar cualquier bloque manualmente en cualquier momento — el comportamiento automático es solo una guía, no un bloqueo.
- Cuando un bloque está colapsado y ya fue marcado como terminado, mostrar un indicador visual (checkmark o color distinto en el header) para que el alumno sepa que ya lo completó.
- El botón **"Marcar como completado"** del día se mantiene igual al final — marca todo el entrenamiento como completado independientemente del estado de los bloques individuales.

**Estado inicial al entrar:**
- Bloque A: expandido
- Resto de bloques: colapsados
- Ningún bloque marcado como terminado
