-- Seed Data for Development/Testing
-- This file contains initial data for testing the API

-- Note: In production, you should create admin users through Supabase Auth UI
-- This is just for reference on how the data should look

-- Example: Insert app versions
INSERT INTO app_versions (version_number, platform, min_supported_version, force_update, release_notes, is_active)
VALUES
  ('1.0.0', 'android', '1.0.0', false, 'Initial release', true),
  ('1.0.0', 'ios', '1.0.0', false, 'Initial release', true),
  ('1.0.0', 'web', '1.0.0', false, 'Initial release', true)
ON CONFLICT (version_number) DO NOTHING;

-- Note: To create an admin user, you need to:
-- 1. Sign up through Supabase Auth (either via UI or API)
-- 2. Then run this SQL to promote them to admin:
--
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
--
-- Or use this function to create a profile trigger:

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    'user' -- Default role, change to 'admin' or 'driver' as needed
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
