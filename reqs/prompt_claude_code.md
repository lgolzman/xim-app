# Prompt para Claude Code — Módulo de Rutinas y Seguimiento

Vamos a extender XIM App con un módulo nuevo de rutinas de entrenamiento y seguimiento de progreso. Toda la especificación funcional y técnica está en el archivo `xim_app_spec_rutinas.md`. Leelo completo antes de empezar.

Trabajá en fases, en el orden indicado, y esperá mi confirmación antes de pasar a la siguiente.

---

## FASE 1 — Base de datos

1. Leé la sección 10 del spec (contexto técnico) y la sección 11 (migración SQL).
2. Creá el archivo `supabase/migrations/002_routines_schema.sql` con exactamente el contenido de la sección 11.
3. Adicionalmente, escribí al final del mismo archivo el ALTER TABLE de la sección 10 para agregar las columnas `active`, `disabled_by` y `disabled_at` a la tabla `profiles`.
4. Mostrámelo completo para revisión. **No toques ningún archivo TypeScript todavía.**

Cuando yo confirme que la migración está bien, pasamos a la Fase 2.

---

## FASE 2 — Hooks

1. Leé la sección 13 del spec (nuevos hooks).
2. Creá los siguientes hooks en `src/hooks/`, respetando el patrón existente `{ data, loading, error, refetch, create*, update*, delete* }`:
   - `useStudents.ts`
   - `useRoutines.ts`
   - `useActiveRoutine.ts`
   - `useWorkoutLogs.ts`
   - `useNextWorkout.ts`
3. Para `useNextWorkout`, implementá la lógica de cálculo descripta en la sección 13 del spec. Esta lógica va en el frontend, no como función SQL.
4. Mostrámelos uno por uno para revisión antes de continuar.

Cuando yo confirme los hooks, pasamos a la Fase 3.

---

## FASE 3 — Modificación de usuarios (inhabilitación)

1. Leé la sección 2 del spec.
2. Modificá `src/context/AuthContext.tsx` para que, después de autenticar al usuario, verifique que `profiles.active = true`. Si es `false`, cerrá la sesión y redirigí a una pantalla de cuenta inhabilitada.
3. Creá la pantalla `/account-disabled` con un mensaje claro en español: la cuenta está inhabilitada, que contacte a su entrenadora.
4. En el panel de administración (donde se listan los usuarios/invitaciones), agregá la funcionalidad de habilitar/inhabilitar alumnos descripta en la sección 2.1 del spec.

Cuando yo confirme, pasamos a la Fase 4.

---

## FASE 4 — Panel de administración de rutinas

1. Leé las secciones 3 y 12 del spec.
2. Implementá las rutas y pantallas del administrador:
   - `/admin/routines/new` — crear rutina nueva
   - `/admin/routines/:id/edit` — editar rutina existente
3. La pantalla de creación/edición debe permitir:
   - Seleccionar alumno, nombre de la rutina, cantidad de semanas y días
   - Agregar bloques (A, B, C...) y ejercicios dentro de cada bloque (seleccionados desde la biblioteca existente usando los hooks de ejercicios ya disponibles)
   - Para cada ejercicio, cargar las series semana por semana (tipo reps/tiempo, cantidad, peso opcional)
   - Agregar nota por ejercicio
   - Guardar como borrador o activar directamente
4. Integrá el acceso a estas pantallas desde el panel de alumnos en `/admin/students/:id`.

Cuando yo confirme, pasamos a la Fase 5.

---

## FASE 5 — Vista del alumno

1. Leé las secciones 4 y 12 del spec.
2. Implementá las rutas y pantallas del alumno:
   - `/` — pantalla de inicio "¿Qué entreno hoy?" usando `useNextWorkout`
   - `/workout/:dayId` — vista de ejecución del día
   - `/history` — historial de entrenamientos
   - `/history/:workoutLogId` — detalle de un entrenamiento pasado
3. La pantalla de inicio debe mostrar:
   - El último entrenamiento registrado (día y fecha)
   - El día sugerido para hoy
   - La vista comparativa de dos columnas (última vez que hiciste ese día vs. lo que toca hoy), tal como se describe en la sección 4.1
4. La vista de ejecución debe mostrar los bloques, ejercicios y series con los campos opcionales de registro, la nota del ejercicio si existe, y el botón de acceso al video referencial si existe. Al final, campo de nota libre y botón "Marcar como completado".

Cuando yo confirme, pasamos a la Fase 6.

---

## FASE 6 — Vista de progreso del alumno (administradora)

1. Leé la sección 5 del spec.
2. En la pantalla `/admin/students/:id`, agregá una sección de historial de progreso del alumno:
   - Lista de entrenamientos completados en orden cronológico inverso
   - Al expandir cada entrenamiento, mostrar la vista prescrito vs. registrado (igual que ve el alumno, pero en modo lectura)
   - Las notas del alumno destacadas visualmente

---

## Reglas generales para todas las fases

- UI siempre en **español**
- Seguí las convenciones del proyecto: hooks en `src/hooks/`, componentes UI en `src/components/ui/`, patrón de datos existente
- RLS ya está definida en la migración SQL — no agregues lógica de seguridad extra en el frontend más allá de lo que ya hace `ProtectedRoute`
- Si encontrás alguna ambigüedad en el spec, preguntame antes de implementar
- No modifiques tablas ni lógica existente salvo lo indicado explícitamente en el spec
