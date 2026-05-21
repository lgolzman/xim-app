-- Plan comercial del alumno

CREATE TABLE IF NOT EXISTS student_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_description TEXT NOT NULL CHECK (length(trim(plan_description)) > 0),
  current_price DECIMAL(10,2) NOT NULL CHECK (current_price >= 0),
  currency TEXT NOT NULL DEFAULT 'ARS' CHECK (length(trim(currency)) > 0),
  increase_frequency_months INTEGER CHECK (
    increase_frequency_months IS NULL
    OR increase_frequency_months IN (1, 2, 3, 4, 6)
  ),
  next_increase_date DATE,
  reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (student_id)
);

CREATE TABLE IF NOT EXISTS student_plan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_description TEXT NOT NULL CHECK (length(trim(plan_description)) > 0),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'ARS' CHECK (length(trim(currency)) > 0),
  valid_from DATE NOT NULL,
  valid_to DATE CHECK (valid_to IS NULL OR valid_to >= valid_from),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_plans_next_increase_date
  ON student_plans(next_increase_date)
  WHERE next_increase_date IS NOT NULL
    AND reminder_sent = FALSE;

CREATE INDEX IF NOT EXISTS idx_student_plan_history_student_valid_from
  ON student_plan_history(student_id, valid_from DESC);

DROP TRIGGER IF EXISTS update_student_plans_updated_at ON student_plans;
CREATE TRIGGER update_student_plans_updated_at
  BEFORE UPDATE ON student_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE student_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_plan_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_plans'
      AND policyname = 'Admins full access to student_plans'
  ) THEN
    CREATE POLICY "Admins full access to student_plans"
      ON student_plans FOR ALL
      USING (get_user_role() = 'admin')
      WITH CHECK (get_user_role() = 'admin');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'student_plan_history'
      AND policyname = 'Admins full access to student_plan_history'
  ) THEN
    CREATE POLICY "Admins full access to student_plan_history"
      ON student_plan_history FOR ALL
      USING (get_user_role() = 'admin')
      WITH CHECK (get_user_role() = 'admin');
  END IF;
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_plans TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_plan_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_plan_history TO service_role;
