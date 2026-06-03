-- Alta directa de alumnos y admins que tambien se entrenan

-- profiles.id deja de depender directamente de auth.users(id) para permitir
-- alumnos pending creados por administracion antes de tener cuenta de acceso.
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS created_by_admin UUID,
  ADD COLUMN IF NOT EXISTS is_student BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_account_status_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_account_status_check
      CHECK (account_status IN ('pending', 'active', 'disabled'));
  END IF;
END;
$$;

UPDATE profiles
SET account_status = CASE
  WHEN active = FALSE THEN 'disabled'
  ELSE 'active'
END
WHERE account_status IS NULL
   OR account_status NOT IN ('pending', 'active', 'disabled');

ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS profile_id UUID;

CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_student ON profiles(is_student) WHERE is_student = TRUE;
CREATE INDEX IF NOT EXISTS idx_invitations_profile_id ON invitations(profile_id);

-- Rehacer FK hacia profiles(id) con ON UPDATE CASCADE para que el cambio del
-- UUID temporal al auth.user.id real conserve rutinas, logs, planes y notas.
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_disabled_by_fkey,
  ADD CONSTRAINT profiles_disabled_by_fkey
  FOREIGN KEY (disabled_by) REFERENCES profiles(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_created_by_admin_fkey,
  ADD CONSTRAINT profiles_created_by_admin_fkey
  FOREIGN KEY (created_by_admin) REFERENCES profiles(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE invitations
  DROP CONSTRAINT IF EXISTS invitations_created_by_fkey,
  ADD CONSTRAINT invitations_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE invitations
  DROP CONSTRAINT IF EXISTS invitations_profile_id_fkey,
  ADD CONSTRAINT invitations_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE routines
  DROP CONSTRAINT IF EXISTS routines_student_id_fkey,
  ADD CONSTRAINT routines_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES profiles(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE routines
  DROP CONSTRAINT IF EXISTS routines_created_by_fkey,
  ADD CONSTRAINT routines_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id)
  ON UPDATE CASCADE;

ALTER TABLE workout_logs
  DROP CONSTRAINT IF EXISTS workout_logs_student_id_fkey,
  ADD CONSTRAINT workout_logs_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES profiles(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE workout_logs
  DROP CONSTRAINT IF EXISTS workout_logs_registered_by_fkey,
  ADD CONSTRAINT workout_logs_registered_by_fkey
  FOREIGN KEY (registered_by) REFERENCES profiles(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE student_notes
  DROP CONSTRAINT IF EXISTS student_notes_student_id_fkey,
  ADD CONSTRAINT student_notes_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES profiles(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE student_notes
  DROP CONSTRAINT IF EXISTS student_notes_created_by_fkey,
  ADD CONSTRAINT student_notes_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id)
  ON UPDATE CASCADE;

ALTER TABLE student_plans
  DROP CONSTRAINT IF EXISTS student_plans_student_id_fkey,
  ADD CONSTRAINT student_plans_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES profiles(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE student_plan_history
  DROP CONSTRAINT IF EXISTS student_plan_history_student_id_fkey,
  ADD CONSTRAINT student_plan_history_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES profiles(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- El trigger de registro vincula invitaciones con profile_id a un perfil
-- pending existente. El UPDATE del id dispara ON UPDATE CASCADE en datos
-- asociados al alumno.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  invitation_record RECORD;
  updated_profile_id UUID;
BEGIN
  SELECT * INTO invitation_record
  FROM invitations
  WHERE email = NEW.email
    AND used = FALSE
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY created_at DESC
  LIMIT 1;

  IF invitation_record IS NOT NULL THEN
    IF invitation_record.profile_id IS NOT NULL THEN
      UPDATE profiles
      SET id = NEW.id,
          email = NEW.email,
          role = invitation_record.role,
          full_name = COALESCE(full_name, invitation_record.invited_name),
          account_status = 'active',
          active = TRUE,
          disabled_by = NULL,
          disabled_at = NULL
      WHERE id = invitation_record.profile_id
      RETURNING id INTO updated_profile_id;

      IF updated_profile_id IS NULL THEN
        INSERT INTO profiles (id, email, role, full_name, account_status, active)
        VALUES (NEW.id, NEW.email, invitation_record.role, invitation_record.invited_name, 'active', TRUE);
      END IF;
    ELSE
      INSERT INTO profiles (id, email, role, full_name, account_status, active)
      VALUES (NEW.id, NEW.email, invitation_record.role, invitation_record.invited_name, 'active', TRUE);
    END IF;

    UPDATE invitations SET used = TRUE WHERE id = invitation_record.id;
  ELSE
    INSERT INTO profiles (id, email, role, account_status, active)
    VALUES (NEW.id, NEW.email, 'consulta', 'active', TRUE);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Admins can insert profiles'
  ) THEN
    CREATE POLICY "Admins can insert profiles"
      ON profiles FOR INSERT
      WITH CHECK (get_user_role() = 'admin');
  END IF;
END;
$$;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO service_role;
