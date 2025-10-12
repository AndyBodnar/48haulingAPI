-- STEP 1: Cleanup existing schema issues
-- Run this first to remove any problematic columns/indexes/tables

DROP INDEX IF EXISTS idx_profiles_email;
ALTER TABLE profiles DROP COLUMN IF EXISTS email;

-- Drop all tables if they exist (to start fresh)
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS app_versions CASCADE;
DROP TABLE IF EXISTS reported_issues CASCADE;
DROP TABLE IF EXISTS error_logs CASCADE;
DROP TABLE IF EXISTS device_status CASCADE;
DROP TABLE IF EXISTS time_logs CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();
