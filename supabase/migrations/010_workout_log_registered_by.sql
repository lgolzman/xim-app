ALTER TABLE workout_logs
  ADD COLUMN registered_by UUID REFERENCES profiles(id);

UPDATE workout_logs
SET registered_by = student_id
WHERE registered_by IS NULL;

ALTER TABLE workout_logs
  ALTER COLUMN registered_by SET DEFAULT auth.uid();
