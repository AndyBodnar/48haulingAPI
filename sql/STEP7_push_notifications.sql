-- ============================================
-- STEP 7: Push Notifications System
-- ============================================
-- Extends profiles table and creates notification triggers

-- Add push notification fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_token TEXT,
  ADD COLUMN IF NOT EXISTS push_platform VARCHAR(20) CHECK (push_platform IN ('ios', 'android', 'web')),
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ;

-- Create index for efficient push token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token) WHERE push_token IS NOT NULL;

-- Create notification trigger function for job assignments
CREATE OR REPLACE FUNCTION notify_job_assigned()
RETURNS TRIGGER AS $$
DECLARE
  driver_name TEXT;
BEGIN
  -- Only send notification if driver is assigned (not null)
  IF NEW.driver_id IS NOT NULL THEN
    -- Get driver name
    SELECT full_name INTO driver_name
    FROM profiles
    WHERE id = NEW.driver_id;

    -- Insert notification record
    INSERT INTO notifications (user_id, title, body, data, type)
    VALUES (
      NEW.driver_id,
      'New Load Assigned',
      'You have been assigned a new load #' || COALESCE(NEW.load_number, NEW.id::TEXT),
      jsonb_build_object(
        'job_id', NEW.id,
        'type', 'job_assigned',
        'load_number', NEW.load_number,
        'priority', NEW.priority
      ),
      'job_assignment'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for job assignment
DROP TRIGGER IF EXISTS trigger_notify_job_assigned ON jobs;
CREATE TRIGGER trigger_notify_job_assigned
  AFTER INSERT ON jobs
  FOR EACH ROW
  WHEN (NEW.driver_id IS NOT NULL)
  EXECUTE FUNCTION notify_job_assigned();

-- Create notification trigger function for status changes
CREATE OR REPLACE FUNCTION notify_status_change()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  status_text TEXT;
BEGIN
  -- Only notify if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Convert status to readable text
    status_text := CASE NEW.status
      WHEN 'pending' THEN 'Pending'
      WHEN 'assigned' THEN 'Assigned'
      WHEN 'in_progress' THEN 'In Progress'
      WHEN 'completed' THEN 'Completed'
      WHEN 'cancelled' THEN 'Cancelled'
      ELSE INITCAP(NEW.status)
    END;

    -- Notify all admins
    FOR admin_record IN
      SELECT id FROM profiles WHERE role = 'admin'
    LOOP
      INSERT INTO notifications (user_id, title, body, data, type)
      VALUES (
        admin_record.id,
        'Load Status Updated',
        'Load #' || COALESCE(NEW.load_number, NEW.id::TEXT) || ' is now ' || status_text,
        jsonb_build_object(
          'job_id', NEW.id,
          'type', 'status_change',
          'load_number', NEW.load_number,
          'old_status', OLD.status,
          'new_status', NEW.status
        ),
        'status_update'
      );
    END LOOP;

    -- Also notify the driver if assigned
    IF NEW.driver_id IS NOT NULL AND NEW.status = 'completed' THEN
      INSERT INTO notifications (user_id, title, body, data, type)
      VALUES (
        NEW.driver_id,
        'Load Completed',
        'Great job! Load #' || COALESCE(NEW.load_number, NEW.id::TEXT) || ' has been marked as completed',
        jsonb_build_object(
          'job_id', NEW.id,
          'type', 'completion',
          'load_number', NEW.load_number
        ),
        'completion'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status changes
DROP TRIGGER IF EXISTS trigger_notify_status_change ON jobs;
CREATE TRIGGER trigger_notify_status_change
  AFTER UPDATE ON jobs
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_status_change();

-- Create notification function for DVIR defects (will be used later)
CREATE OR REPLACE FUNCTION notify_dvir_defects()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
  driver_name TEXT;
BEGIN
  -- Only notify if defects were found
  IF NEW.defects_found = TRUE THEN
    -- Get driver name
    SELECT full_name INTO driver_name
    FROM profiles
    WHERE id = NEW.driver_id;

    -- Notify all admins
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

-- Note: DVIR trigger will be created when dvirs table is created in Phase 2

-- Create notification function for new messages
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  -- Get sender name
  SELECT full_name INTO sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Insert notification for recipient
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

-- Note: Message trigger will be created when messages table is created in Phase 2

-- Add comments for documentation
COMMENT ON COLUMN profiles.push_token IS 'FCM/OneSignal device token for push notifications';
COMMENT ON COLUMN profiles.push_platform IS 'Platform: ios, android, or web';
COMMENT ON COLUMN profiles.notifications_enabled IS 'User preference for receiving notifications';

-- Grant permissions
GRANT UPDATE (push_token, push_platform, notifications_enabled, push_token_updated_at) ON profiles TO authenticated;
