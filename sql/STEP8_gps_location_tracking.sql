-- ============================================
-- STEP 8: GPS Location Tracking System
-- ============================================
-- Creates location_history table for real-time driver tracking

CREATE TABLE IF NOT EXISTS location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES auth.users(id) NOT NULL,
  job_id UUID REFERENCES jobs(id),
  latitude DECIMAL(10, 8) NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DECIMAL(11, 8) NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  accuracy DECIMAL(10, 2), -- in meters
  speed DECIMAL(10, 2), -- in mph or km/h
  heading DECIMAL(5, 2) CHECK (heading >= 0 AND heading <= 360), -- degrees 0-360
  altitude DECIMAL(10, 2), -- in meters
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_location_driver_time ON location_history(driver_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_job_time ON location_history(job_id, recorded_at DESC) WHERE job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_location_recorded ON location_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_driver_latest ON location_history(driver_id, recorded_at DESC) WHERE recorded_at > NOW() - INTERVAL '1 hour';

-- Create spatial index for geographic queries (if PostGIS is available)
-- Uncomment if you have PostGIS extension enabled:
-- CREATE INDEX IF NOT EXISTS idx_location_geographic ON location_history USING GIST (ll_to_earth(latitude, longitude));

-- Enable Row Level Security
ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Drivers can insert their own location
CREATE POLICY "Drivers insert own location"
  ON location_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

-- RLS Policy: Admins can view all locations
CREATE POLICY "Admins view all locations"
  ON location_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy: Drivers can view their own location history
CREATE POLICY "Drivers view own location"
  ON location_history FOR SELECT
  TO authenticated
  USING (auth.uid() = driver_id);

-- Create function to get latest driver locations (for map view)
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
  job_id UUID,
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

-- Create function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_miles(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  r DECIMAL := 3959.0; -- Earth radius in miles (use 6371 for km)
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

-- Create function to get route statistics
CREATE OR REPLACE FUNCTION get_route_stats(
  p_driver_id UUID,
  p_job_id UUID DEFAULT NULL,
  p_start_time TIMESTAMPTZ DEFAULT NULL,
  p_end_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  total_distance DECIMAL := 0;
  total_duration INTERVAL;
  avg_speed DECIMAL := 0;
  max_speed DECIMAL := 0;
  point_count INTEGER := 0;
BEGIN
  -- Build query based on parameters
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

-- Add comments for documentation
COMMENT ON TABLE location_history IS 'Stores GPS location history for driver tracking and route replay';
COMMENT ON COLUMN location_history.accuracy IS 'GPS accuracy in meters';
COMMENT ON COLUMN location_history.speed IS 'Speed in mph (or km/h based on configuration)';
COMMENT ON COLUMN location_history.heading IS 'Direction of travel in degrees (0-360, where 0 is North)';
COMMENT ON COLUMN location_history.recorded_at IS 'When the location was recorded by the device (may differ from created_at due to network delays)';

-- Grant permissions
GRANT SELECT, INSERT ON location_history TO authenticated;
GRANT ALL ON location_history TO service_role;
GRANT EXECUTE ON FUNCTION get_latest_driver_locations TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_distance_miles TO authenticated;
GRANT EXECUTE ON FUNCTION get_route_stats TO authenticated;

-- Create a view for active driver locations (last 5 minutes)
CREATE OR REPLACE VIEW active_driver_locations AS
SELECT * FROM get_latest_driver_locations(5);

GRANT SELECT ON active_driver_locations TO authenticated;
