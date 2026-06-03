-- Alta controlada de alumnos pending desde el panel admin.

CREATE OR REPLACE FUNCTION create_pending_student(
  p_full_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_birth_date DATE DEFAULT NULL,
  p_height_cm DECIMAL DEFAULT NULL,
  p_weight_kg DECIMAL DEFAULT NULL,
  p_goal TEXT DEFAULT NULL
)
RETURNS profiles AS $$
DECLARE
  normalized_name TEXT;
  normalized_email TEXT;
  created_student profiles;
BEGIN
  IF get_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden crear alumnos';
  END IF;

  normalized_name := NULLIF(trim(p_full_name), '');
  normalized_email := NULLIF(lower(trim(COALESCE(p_email, ''))), '');

  IF normalized_name IS NULL THEN
    RAISE EXCEPTION 'Ingresá el nombre del alumno';
  END IF;

  IF p_height_cm IS NOT NULL AND p_height_cm <= 0 THEN
    RAISE EXCEPTION 'La altura debe ser un número mayor a cero';
  END IF;

  IF p_weight_kg IS NOT NULL AND p_weight_kg <= 0 THEN
    RAISE EXCEPTION 'El peso debe ser un número mayor a cero';
  END IF;

  IF normalized_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM profiles WHERE email = normalized_email
  ) THEN
    RAISE EXCEPTION 'Ya existe un alumno o usuario con ese email';
  END IF;

  INSERT INTO profiles (
    id,
    email,
    role,
    full_name,
    name,
    birth_date,
    height_cm,
    weight_kg,
    goal,
    updated_profile_at,
    active,
    account_status,
    created_by_admin
  )
  VALUES (
    gen_random_uuid(),
    normalized_email,
    'consulta',
    normalized_name,
    normalized_name,
    p_birth_date,
    p_height_cm,
    p_weight_kg,
    NULLIF(trim(COALESCE(p_goal, '')), ''),
    NOW(),
    TRUE,
    'pending',
    auth.uid()
  )
  RETURNING * INTO created_student;

  RETURN created_student;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION create_pending_student(TEXT, TEXT, DATE, DECIMAL, DECIMAL, TEXT) TO authenticated;
