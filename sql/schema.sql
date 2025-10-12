-- Phase 1: Supabase Backend Setup
-- 1.1. Database Schema

-- profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role TEXT,
  full_name TEXT
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- jobs table
CREATE TABLE jobs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ DEFAULT now(),
  pickup_address TEXT,
  delivery_address TEXT,
  status TEXT,
  driver_id UUID REFERENCES profiles(id)
);
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- time_logs table
CREATE TABLE time_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  job_id BIGINT REFERENCES jobs(id),
  driver_id UUID REFERENCES profiles(id),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ
);
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- device_status table
CREATE TABLE device_status (
  user_id UUID PRIMARY KEY,
  app_type TEXT,
  last_seen TIMESTAMPTZ
);
ALTER TABLE device_status ENABLE ROW LEVEL SECURITY;

-- error_logs table
CREATE TABLE error_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES profiles(id),
  error_message TEXT,
  stack_trace TEXT,
  app_version TEXT,
  device_info JSONB
);
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- reported_issues table
CREATE TABLE reported_issues (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  reported_at TIMESTAMPTZ DEFAULT now(),
  reporter_id UUID REFERENCES profiles(id),
  description TEXT,
  status TEXT DEFAULT 'new',
  app_version TEXT
);
ALTER TABLE reported_issues ENABLE ROW LEVEL SECURITY;
