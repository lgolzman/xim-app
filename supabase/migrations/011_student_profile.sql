-- Ficha completa del alumno

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS height_cm DECIMAL(5,1),
  ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS goal TEXT,
  ADD COLUMN IF NOT EXISTS updated_profile_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_height_cm_positive'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_height_cm_positive
      CHECK (height_cm IS NULL OR height_cm > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_weight_kg_positive'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_weight_kg_positive
      CHECK (weight_kg IS NULL OR weight_kg > 0);
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  note TEXT NOT NULL CHECK (length(trim(note)) > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_notes_student_created_at
  ON student_notes(student_id, created_at DESC);

ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_notes'
      AND policyname = 'Admins full access to student_notes'
  ) THEN
    CREATE POLICY "Admins full access to student_notes"
      ON student_notes FOR ALL
      USING (get_user_role() = 'admin')
      WITH CHECK (get_user_role() = 'admin');
  END IF;
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_notes TO service_role;
