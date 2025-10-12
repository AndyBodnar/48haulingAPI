-- STEP 3: Seed data and setup auto-profile creation
-- Run this after STEP2_schema.sql

INSERT INTO app_versions (version_number, platform, min_supported_version, force_update, release_notes, is_active)
VALUES
  ('1.0.0', 'android', '1.0.0', false, 'Initial release', true),
  ('1.0.0', 'ios', '1.0.0', false, 'Initial release', true),
  ('1.0.0', 'web', '1.0.0', false, 'Initial release', true)
ON CONFLICT (version_number) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
