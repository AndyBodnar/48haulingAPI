-- ============================================
-- Audit Logs Table
-- ============================================
-- This table tracks all admin actions for security and compliance

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'view', 'download', 'login', 'logout'
  resource_type VARCHAR(100) NOT NULL, -- 'load', 'driver', 'dvir', 'message', 'document', 'user'
  resource_id VARCHAR(255), -- ID of the resource being acted upon
  description TEXT, -- Human-readable description
  metadata JSONB, -- Additional data (old values, new values, filters used, etc.)
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(50) DEFAULT 'success', -- 'success', 'failure', 'error'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status, created_at DESC);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only admins can view audit logs
CREATE POLICY "Admins view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- System can insert audit logs (service role)
CREATE POLICY "System insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No one can update or delete audit logs (immutable)
-- This ensures audit trail integrity

-- Add comment for documentation
COMMENT ON TABLE audit_logs IS 'Immutable audit trail of all admin actions for security and compliance';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed: create, update, delete, view, download, login, logout, etc.';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource: load, driver, dvir, message, document, user, etc.';
COMMENT ON COLUMN audit_logs.metadata IS 'JSON object with additional context: old_values, new_values, filters, search_terms, etc.';

-- Grant permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT INSERT ON audit_logs TO authenticated;
GRANT ALL ON audit_logs TO service_role;

-- Create a function to automatically log user info
CREATE OR REPLACE FUNCTION log_audit(
  p_action VARCHAR,
  p_resource_type VARCHAR,
  p_resource_id VARCHAR DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_status VARCHAR DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_user_email VARCHAR;
  v_user_role VARCHAR;
BEGIN
  -- Get user details
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();

  -- Insert audit log
  INSERT INTO audit_logs (
    user_id,
    user_email,
    user_role,
    action,
    resource_type,
    resource_id,
    description,
    metadata,
    status,
    error_message
  ) VALUES (
    auth.uid(),
    v_user_email,
    v_user_role,
    p_action,
    p_resource_type,
    p_resource_id,
    p_description,
    p_metadata,
    p_status,
    p_error_message
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on function
GRANT EXECUTE ON FUNCTION log_audit TO authenticated;

-- Example usage:
-- SELECT log_audit('create', 'load', '123', 'Created new load LOAD-1001', '{"load_number": "LOAD-1001"}');
-- SELECT log_audit('delete', 'driver', '456', 'Deleted driver John Doe', NULL);
-- SELECT log_audit('view', 'document', '789', 'Downloaded BOL document', '{"file_name": "bol-123.pdf"}');
