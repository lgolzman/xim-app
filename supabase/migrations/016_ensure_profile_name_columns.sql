-- Compatibilidad para bases que no tienen aplicadas las columnas de nombre
-- usadas por el alta directa de alumnos y las invitaciones.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS invited_name TEXT;

UPDATE profiles
SET full_name = name
WHERE full_name IS NULL
  AND name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles(name);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);
