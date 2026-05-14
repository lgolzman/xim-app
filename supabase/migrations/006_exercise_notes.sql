-- =============================================
-- NOTAS POR EJERCICIO EN REGISTROS DE ENTRENAMIENTO
-- =============================================

CREATE TABLE workout_exercise_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id UUID NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
  block_exercise_id UUID NOT NULL REFERENCES block_exercises(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workout_log_id, block_exercise_id)
);

CREATE INDEX idx_workout_exercise_notes_workout_log ON workout_exercise_notes(workout_log_id);
CREATE INDEX idx_workout_exercise_notes_block_exercise ON workout_exercise_notes(block_exercise_id);

ALTER TABLE workout_exercise_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to workout_exercise_notes"
  ON workout_exercise_notes FOR ALL
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Students manage own workout exercise notes"
  ON workout_exercise_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workout_logs wl
      WHERE wl.id = workout_exercise_notes.workout_log_id
        AND wl.student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_logs wl
      WHERE wl.id = workout_exercise_notes.workout_log_id
        AND wl.student_id = auth.uid()
    )
  );
