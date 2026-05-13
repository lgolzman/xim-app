-- Add trainer-defined names to invitations and profiles.
-- Keep compatibility with the older profiles.name column if it already exists.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS invited_name TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'name'
  ) THEN
    UPDATE profiles
    SET full_name = name
    WHERE full_name IS NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  SELECT * INTO invitation_record
  FROM invitations
  WHERE email = NEW.email
    AND used = FALSE
    AND (expires_at IS NULL OR expires_at > NOW());

  IF invitation_record IS NOT NULL THEN
    INSERT INTO profiles (id, email, role, full_name)
    VALUES (NEW.id, NEW.email, invitation_record.role, invitation_record.invited_name);

    UPDATE invitations SET used = TRUE WHERE id = invitation_record.id;
  ELSE
    INSERT INTO profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'consulta');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
