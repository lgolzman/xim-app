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

-- =============================================
-- MODIFICACIÓN TABLA PROFILES (inhabilitación)
-- =============================================

ALTER TABLE profiles ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN disabled_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN disabled_at TIMESTAMPTZ;
