# Mejoras — XIM App v10

## MEJORA-22: Navegación entre semanas en modo consulta durante el entrenamiento

**Dónde:** `WorkoutExecution.tsx` — tarjeta de cada ejercicio.

### Contexto
Cuando el alumno está registrando un entrenamiento, solo puede ver las series de la semana actual. Esta mejora le permite consultar otras semanas (especialmente la anterior) como referencia, sin poder editarlas.

### Comportamiento

Agregar tabs de semana dentro de cada ejercicio, igual al patrón visual que ya existe en el formulario de rutina (`RoutineForm`): `Sem 1 | Sem 2 | Sem 3 | Sem 4`.

**Semana actual (tab activo por defecto):**
- Se muestra igual que ahora: series con los valores prescritos a la izquierda y los campos de registro editables a la derecha.
- La referencia del entrenamiento anterior (MEJORA-14) sigue visible en esta semana.

**Otras semanas (modo consulta, solo lectura):**
- Al tocar un tab de otra semana, mostrar las series prescritas para esa semana en modo lectura — sin campos de input editables.
- Si el alumno tiene registros de esa semana (ya la entrenó), mostrar también lo que registró, igual que en la vista de historial: prescrito vs. registrado.
- Si no tiene registros de esa semana todavía, mostrar solo los valores prescritos.
- Un indicador visual claro de que está en modo consulta: texto "Solo lectura" o fondo levemente distinto, para que el alumno no se confunda pensando que puede editar.

**Regla principal:** Los campos de registro solo están disponibles en el tab de la semana actual. Nunca en semanas pasadas ni futuras.

### Datos necesarios
- Las series prescritas de todas las semanas ya vienen en `useActiveRoutine`.
- Los registros de semanas anteriores están en `useWorkoutLogs` — cruzar por `week_number`, `routine_day_id` y `block_exercise_id` para mostrar lo que el alumno registró en cada semana.

### UX en mobile
Los tabs deben ser compactos — "Sem 1", "Sem 2", etc. — igual que en el formulario de rutina. Si la rutina tiene muchas semanas (5-6), deben poder scrollearse horizontalmente sin romper el layout.
