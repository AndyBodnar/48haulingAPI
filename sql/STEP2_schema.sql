-- STEP 2: Create all database tables and policies
-- Run this after STEP1_cleanup.sql

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'driver', 'user')) DEFAULT 'user',
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS jobs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  pickup_address TEXT NOT NULL,
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  delivery_address TEXT NOT NULL,
  delivery_lat DOUBLE PRECISION,
  delivery_lng DOUBLE PRECISION,
  status TEXT NOT NULL CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  priority INTEGER DEFAULT 0,
  estimated_duration_minutes INTEGER
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_driver_id ON jobs(driver_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view their assigned jobs" ON jobs;
CREATE POLICY "Drivers can view their assigned jobs" ON jobs FOR SELECT USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all jobs" ON jobs;
CREATE POLICY "Admins can view all jobs" ON jobs FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can insert jobs" ON jobs;
CREATE POLICY "Admins can insert jobs" ON jobs FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can update jobs" ON jobs;
CREATE POLICY "Admins can update jobs" ON jobs FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Drivers can update their job status" ON jobs;
CREATE POLICY "Drivers can update their job status" ON jobs FOR UPDATE USING (driver_id = auth.uid()) WITH CHECK (driver_id = auth.uid());

CREATE TABLE IF NOT EXISTS time_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  job_id BIGINT REFERENCES jobs(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER GENERATED ALWAYS AS (CASE WHEN end_time IS NOT NULL THEN EXTRACT(EPOCH FROM (end_time - start_time)) / 60 ELSE NULL END) STORED,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_logs_driver_id ON time_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_job_id ON time_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_start_time ON time_logs(start_time DESC);
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can view their own time logs" ON time_logs;
CREATE POLICY "Drivers can view their own time logs" ON time_logs FOR SELECT USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can insert their own time logs" ON time_logs;
CREATE POLICY "Drivers can insert their own time logs" ON time_logs FOR INSERT WITH CHECK (driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can update their own time logs" ON time_logs;
CREATE POLICY "Drivers can update their own time logs" ON time_logs FOR UPDATE USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all time logs" ON time_logs;
CREATE POLICY "Admins can view all time logs" ON time_logs FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS device_status (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  app_type TEXT NOT NULL CHECK (app_type IN ('mobile', 'web')),
  last_seen TIMESTAMPTZ DEFAULT now(),
  app_version TEXT,
  device_info JSONB,
  is_online BOOLEAN GENERATED ALWAYS AS (last_seen > (now() - INTERVAL '10 minutes')) STORED
);

CREATE INDEX IF NOT EXISTS idx_device_status_last_seen ON device_status(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_device_status_app_type ON device_status(app_type);
ALTER TABLE device_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update their own device status" ON device_status;
CREATE POLICY "Users can update their own device status" ON device_status FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all device statuses" ON device_status;
CREATE POLICY "Admins can view all device statuses" ON device_status FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS error_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  app_version TEXT,
  device_info JSONB,
  severity TEXT DEFAULT 'medium',
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE error_logs ADD CONSTRAINT error_logs_severity_check CHECK (severity IN ('low', 'medium', 'high', 'critical'));

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own error logs" ON error_logs;
CREATE POLICY "Users can insert their own error logs" ON error_logs FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own error logs" ON error_logs;
CREATE POLICY "Users can view their own error logs" ON error_logs FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all error logs" ON error_logs;
CREATE POLICY "Admins can view all error logs" ON error_logs FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS reported_issues (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  reported_at TIMESTAMPTZ DEFAULT now(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')) DEFAULT 'new',
  app_version TEXT,
  category TEXT CHECK (category IN ('bug', 'feature_request', 'question', 'other')) DEFAULT 'bug',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  admin_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_reported_issues_reported_at ON reported_issues(reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_reported_issues_reporter_id ON reported_issues(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reported_issues_status ON reported_issues(status);
CREATE INDEX IF NOT EXISTS idx_reported_issues_priority ON reported_issues(priority);
ALTER TABLE reported_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own issues" ON reported_issues;
CREATE POLICY "Users can insert their own issues" ON reported_issues FOR INSERT WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own issues" ON reported_issues;
CREATE POLICY "Users can view their own issues" ON reported_issues FOR SELECT USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all issues" ON reported_issues;
CREATE POLICY "Admins can view all issues" ON reported_issues FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS app_versions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  version_number TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  min_supported_version TEXT,
  force_update BOOLEAN DEFAULT false,
  release_notes TEXT,
  download_url TEXT,
  released_at TIMESTAMPTZ DEFAULT now(),
  deprecated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_app_versions_platform ON app_versions(platform);
CREATE INDEX IF NOT EXISTS idx_app_versions_is_active ON app_versions(is_active);
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active app versions" ON app_versions;
CREATE POLICY "Anyone can view active app versions" ON app_versions FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage app versions" ON app_versions;
CREATE POLICY "Admins can manage app versions" ON app_versions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_data JSONB,
  app_version TEXT,
  platform TEXT,
  session_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own analytics" ON analytics_events;
CREATE POLICY "Users can insert their own analytics" ON analytics_events FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all analytics" ON analytics_events;
CREATE POLICY "Admins can view all analytics" ON analytics_events FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
