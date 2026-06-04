-- Registros fuera de la secuencia sugerida.
-- Se muestran en historial, pero no avanzan el proximo dia sugerido.

ALTER TABLE workout_logs
  ADD COLUMN IF NOT EXISTS is_extra BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_workout_logs_progression
  ON workout_logs(student_id, routine_id, completed_at DESC)
  WHERE is_extra = FALSE;
