-- Agenda privada por administrador. Una escritura actualiza agenda y borradores atómicamente.
CREATE TABLE public.admin_planners (
  owner_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{"venues":[],"lessons":[],"overrides":{},"drafts":{},"travelMinutes":30}'::jsonb,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  CONSTRAINT planner_data_object CHECK (jsonb_typeof(data) = 'object')
);
ALTER TABLE public.admin_planners ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_planners FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_planners TO authenticated;
CREATE POLICY "Admin owns private planner" ON public.admin_planners
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id AND public.get_user_role() = 'admin')
  WITH CHECK (auth.uid() = owner_id AND public.get_user_role() = 'admin');
