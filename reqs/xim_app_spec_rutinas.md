# Xim_App — Especificación Funcional: Módulo de Rutinas y Seguimiento de Progreso

## 1. Contexto y estado actual

La aplicación ya cuenta con:
- Sistema de autenticación con dos roles: **Administrador** (entrenadora) e **Invitado/Alumno**
- Flujo de invitación por email para incorporar alumnos
- Biblioteca de ejercicios con músculos trabajados, tips de ejecución y videos referenciales

Esta especificación extiende la app con tres módulos nuevos:
1. Gestión de usuarios (habilitar/inhabilitar alumnos)
2. Elaboración y edición de rutinas por parte de la administradora
3. Ejecución y registro de progreso por parte de los alumnos

---

## 2. Modificaciones al módulo de usuarios

### 2.1 Inhabilitar / habilitar alumnos

La administradora debe poder inhabilitar a un alumno invitado desde el panel de gestión de usuarios. Un alumno inhabilitado no puede iniciar sesión ni acceder a la aplicación hasta que la administradora lo vuelva a habilitar.

**Reglas:**
- La inhabilitación es reversible en cualquier momento.
- Si el alumno está en sesión activa al momento de ser inhabilitado, su sesión debe cerrarse (o al menos bloquearse en el próximo request).
- El alumno inhabilitado no recibe notificación automática; la comunicación queda a criterio de la entrenadora.
- La acción debe quedar registrada (quién inhabilitó, cuándo).

**UI — Panel de alumnos (administradora):**
- Listado de alumnos con estado visible: `Activo` / `Inhabilitado`.
- Botón de acción contextual: "Inhabilitar" para activos, "Habilitar" para inhabilitados.
- Confirmación antes de ejecutar la acción.

---

## 3. Módulo de rutinas

### 3.1 Modelo de datos de una rutina

Una rutina pertenece a un único alumno y representa un programa de entrenamiento estructurado en semanas.

```
Rutina
├── alumno (1 alumno, 1 rutina activa a la vez)
├── nombre (ej: "Mayo 2026")
├── cantidad de semanas (normalmente 4)
├── estado: Borrador | Activa | Archivada
└── días (1 a 5 por semana)
    └── Día N (ej: Día 1, Día 2, Día 3)
        └── bloques (A, B, C, D, E...)
            └── ejercicios dentro del bloque (A1, A2, A3 / B1, B2 / etc.)
                └── series por semana
                    └── cada serie: repeticiones o tiempo + peso (opcional)
```

**Puntos clave del modelo:**

- Los **días** se repiten identicamente semana a semana en cuanto a ejercicios. Lo que varía semana a semana es la cantidad de series, repeticiones/tiempo y/o peso de cada ejercicio.
- Un alumno tiene **una única rutina activa** en simultáneo. Puede tener rutinas archivadas (históricas).
- Los ejercicios dentro de un bloque se ejecutan **en superset** (uno tras otro, sin descanso entre ellos). El descanso ocurre al terminar el bloque completo.
- Un bloque puede tener 1, 2 o 3 ejercicios.
- Un ejercicio puede tener **n series**, y cada serie puede ser distinta (diferente cantidad de reps o diferente peso).

### 3.2 Formato de series

Cada serie de un ejercicio especifica:

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| Tipo | `reps` / `tiempo` | Sí | Si la serie se mide en repeticiones o en segundos |
| Cantidad | número entero | Sí | Reps o segundos según el tipo |
| Peso | número decimal | No | En kg. Puede omitirse (ej: dominadas sin lastre) |

**Ejemplos de la planilla real:**
- `3X8 / 85kg` → 3 series de 8 repeticiones con 85 kg
- `10 8 6` (sin peso) → 3 series con reps distintas (10, 8, 6) sin peso
- `3X10"` → 3 series de 10 segundos (tiempo)
- Peso vacío → ejercicio con peso corporal o sin carga externa

### 3.3 Notas de ejercicio

Cada ejercicio puede tener una nota de texto libre adjunta (ej: "Pausa de 3 segundos abajo", "Con barra"). Esta nota la escribe la administradora al crear/editar la rutina y es visible para el alumno durante la ejecución.

### 3.4 Creación de rutinas (administradora)

La administradora crea rutinas desde su panel. El flujo es:

1. Seleccionar el alumno destinatario.
2. Dar nombre a la rutina (ej: "Mayo 2026").
3. Definir cantidad de semanas (default: 4).
4. Definir cantidad de días de entrenamiento distintos (ej: 3 días).
5. Para cada día, agregar bloques (A, B, C...) y dentro de cada bloque, agregar ejercicios (seleccionados desde la biblioteca existente).
6. Para cada ejercicio, definir las series semana por semana.
7. Guardar como **Borrador** o **Activar** directamente.

**Consideraciones de UX:**
- Al cargar los ejercicios por semana, la interfaz debe facilitar que una misma progresión se aplique rápidamente: la estructura de series de la Semana 1 debe poder copiarse como base para las semanas siguientes y editarse encima.
- Debe poder ingresarse el formato "N series iguales" (ej: 3x8 a 85kg) y también series individuales cuando varían (ej: 10/8/6 con pesos distintos).
- La nota de ejercicio es un campo de texto libre por ejercicio (no por serie).
- Los ejercicios se seleccionan desde la biblioteca existente de la app.

### 3.5 Edición de rutinas activas (administradora)

La administradora puede editar una rutina activa en cualquier momento. Los cambios impactan inmediatamente en lo que ve el alumno.

**Qué puede editarse:**
- Agregar, quitar o reordenar ejercicios dentro de un día.
- Modificar series, repeticiones, pesos y tiempos en cualquier semana.
- Modificar notas de ejercicio.
- Agregar o quitar días.
- Agregar o quitar semanas.

**Qué no se modifica:**
- Los registros de progreso ya guardados por el alumno permanecen intactos aunque cambie la rutina. Son datos históricos.

**Estado de la rutina:**
- `Borrador`: solo visible para la administradora, el alumno no la ve.
- `Activa`: visible y accesible para el alumno.
- `Archivada`: solo lectura, no editable, conservada como histórico.

---

## 4. Módulo de ejecución y seguimiento (alumno)

### 4.1 Pantalla de inicio del alumno — "¿Qué entreno hoy?"

Cuando el alumno abre la app, la pantalla principal muestra:

**Resumen contextual:**
- Nombre y semana actual de su rutina activa.
- Último entrenamiento registrado: día de la rutina y fecha real.
- Próximo día sugerido: el día de la rutina que corresponde entrenar ahora.

**Mensaje orientador (ejemplo):**
> "Tu último entrenamiento fue el martes 6 de mayo — hiciste el Día 2.  
> Hoy te toca el **Día 3**."

**Vista comparativa del día sugerido:**

El alumno ve dos columnas lado a lado:

| Última vez que hiciste el Día 3 | El Día 3 de hoy |
|---|---|
| Fecha: 29 de abril | Semana 3 |
| A: Bench Press — 3x8 / **82kg** ✓ | A: Bench Press — 3x8 / 85kg |
| B1: Prensa — 3x8 / 190kg ✓ | B1: Prensa — 3x9 / 190kg |
| ... | ... |

Esto le permite al alumno ver su progreso de un entrenamiento a otro del mismo día de rutina.

**Acción principal:** botón "Empezar entrenamiento" que abre la vista de ejecución del Día 3.

El alumno también puede elegir entrenar un día distinto al sugerido (por si se saltó un día o quiere repetir uno).

### 4.2 Vista de ejecución del día

Muestra la rutina del día seleccionado para la semana actual, organizada por bloques:

```
DÍA 2 — Semana 3
────────────────────────────────
BLOQUE A  [superset]
  A1 · PESO MUERTO
      Serie 1: 8 reps / 145 kg   [___ reps] [___ kg]
      Serie 2: 8 reps / 145 kg   [___ reps] [___ kg]
      Serie 3: 8 reps / 145 kg   [___ reps] [___ kg]
  
  A2 · FONDOS
      📝 "Pausa de 2 segundos abajo"
      Serie 1: 8 reps / 15 kg   [___ reps] [___ kg]
      Serie 2: 8 reps / 15 kg   [___ reps] [___ kg]
      Serie 3: 8 reps / 15 kg   [___ reps] [___ kg]

BLOQUE B
  B1 · HIP THRUST LIVIANO
      ...
────────────────────────────────
[Notas del entrenamiento]  [Marcar como completado]
```

**Comportamiento:**
- Los campos de registro (reps y peso reales) son **opcionales**. Si el alumno no ingresa nada, igual puede marcar el día como completado.
- Los valores de la rutina (los prescritos) se muestran como referencia al lado de cada campo editable.
- Si una serie es de **tiempo**, el campo de registro muestra "segundos" en lugar de "reps".
- Si un ejercicio no tiene peso prescrito, no se muestra el campo de peso (o se muestra opcional).
- Cada ejercicio puede mostrar su video referencial (si existe en la biblioteca) con un botón de acceso rápido.
- El campo de notas del día es un área de texto libre donde el alumno puede escribir cualquier observación (fatiga, dolor, comentarios) para que la entrenadora lo lea.

### 4.3 Registro de un entrenamiento

Al presionar "Marcar como completado":
- Se guarda el registro con: fecha real, semana de la rutina, día de la rutina, y todos los valores ingresados (o vacíos si no se ingresó nada).
- El registro queda asociado a la rutina y al alumno.
- No se puede "desmarcar" directamente; si el alumno cometió un error, la entrenadora puede corregirlo desde su panel.

**Datos guardados por entrenamiento:**

```
Registro de entrenamiento
├── alumno
├── rutina
├── semana (número: 1-4)
├── día de rutina (número: 1, 2, 3...)
├── fecha real
├── nota general del alumno (texto libre)
└── series registradas
    ├── ejercicio (referencia)
    ├── número de serie
    ├── reps realizadas (opcional)
    ├── peso utilizado (opcional)
    └── segundos realizados (si era serie de tiempo, opcional)
```

### 4.4 Historial del alumno (vista del alumno)

El alumno puede consultar su historial de entrenamientos: listado cronológico de días completados, con la posibilidad de abrir cada uno y ver qué registró.

---

## 5. Vista de la administradora — Seguimiento de alumnos

### 5.1 Panel de progreso por alumno

Desde el panel de la administradora, seleccionando un alumno, puede ver:

- **Resumen:** cuántos entrenamientos completados en la semana actual y en las semanas anteriores.
- **Historial detallado:** lista de entrenamientos en orden cronológico.
- Al abrir un entrenamiento, ve **exactamente lo mismo que vio el alumno durante la ejecución**: la rutina prescrita y, al lado, lo que el alumno registró (reps, peso, notas).
- Las notas libres del alumno se destacan visualmente para que sean fáciles de leer.

### 5.2 Notificaciones o indicadores (opcional / fase 2)

- Indicador visual cuando un alumno no ha entrenado en más de N días (configurable).
- Posibilidad de que la administradora deje una nota de respuesta a las notas del alumno (fase 2, no necesario en el alcance inicial).

---

## 6. Reglas de negocio adicionales

| Regla | Detalle |
|---|---|
| Un alumno, una rutina activa | Al activar una nueva rutina para un alumno, la anterior pasa automáticamente a estado `Archivada`. |
| Semana actual | La Semana 1 comienza en la fecha del **primer entrenamiento registrado** por el alumno. No hay fecha de inicio explícita: la rutina arranca cuando el alumno entrena por primera vez. |
| Avance de semana | El avance de semana **no es automático por calendario**. El alumno siempre continúa desde el siguiente día con respecto al último que completó, independientemente del tiempo transcurrido. Si la última sesión fue el Día 2 de la Semana 1 y pasaron dos semanas sin entrenar, el próximo entrenamiento es el Día 3 de la Semana 1. La semana avanza únicamente cuando el alumno completa todos los días de la semana actual. |
| Día sugerido | El sistema sugiere siempre el día inmediatamente siguiente al último completado dentro de la secuencia de la rutina. |
| Edición con historial existente | Si la administradora edita series ya registradas por el alumno, el registro histórico no cambia. Los cambios aplican a entrenamientos futuros. |
| Rutinas en borrador | No son visibles para el alumno hasta que se activen. |
| Alumno inhabilitado | No puede iniciar sesión. Su rutina y su historial se conservan. |

---

## 7. Alcance — Lo que NO está en esta versión

- Plantillas de rutina reutilizables (cada rutina se crea desde cero para cada alumno).
- Notificaciones push o por email al alumno.
- Notas de respuesta de la entrenadora al alumno dentro de la app.
- Métricas o gráficos de progreso (se puede añadir en una fase posterior).
- Múltiples entrenadoras / administradoras.
- Asignación de múltiples rutinas activas simultáneas.

---

## 8. Resumen de entidades nuevas

| Entidad | Descripción |
|---|---|
| `Rutina` | Programa de N semanas asignado a un alumno |
| `DíaDeRutina` | Uno de los días distintos de entrenamiento (Día 1, 2, 3...) |
| `Bloque` | Agrupación de ejercicios dentro de un día (A, B, C...) |
| `EjercicioDeBloque` | Ejercicio concreto dentro de un bloque (A1, A2...), con nota opcional |
| `SerieDeEjercicio` | Prescripción por semana: tipo (reps/tiempo), cantidad, peso |
| `RegistroEntrenamiento` | Sesión real completada por el alumno en una fecha |
| `SerieRegistrada` | Lo que el alumno efectivamente hizo en cada serie |

---

## 9. Referencia: formato de la planilla actual de Ximena

La planilla Excel que usa actualmente Ximena tiene la siguiente estructura, que debe respetarse como referencia del dominio:

- **Hoja = mes** (ej: MAYO, ABRIL, MARZO)
- **Columnas:** Bloque+Ejercicio | Nombre del ejercicio | SER/REP Sem1 | PESO Sem1 | SER/REP Sem2 | PESO Sem2 | ... | Nota
- **Formato SER/REP:** `3X8` (3 series de 8 reps), `10 8 6` (series con reps distintas), `3X10"` (3 series de 10 segundos)
- **Peso vacío:** ejercicio sin carga externa
- **Nota al final de fila:** instrucción técnica o link a video de referencia

Esta planilla es la fuente de verdad del dominio. La app digitaliza y reemplaza este flujo.

---

## 10. Contexto técnico del proyecto

### Stack existente
- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL + Auth)
- **Routing:** React Router DOM 7

### Convenciones del proyecto (respetar estrictamente)
- UI en **español**
- Custom hooks en `src/hooks/` con patrón `{ data, loading, error, refetch, create*, update*, delete* }`
- Componentes UI base en `src/components/ui/` (Button, Input, Select, Modal, etc.)
- Auth context en `src/context/AuthContext.tsx` — usar `useAuth()` para obtener usuario y rol
- Roles: `admin` (entrenadora) y `consulta` (alumnos)
- RLS habilitado en todas las tablas — toda tabla nueva debe tener sus políticas
- Migrations en `supabase/migrations/` — crear archivo `002_routines_schema.sql`

### Modificación a tabla existente: `profiles`

Agregar campo `active` a la tabla `profiles` para soportar inhabilitación de usuarios:

```sql
ALTER TABLE profiles ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN disabled_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN disabled_at TIMESTAMPTZ;
```

Modificar `ProtectedRoute` y el middleware de auth para verificar `active = true` además del rol. Si `active = false`, hacer logout y redirigir a una pantalla de "Tu cuenta está inhabilitada".

---

## 11. Migración SQL — nuevas tablas (`002_routines_schema.sql`)

```sql
-- =============================================
-- RUTINAS
-- =============================================

CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,                          -- ej: "Mayo 2026"
  total_weeks INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Solo puede haber una rutina activa por alumno (enforced en lógica de app y trigger)
CREATE UNIQUE INDEX idx_routines_one_active_per_student
  ON routines (student_id)
  WHERE status = 'active';

-- =============================================
-- DÍAS DE RUTINA
-- =============================================

-- Representa un día distinto de entrenamiento (Día 1, Día 2, etc.)
-- Los días se repiten cada semana; lo que varía por semana son las series.
CREATE TABLE routine_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,                 -- 1, 2, 3, 4, 5
  name TEXT,                                   -- nombre opcional, ej: "Empuje"
  UNIQUE (routine_id, day_number)
);

-- =============================================
-- BLOQUES
-- =============================================

-- Bloque de ejercicios dentro de un día (A, B, C...)
-- Los ejercicios de un bloque se ejecutan en superset.
CREATE TABLE routine_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_day_id UUID NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
  block_letter TEXT NOT NULL,                  -- "A", "B", "C", "D", "E"
  block_order INTEGER NOT NULL,                -- para ordenar los bloques
  UNIQUE (routine_day_id, block_letter)
);

-- =============================================
-- EJERCICIOS DENTRO DE UN BLOQUE
-- =============================================

-- Cada fila = un ejercicio en una posición del bloque (A1, A2, B1, etc.)
CREATE TABLE block_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES routine_blocks(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL,                   -- 1, 2, 3 dentro del bloque
  note TEXT,                                   -- ej: "Pausa de 3 segundos abajo"
  UNIQUE (block_id, position)
);

-- =============================================
-- SERIES PRESCRITAS (por semana)
-- =============================================

-- Cada fila = una serie de un ejercicio en una semana específica.
-- Si el ejercicio tiene 3 series iguales → 3 filas con set_number 1, 2, 3.
CREATE TABLE prescribed_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_exercise_id UUID NOT NULL REFERENCES block_exercises(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,                -- 1, 2, 3, 4
  set_number INTEGER NOT NULL,                 -- número de serie: 1, 2, 3...
  set_type TEXT NOT NULL DEFAULT 'reps'
    CHECK (set_type IN ('reps', 'time')),
  quantity INTEGER NOT NULL,                   -- reps o segundos
  weight_kg DECIMAL(6,2),                      -- NULL = sin peso / peso corporal
  UNIQUE (block_exercise_id, week_number, set_number)
);

-- =============================================
-- REGISTROS DE ENTRENAMIENTO
-- =============================================

-- Una sesión completada por el alumno
CREATE TABLE workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  routine_day_id UUID NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,                -- semana de la rutina (no calendario)
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  student_note TEXT                            -- nota libre del alumno
);

CREATE INDEX idx_workout_logs_student ON workout_logs(student_id);
CREATE INDEX idx_workout_logs_routine ON workout_logs(routine_id);
CREATE INDEX idx_workout_logs_completed ON workout_logs(completed_at DESC);

-- =============================================
-- SERIES REGISTRADAS
-- =============================================

-- Lo que el alumno efectivamente hizo en cada serie
CREATE TABLE logged_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id UUID NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
  block_exercise_id UUID NOT NULL REFERENCES block_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  actual_reps INTEGER,                         -- NULL si no registró
  actual_weight_kg DECIMAL(6,2),               -- NULL si no registró
  actual_seconds INTEGER,                      -- NULL si no registró (solo para tipo 'time')
  UNIQUE (workout_log_id, block_exercise_id, set_number)
);

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-actualizar updated_at en rutinas
CREATE TRIGGER update_routines_updated_at
  BEFORE UPDATE ON routines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Al activar una rutina, archivar automáticamente la anterior del mismo alumno
CREATE OR REPLACE FUNCTION archive_previous_active_routine()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE routines
    SET status = 'archived', updated_at = NOW()
    WHERE student_id = NEW.student_id
      AND status = 'active'
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_routine_activated
  BEFORE UPDATE ON routines
  FOR EACH ROW
  WHEN (NEW.status = 'active' AND OLD.status != 'active')
  EXECUTE FUNCTION archive_previous_active_routine();

-- =============================================
-- ÍNDICES ADICIONALES
-- =============================================

CREATE INDEX idx_routine_days_routine ON routine_days(routine_id);
CREATE INDEX idx_routine_blocks_day ON routine_blocks(routine_day_id);
CREATE INDEX idx_block_exercises_block ON block_exercises(block_id);
CREATE INDEX idx_prescribed_sets_block_exercise ON prescribed_sets(block_exercise_id);
CREATE INDEX idx_logged_sets_workout_log ON logged_sets(workout_log_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescribed_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE logged_sets ENABLE ROW LEVEL SECURITY;

-- ROUTINES
-- Admin: acceso total
CREATE POLICY "Admins full access to routines"
  ON routines FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Alumno: solo ve su propia rutina activa (no borradores)
CREATE POLICY "Students view own active routine"
  ON routines FOR SELECT
  USING (
    auth.uid() = student_id
    AND status IN ('active', 'archived')
    AND get_user_role() = 'consulta'
  );

-- ROUTINE_DAYS, ROUTINE_BLOCKS, BLOCK_EXERCISES, PRESCRIBED_SETS
-- Misma lógica: admin todo, alumno solo lee lo de su rutina activa
CREATE POLICY "Admins full access to routine_days"
  ON routine_days FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Students view days of own routines"
  ON routine_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM routines r
      WHERE r.id = routine_days.routine_id
        AND r.student_id = auth.uid()
        AND r.status IN ('active', 'archived')
    )
  );

CREATE POLICY "Admins full access to routine_blocks"
  ON routine_blocks FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Students view blocks of own routines"
  ON routine_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM routine_days rd
      JOIN routines r ON r.id = rd.routine_id
      WHERE rd.id = routine_blocks.routine_day_id
        AND r.student_id = auth.uid()
        AND r.status IN ('active', 'archived')
    )
  );

CREATE POLICY "Admins full access to block_exercises"
  ON block_exercises FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Students view block exercises of own routines"
  ON block_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM routine_blocks rb
      JOIN routine_days rd ON rd.id = rb.routine_day_id
      JOIN routines r ON r.id = rd.routine_id
      WHERE rb.id = block_exercises.block_id
        AND r.student_id = auth.uid()
        AND r.status IN ('active', 'archived')
    )
  );

CREATE POLICY "Admins full access to prescribed_sets"
  ON prescribed_sets FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Students view prescribed sets of own routines"
  ON prescribed_sets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM block_exercises be
      JOIN routine_blocks rb ON rb.id = be.block_id
      JOIN routine_days rd ON rd.id = rb.routine_day_id
      JOIN routines r ON r.id = rd.routine_id
      WHERE be.id = prescribed_sets.block_exercise_id
        AND r.student_id = auth.uid()
        AND r.status IN ('active', 'archived')
    )
  );

-- WORKOUT_LOGS
-- Admin: acceso total (para leer el progreso de cualquier alumno)
CREATE POLICY "Admins full access to workout_logs"
  ON workout_logs FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

-- Alumno: solo sus propios registros, puede insertar y leer
CREATE POLICY "Students manage own workout logs"
  ON workout_logs FOR ALL
  USING (auth.uid() = student_id AND get_user_role() = 'consulta')
  WITH CHECK (auth.uid() = student_id AND get_user_role() = 'consulta');

-- LOGGED_SETS
CREATE POLICY "Admins full access to logged_sets"
  ON logged_sets FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Students manage own logged sets"
  ON logged_sets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workout_logs wl
      WHERE wl.id = logged_sets.workout_log_id
        AND wl.student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_logs wl
      WHERE wl.id = logged_sets.workout_log_id
        AND wl.student_id = auth.uid()
    )
  );
```

---

## 12. Nuevas rutas a implementar

### Rutas del administrador (`requireAdmin={true}`)
```
/admin/students              — listado de alumnos con estado activo/inhabilitado
/admin/students/:id          — perfil del alumno + su rutina + historial de progreso
/admin/routines/new          — crear nueva rutina (seleccionar alumno primero)
/admin/routines/:id/edit     — editar rutina existente
```

### Rutas del alumno (solo rol `consulta`)
```
/                            — pantalla de inicio: "¿Qué entreno hoy?"
/workout/:dayId              — vista de ejecución del día
/history                     — historial de entrenamientos completados
/history/:workoutLogId       — detalle de un entrenamiento pasado
```

---

## 13. Nuevos hooks a crear

Siguiendo el patrón existente `{ data, loading, error, refetch, create*, update*, delete* }`:

```
src/hooks/
  useStudents.ts          — listado de alumnos con su estado active/inactive
  useRoutines.ts          — CRUD de rutinas (para admin)
  useActiveRoutine.ts     — rutina activa del alumno logueado (para consulta)
  useWorkoutLogs.ts       — registros de entrenamiento (lectura y escritura)
  useNextWorkout.ts       — lógica de "qué entreno hoy": calcula día sugerido,
                            semana actual, y trae el último registro del mismo día
```

### Lógica central de `useNextWorkout`

Este hook encapsula la regla de negocio más compleja:

1. Obtener el último `workout_log` del alumno (ordenado por `completed_at DESC`).
2. Determinar la semana actual: contar cuántos días distintos se completaron desde el primer log, agrupados en ciclos del total de días de la rutina.
3. El día sugerido = el día siguiente al último completado en la secuencia (si el último fue el Día 3 de una rutina de 3 días → el siguiente es el Día 1 de la semana siguiente).
4. Buscar el último `workout_log` para ese mismo `routine_day_id` (para mostrar la columna comparativa).

> **Nota para Claude Code:** esta lógica debe calcularse en el frontend a partir de los datos de Supabase, no como función SQL, para facilitar el testing y la evolución.
