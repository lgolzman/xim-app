# Mejoras — XIM App v9

## MEJORA-20: Fotos por ejercicio en la biblioteca

### Contexto
Los ejercicios ya tienen videos de referencia. Se agrega la posibilidad de cargar hasta 3 fotos por ejercicio, que el alumno puede ver cuando consulta un ejercicio durante el entrenamiento, sin necesidad de salir de la app ni ver un video.

### Almacenamiento
Usar **Supabase Storage**. Crear un bucket llamado `exercise-photos` con acceso público de lectura (las fotos son visibles para todos los usuarios autenticados).

### Base de datos
Crear migración `009_exercise_photos.sql`:

```sql
CREATE TABLE exercise_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,  -- path dentro del bucket exercise-photos
  display_order INTEGER NOT NULL DEFAULT 1 CHECK (display_order IN (1, 2, 3)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (exercise_id, display_order)
);

ALTER TABLE exercise_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view exercise photos"
  ON exercise_photos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert exercise photos"
  ON exercise_photos FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update exercise photos"
  ON exercise_photos FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can delete exercise photos"
  ON exercise_photos FOR DELETE
  USING (get_user_role() = 'admin');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_photos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_photos TO service_role;
```

### Carga de fotos (admin)
En el formulario de creación/edición de ejercicio:
- Agregar sección "Fotos de referencia" con hasta 3 slots de carga.
- Cada slot muestra: si no tiene foto, un área de drag & drop o botón "Subir foto". Si tiene foto, mostrar thumbnail con botón para eliminarla.
- Formatos aceptados: JPG, PNG, WebP. Tamaño máximo: 5MB por foto.
- Al subir, guardar en Supabase Storage con path: `exercises/{exercise_id}/{1|2|3}.{ext}` y registrar en `exercise_photos`.
- Al eliminar, borrar de Storage y de la tabla.

### Visualización (alumno y admin)

**Acceso rápido en la vista de ejecución (`WorkoutExecution.tsx`):**
Al lado del nombre de cada ejercicio ya existe un botón "Video" cuando el ejercicio tiene video. De la misma forma, si el ejercicio tiene fotos, agregar un botón **"Fotos"** al mismo nivel que "Video". Al tocarlo, abrir el modal de detalle del ejercicio directamente en la sección de fotos.

**En el modal de detalle del ejercicio** (el que ya existe y se abre al tocar el nombre del ejercicio — MEJORA-12):
- Si el ejercicio tiene fotos, mostrarlas antes que los videos.
- Hasta 3 fotos en una galería simple: foto grande con flechas para navegar entre ellas, o tres thumbnails clickeables que expanden la foto.
- Si no tiene fotos, no mostrar la sección (igual que ahora).

### Hook
Agregar `useExercisePhotos.ts` siguiendo el patrón existente, con funciones `uploadPhoto(exerciseId, file, order)` y `deletePhoto(photoId)`. Actualizar `useExercises.ts` para incluir las fotos en el fetch del ejercicio.

---

## MEJORA-21: Registrar entrenamiento de un alumno desde el perfil de admin

### Contexto
Ximena entrena personalmente a algunos alumnos y quiere poder registrar el entrenamiento mientras lo está ejecutando con ellos, usando la misma interfaz que usa el alumno.

### Flujo
1. En `/admin/students/:studentId`, agregar un botón **"Registrar entrenamiento"** junto a los botones existentes del perfil del alumno.
2. Al tocarlo, navegar a la vista de ejecución del día (`WorkoutExecution`) pero en modo admin-proxy: Ximena ve exactamente la misma interfaz que vería el alumno, con el día sugerido según el historial del alumno.
3. Al completar y guardar, el `workout_log` se crea con `student_id` del alumno (no de Ximena). El registro queda asociado al alumno y aparece en su historial normalmente.
4. Agregar un campo `registered_by UUID REFERENCES profiles(id)` a la tabla `workout_logs` para registrar quién cargó el entrenamiento (puede ser el alumno mismo o la admin). Crear migración `010_workout_log_registered_by.sql`.

### Ruta
Agregar ruta: `/admin/students/:studentId/register-workout`
- Carga `useNextWorkout` con el `studentId` del alumno (no el de la admin).
- Pasa el `studentId` del alumno a `createWorkoutLog`.
- Al completar, redirigir a `/admin/students/:studentId`.

### Vista del historial del alumno
- El entrenamiento registrado por Ximena aparece igual que cualquier otro en el historial.
- Opcionalmente, mostrar un indicador discreto "Registrado por entrenadora" si `registered_by` es distinto de `student_id`. Esto es útil para que el alumno sepa que ese registro lo hizo Ximena.

### Consideraciones de seguridad
- La ruta `/admin/students/:studentId/register-workout` requiere `requireAdmin={true}`.
- El RLS de `workout_logs` ya permite al admin insertar registros para cualquier alumno.
- Verificar que `useNextWorkout` funcione correctamente cuando se le pasa el `studentId` de otro usuario (no el usuario logueado).
