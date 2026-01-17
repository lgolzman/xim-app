-- =============================================
-- XIM App - Schema de Base de Datos
-- =============================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- TABLAS
-- =============================================

-- Tabla de perfiles (extiende auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'consulta')) DEFAULT 'consulta',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de invitaciones
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'consulta')) DEFAULT 'consulta',
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  used BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Patrones de movimiento
CREATE TABLE movement_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Músculos
CREATE TABLE muscles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Direcciones
CREATE TABLE directions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);

-- Ejercicios
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  movement_pattern_id UUID REFERENCES movement_patterns(id) ON DELETE SET NULL,
  direction_id UUID REFERENCES directions(id) ON DELETE SET NULL,
  chain_type TEXT CHECK (chain_type IN ('abierta', 'cerrada')),
  execution_tips TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Músculos principales por ejercicio (N:N)
CREATE TABLE exercise_primary_muscles (
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  muscle_id UUID REFERENCES muscles(id) ON DELETE CASCADE,
  PRIMARY KEY (exercise_id, muscle_id)
);

-- Músculos sinergistas por ejercicio (N:N)
CREATE TABLE exercise_synergist_muscles (
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  muscle_id UUID REFERENCES muscles(id) ON DELETE CASCADE,
  PRIMARY KEY (exercise_id, muscle_id)
);

-- Videos de referencia
CREATE TABLE exercise_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ÍNDICES
-- =============================================

CREATE INDEX idx_exercises_movement_pattern ON exercises(movement_pattern_id);
CREATE INDEX idx_exercises_direction ON exercises(direction_id);
CREATE INDEX idx_exercises_name ON exercises(name);
CREATE INDEX idx_exercise_videos_exercise ON exercise_videos(exercise_id);

-- =============================================
-- FUNCIONES
-- =============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para exercises
CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Buscar invitación válida
  SELECT * INTO invitation_record
  FROM invitations
  WHERE email = NEW.email
    AND used = FALSE
    AND (expires_at IS NULL OR expires_at > NOW());

  IF invitation_record IS NOT NULL THEN
    -- Crear perfil con rol de la invitación
    INSERT INTO profiles (id, email, role)
    VALUES (NEW.id, NEW.email, invitation_record.role);

    -- Marcar invitación como usada
    UPDATE invitations SET used = TRUE WHERE id = invitation_record.id;
  ELSE
    -- Si no hay invitación, crear con rol de consulta
    INSERT INTO profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'consulta');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil al registrar usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Función helper para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM profiles WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE movement_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE muscles ENABLE ROW LEVEL SECURITY;
ALTER TABLE directions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_primary_muscles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_synergist_muscles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_videos ENABLE ROW LEVEL SECURITY;

-- Políticas para PROFILES
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view all profiles if authenticated"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Políticas para INVITATIONS
CREATE POLICY "Anyone can view invitation by token for registration"
  ON invitations FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update invitations"
  ON invitations FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can delete invitations"
  ON invitations FOR DELETE
  USING (get_user_role() = 'admin');

-- Políticas para MOVEMENT_PATTERNS
CREATE POLICY "Authenticated users can view movement patterns"
  ON movement_patterns FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert movement patterns"
  ON movement_patterns FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update movement patterns"
  ON movement_patterns FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can delete movement patterns"
  ON movement_patterns FOR DELETE
  USING (get_user_role() = 'admin');

-- Políticas para MUSCLES
CREATE POLICY "Authenticated users can view muscles"
  ON muscles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert muscles"
  ON muscles FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update muscles"
  ON muscles FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can delete muscles"
  ON muscles FOR DELETE
  USING (get_user_role() = 'admin');

-- Políticas para DIRECTIONS
CREATE POLICY "Authenticated users can view directions"
  ON directions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert directions"
  ON directions FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update directions"
  ON directions FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can delete directions"
  ON directions FOR DELETE
  USING (get_user_role() = 'admin');

-- Políticas para EXERCISES
CREATE POLICY "Authenticated users can view exercises"
  ON exercises FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert exercises"
  ON exercises FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update exercises"
  ON exercises FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can delete exercises"
  ON exercises FOR DELETE
  USING (get_user_role() = 'admin');

-- Políticas para EXERCISE_PRIMARY_MUSCLES
CREATE POLICY "Authenticated users can view exercise primary muscles"
  ON exercise_primary_muscles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert exercise primary muscles"
  ON exercise_primary_muscles FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can delete exercise primary muscles"
  ON exercise_primary_muscles FOR DELETE
  USING (get_user_role() = 'admin');

-- Políticas para EXERCISE_SYNERGIST_MUSCLES
CREATE POLICY "Authenticated users can view exercise synergist muscles"
  ON exercise_synergist_muscles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert exercise synergist muscles"
  ON exercise_synergist_muscles FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can delete exercise synergist muscles"
  ON exercise_synergist_muscles FOR DELETE
  USING (get_user_role() = 'admin');

-- Políticas para EXERCISE_VIDEOS
CREATE POLICY "Authenticated users can view exercise videos"
  ON exercise_videos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert exercise videos"
  ON exercise_videos FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update exercise videos"
  ON exercise_videos FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can delete exercise videos"
  ON exercise_videos FOR DELETE
  USING (get_user_role() = 'admin');

-- =============================================
-- DATOS INICIALES
-- =============================================

-- Direcciones
INSERT INTO directions (name) VALUES
  ('Empuje horizontal'),
  ('Empuje vertical'),
  ('Tirón horizontal'),
  ('Tirón vertical');

-- Patrones de movimiento comunes
INSERT INTO movement_patterns (name) VALUES
  ('Press'),
  ('Tirón'),
  ('Sentadilla'),
  ('Bisagra de cadera'),
  ('Zancada'),
  ('Rotación'),
  ('Acarreo'),
  ('Aislamiento');

-- Músculos principales
INSERT INTO muscles (name) VALUES
  ('Pectoral mayor'),
  ('Pectoral menor'),
  ('Deltoides anterior'),
  ('Deltoides medio'),
  ('Deltoides posterior'),
  ('Trapecio'),
  ('Dorsal ancho'),
  ('Romboides'),
  ('Bíceps braquial'),
  ('Tríceps braquial'),
  ('Braquial'),
  ('Braquiorradial'),
  ('Cuádriceps'),
  ('Isquiotibiales'),
  ('Glúteo mayor'),
  ('Glúteo medio'),
  ('Aductores'),
  ('Abductores'),
  ('Gemelos'),
  ('Sóleo'),
  ('Tibial anterior'),
  ('Recto abdominal'),
  ('Oblicuos'),
  ('Transverso abdominal'),
  ('Erectores espinales'),
  ('Serrato anterior'),
  ('Infraespinoso'),
  ('Supraespinoso'),
  ('Redondo mayor'),
  ('Redondo menor');
