-- Add name column to profiles
ALTER TABLE profiles ADD COLUMN name TEXT;

-- Create index for searching by name
CREATE INDEX idx_profiles_name ON profiles(name);
