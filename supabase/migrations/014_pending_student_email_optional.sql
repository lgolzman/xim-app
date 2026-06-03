-- Permitir alumnos pending sin email. El email se requiere recien al generar
-- una invitacion o cuando el usuario crea su cuenta en auth.

ALTER TABLE profiles
  ALTER COLUMN email DROP NOT NULL;
