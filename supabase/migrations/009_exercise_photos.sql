-- Fotos de referencia por ejercicio
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-photos', 'exercise-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE TABLE exercise_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 1 CHECK (display_order IN (1, 2, 3)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (exercise_id, display_order)
);

CREATE INDEX idx_exercise_photos_exercise ON exercise_photos(exercise_id);

ALTER TABLE exercise_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view exercise photos"
  ON exercise_photos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert exercise photos"
  ON exercise_photos FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "Admins can update exercise photos"
  ON exercise_photos FOR UPDATE
  USING (get_user_role() = 'admin');

CREATE POLICY "Admins can delete exercise photos"
  ON exercise_photos FOR DELETE
  USING (get_user_role() = 'admin');

CREATE POLICY "Authenticated users can view exercise photo files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'exercise-photos'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Admins can insert exercise photo files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'exercise-photos'
    AND get_user_role() = 'admin'
  );

CREATE POLICY "Admins can update exercise photo files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'exercise-photos'
    AND get_user_role() = 'admin'
  );

CREATE POLICY "Admins can delete exercise photo files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'exercise-photos'
    AND get_user_role() = 'admin'
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_photos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_photos TO service_role;
