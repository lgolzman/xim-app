-- Allow admins to enable/disable student profiles.

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');
