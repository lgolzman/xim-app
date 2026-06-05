# Mejoras — XIM App v16

## MEJORA-32: Filtros avanzados y historial en el selector de ejercicios

### Contexto
Al agregar un ejercicio a una rutina, el modal de selección solo permite buscar por nombre. Ximena necesita poder filtrar por patrón de movimiento, dirección y tipo de cadena — los mismos atributos que ya se cargan en cada ejercicio de la biblioteca. Además, al elegir un ejercicio para un alumno específico, quiere ver la última vez que ese alumno lo ejecutó.

### Filtros a agregar

En el modal de selección de ejercicios (`RoutineForm.tsx`), agregar tres filtros encima del buscador por nombre:

1. **Patrón de movimiento** — selector con los valores de la tabla `movement_patterns` (Dominante de cadera, Dominante de rodilla, Empuje, Tirón, Rotación, Core, etc.)
2. **Dirección** — selector con los valores de la tabla `directions` (Empuje horizontal, Empuje vertical, Tirón horizontal, Tirón vertical)
3. **Tipo de cadena** — selector con opciones: Todas / Abierta / Cerrada

Los tres filtros son opcionales y acumulativos — se pueden combinar entre sí y con la búsqueda por nombre. Un botón "Limpiar filtros" resetea todos a su valor por defecto.

Los selectores de patrón y dirección deben cargarse desde Supabase usando los hooks existentes (`useMovementPatterns`, `useDirections`).

### Historial del alumno por ejercicio

Al mostrar cada ejercicio en la lista del modal, agregar debajo del nombre una línea de contexto con la última vez que ese alumno ejecutó ese ejercicio.

**Qué mostrar:**
```
Sillón de cuádriceps
Última vez: Semana 3 — Mayo 2026
  Prescripto: 3×9 / 70kg
  Registrado: 3×9 / 65kg  (o "Sin registro" si no completó los campos)
```

Si el alumno nunca hizo ese ejercicio, no mostrar nada (la línea de contexto no aparece).

**Datos a obtener:**
- Buscar en `workout_logs` + `logged_sets` + `block_exercises` + `prescribed_sets` el último entrenamiento donde el alumno ejecutó ese `exercise_id`.
- "Último" = el `workout_log` más reciente (por `completed_at`) que contenga ese ejercicio.
- Mostrar la semana y nombre de la rutina de ese log.
- Prescripto: las series de `prescribed_sets` para esa semana y ese `block_exercise_id`.
- Registrado: las series de `logged_sets` para ese `workout_log` y ese `block_exercise_id`. Si todos los campos están vacíos, mostrar "Sin registro".
- Si las series son uniformes, usar formato compacto `3×9 / 70kg`. Si varían, listar serie por serie en una línea separada por comas: `8/70kg, 6/75kg, 8/70kg`.

**Implementación:**
- Esta consulta puede ser costosa si se hace por cada ejercicio individualmente. Hacer una sola query que traiga el último log de cada ejercicio para ese alumno y guardarlo en un mapa `exerciseId → lastExecution` antes de renderizar el listado.
- El `studentId` ya está disponible en `RoutineForm` porque se selecciona el alumno al crear la rutina. Pasarlo al modal de selección de ejercicios.
- Si el alumno no está seleccionado todavía (campo alumno vacío), no mostrar el historial — solo mostrar la lista de ejercicios con los filtros.
