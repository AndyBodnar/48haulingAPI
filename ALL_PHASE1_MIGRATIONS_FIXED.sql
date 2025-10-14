-- ============================================
-- PHASE 1: ALL MIGRATIONS COMBINED (FIXED)
-- ============================================
-- Fixed to match your schema (bigint IDs, no created_by column)
-- Run this entire file in Supabase SQL Editor
-- URL: https://lnktfijmykqyejtikymu.supabase.co/project/lnktfijmykqyejtikymu/sql/new
-- ============================================

-- ============================================
-- MIGRATION 1: File Upload System
-- ============================================

CREATE TABLE IF NOT EXISTS job_attachments (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT REFERENCES jobs(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  attachment_type VARCHAR(50),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_attachments_job ON job_attachments(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_attachments_uploader ON job_attachments(uploaded_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_attachments_type ON job_attachments(attachment_type);

ALTER TABLE job_attachments ENABLE ROW LEVEL SECURITY;

-- Simplified RLS: Drivers can view attachments for their jobs, admins can view all
CREATE POLICY "Users view job attachments"
  ON job_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_attachments.job_id
      AND jobs.driver_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Drivers can upload attachments for their jobs, admins can upload for any job
CREATE POLICY "Users upload job attachments"
  ON job_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND (
      EXISTS (
        SELECT 1 FROM jobs
        WHERE jobs.id = job_attachments.job_id
        AND jobs.driver_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    )
  );

-- Users can delete their own attachments, admins can delete any
CREATE POLICY "Users delete own attachments"
  ON job_attachments FOR DELETE
  TO authenticated
  USING (
    auth.uid() = uploaded_by
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_job_attachments_updated_at ON job_attachments;
CREATE TRIGGER update_job_attachments_updated_at
  BEFORE UPDATE ON job_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE job_attachments IS 'Stores file attachments (photos, signatures, documents) for jobs and DVIRs';
COMMENT ON COLUMN job_attachments.attachment_type IS 'Type of attachment: photo, signature, document, dvir_photo, pod (proof of delivery)';
COMMENT ON COLUMN job_attachments.file_url IS 'URL path in Supabase Storage bucket (format: bucket_name/path/filename)';

GRANT SELECT, INSERT, DELETE ON job_attachments TO authenticated;
GRANT ALL ON job_attachments TO service_role;

-- ============================================
-- MIGRATION 2: Push Notifications System
-- ============================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_token TEXT,
  ADD COLUMN IF NOT EXISTS push_platform VARCHAR(20) CHECK (push_platform IN ('ios', 'android', 'web')),
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token) WHERE push_token IS NOT NULL;

CREATE OR REPLACE FUNCTION notify_job_assigned()
RETURNS TRIGGER AS $$
DECLARE
  driver_name TEXT;
BEGIN
  IF NEW.driver_id IS NOT NULL THEN
    SELECT full_name INTO driver_name
    FROM profiles
    WHERE id = NEW.driver_id;

    INSERT INTO notifications (user_id, title, body, data, type)
    VALUES (
      NEW.driver_id,
      'New Load Assigned',
      'You have been assigned a new load #' || NEW.id::TEXT,
      jsonb_build_object(
        'job_id', NEW.id,
        'type', 'job_assigned'
      ),
      'job_assignment'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_job_assigned ON jobs;
CREATE TRIGGER trigger_notify_job_assigned
  AFTER INSERT ON jobs
  FOR EACH ROW
  WHEN (NEW.driver_id IS NOT NULL)
  EXECUTE FUNCTION notify_job_assigned();

CREATE OR REPLACE FUNCTION notify_status_change()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  status_text TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    status_text := CASE NEW.status
      WHEN 'pending' THEN 'Pending'
      WHEN 'assigned' THEN 'Assigned'
      WHEN 'in_progress' THEN 'In Progress'
      WHEN 'completed' THEN 'Completed'
      WHEN 'cancelled' THEN 'Cancelled'
      ELSE INITCAP(NEW.status)
    END;

    FOR admin_record IN
      SELECT id FROM profiles WHERE role = 'admin'
    LOOP
      INSERT INTO notifications (user_id, title, body, data, type)
      VALUES (
        admin_record.id,
        'Load Status Updated',
        'Load #' || NEW.id::TEXT || ' is now ' || status_text,
        jsonb_build_object(
          'job_id', NEW.id,
          'type', 'status_change',
          'old_status', OLD.status,
          'new_status', NEW.status
        ),
        'status_update'
      );
    END LOOP;

    IF NEW.driver_id IS NOT NULL AND NEW.status = 'completed' THEN
      INSERT INTO notifications (user_id, title, body, data, type)
      VALUES (
        NEW.driver_id,
        'Load Completed',
        'Great job! Load #' || NEW.id::TEXT || ' has been marked as completed',
        jsonb_build_object(
          'job_id', NEW.id,
          'type', 'completion'
        ),
        'completion'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_status_change ON jobs;
CREATE TRIGGER trigger_notify_status_change
  AFTER UPDATE ON jobs
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_status_change();

CREATE OR REPLACE FUNCTION notify_dvir_defects()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  driver_name TEXT;
BEGIN
  IF NEW.defects_found = TRUE THEN
    SELECT full_name INTO driver_name
    FROM profiles
    WHERE id = NEW.driver_id;

    FOR admin_record IN
      SELECT id FROM profiles WHERE role = 'admin'
    LOOP
      INSERT INTO notifications (user_id, title, body, data, type)
      VALUES (
        admin_record.id,
        'DVIR: Defects Found',
        driver_name || ' reported vehicle defects in DVIR #' || NEW.dvir_number,
        jsonb_build_object(
          'dvir_id', NEW.id,
          'type', 'dvir_defects',
          'driver_id', NEW.driver_id,
          'vehicle_number', NEW.vehicle_number
        ),
        'dvir_alert'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  SELECT full_name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  INSERT INTO notifications (user_id, title, body, data, type)
  VALUES (
    NEW.recipient_id,
    'New Message',
    sender_name || ': ' || LEFT(NEW.body, 50) || CASE WHEN LENGTH(NEW.body) > 50 THEN '...' ELSE '' END,
    jsonb_build_object(
      'message_id', NEW.id,
      'type', 'new_message',
      'sender_id', NEW.sender_id,
      'job_id', NEW.job_id
    ),
    'message'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN profiles.push_token IS 'FCM/OneSignal device token for push notifications';
COMMENT ON COLUMN profiles.push_platform IS 'Platform: ios, android, or web';
COMMENT ON COLUMN profiles.notifications_enabled IS 'User preference for receiving notifications';

GRANT UPDATE (push_token, push_platform, notifications_enabled, push_token_updated_at) ON profiles TO authenticated;

-- ============================================
-- MIGRATION 3: GPS Location Tracking System
-- ============================================

CREATE TABLE IF NOT EXISTS location_history (
  id BIGSERIAL PRIMARY KEY,
  driver_id UUID REFERENCES auth.users(id) NOT NULL,
  job_id BIGINT REFERENCES jobs(id),
  latitude DECIMAL(10, 8) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DECIMAL(11, 8) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  accuracy DECIMAL(10, 2),
  speed DECIMAL(10, 2),
  heading DECIMAL(5, 2) CHECK (heading >= 0 AND heading <= 360),
  altitude DECIMAL(10, 2),
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_driver_time ON location_history(driver_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_job_time ON location_history(job_id, recorded_at DESC) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_location_recorded ON location_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_driver_latest ON location_history(driver_id, recorded_at DESC) WHERE recorded_at > NOW() - INTERVAL '1 hour';

ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers insert own location"
  ON location_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Admins view all locations"
  ON location_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Drivers view own location"
  ON location_history FOR SELECT
  TO authenticated
  USING (auth.uid() = driver_id);

CREATE OR REPLACE FUNCTION get_latest_driver_locations(
  minutes_ago INTEGER DEFAULT 5
)
RETURNS TABLE (
  driver_id UUID,
  driver_name TEXT,
  driver_email TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  accuracy DECIMAL,
  speed DECIMAL,
  heading DECIMAL,
  job_id BIGINT,
  recorded_at TIMESTAMPTZ,
  minutes_old DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (lh.driver_id)
    lh.driver_id,
    p.full_name as driver_name,
    p.email as driver_email,
    lh.latitude,
    lh.longitude,
    lh.accuracy,
    lh.speed,
    lh.heading,
    lh.job_id,
    lh.recorded_at,
    EXTRACT(EPOCH FROM (NOW() - lh.recorded_at)) / 60.0 as minutes_old
  FROM location_history lh
  JOIN profiles p ON p.id = lh.driver_id
  WHERE lh.recorded_at > NOW() - INTERVAL '1 minute' * minutes_ago
    AND p.role = 'driver'
  ORDER BY lh.driver_id, lh.recorded_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION calculate_distance_miles(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  r DECIMAL := 3959.0;
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dlat := RADIANS(lat2 - lat1);
  dlon := RADIANS(lon2 - lon1);

  a := SIN(dlat/2) * SIN(dlat/2) +
       COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
       SIN(dlon/2) * SIN(dlon/2);

  c := 2 * ATAN2(SQRT(a), SQRT(1-a));

  RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_route_stats(
  p_driver_id UUID,
  p_job_id BIGINT DEFAULT NULL,
  p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_end_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH route_points AS (
    SELECT *
    FROM location_history
    WHERE driver_id = p_driver_id
      AND (p_job_id IS NULL OR job_id = p_job_id)
      AND (p_start_time IS NULL OR recorded_at >= p_start_time)
      AND (p_end_time IS NULL OR recorded_at <= p_end_time)
    ORDER BY recorded_at
  ),
  distances AS (
    SELECT
      rp1.latitude as lat1,
      rp1.longitude as lon1,
      rp2.latitude as lat2,
      rp2.longitude as lon2,
      rp1.speed,
      rp2.recorded_at - rp1.recorded_at as time_diff
    FROM route_points rp1
    JOIN route_points rp2 ON rp2.recorded_at > rp1.recorded_at
    WHERE rp2.recorded_at = (
      SELECT MIN(recorded_at)
      FROM route_points
      WHERE recorded_at > rp1.recorded_at
    )
  )
  SELECT
    json_build_object(
      'total_distance_miles', COALESCE(SUM(calculate_distance_miles(lat1, lon1, lat2, lon2)), 0),
      'total_duration_seconds', COALESCE(EXTRACT(EPOCH FROM SUM(time_diff)), 0),
      'average_speed_mph', COALESCE(AVG(speed), 0),
      'max_speed_mph', COALESCE(MAX(speed), 0),
      'point_count', COUNT(*)
    )
  INTO result
  FROM distances;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE location_history IS 'Stores GPS location history for driver tracking and route replay';
COMMENT ON COLUMN location_history.accuracy IS 'GPS accuracy in meters';
COMMENT ON COLUMN location_history.speed IS 'Speed in mph (or km/h based on configuration)';
COMMENT ON COLUMN location_history.heading IS 'Direction of travel in degrees (0-360, where 0 is North)';
COMMENT ON COLUMN location_history.recorded_at IS 'When the location was recorded by the device (may differ from created_at due to network delays)';

GRANT SELECT, INSERT ON location_history TO authenticated;
GRANT ALL ON location_history TO service_role;
GRANT EXECUTE ON FUNCTION get_latest_driver_locations TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_distance_miles TO authenticated;
GRANT EXECUTE ON FUNCTION get_route_stats TO authenticated;

CREATE OR REPLACE VIEW active_driver_locations AS
SELECT * FROM get_latest_driver_locations(5);

GRANT SELECT ON active_driver_locations TO authenticated;

-- ============================================
-- ALL MIGRATIONS COMPLETE!
-- ============================================
-- You should see: "Success. No rows returned"
-- ============================================
