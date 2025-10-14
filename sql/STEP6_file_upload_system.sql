-- ============================================
-- STEP 6: File Upload System
-- ============================================
-- This migration adds support for file uploads (photos, signatures, documents)
-- for jobs, DVIRs, and other features

-- Create job_attachments table
CREATE TABLE IF NOT EXISTS job_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50), -- 'image/jpeg', 'image/png', 'application/pdf', etc.
  file_size INTEGER, -- in bytes
  attachment_type VARCHAR(50), -- 'photo', 'signature', 'document', 'dvir_photo', 'pod' (proof of delivery)
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_attachments_job ON job_attachments(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_attachments_uploader ON job_attachments(uploaded_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_attachments_type ON job_attachments(attachment_type);

-- Enable Row Level Security
ALTER TABLE job_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view attachments for their jobs or if they're admin
CREATE POLICY "Users view job attachments"
  ON job_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_attachments.job_id
      AND (jobs.driver_id = auth.uid() OR jobs.created_by = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Users can upload attachments for their jobs
CREATE POLICY "Users upload job attachments"
  ON job_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND (
      EXISTS (
        SELECT 1 FROM jobs
        WHERE jobs.id = job_attachments.job_id
        AND (jobs.driver_id = auth.uid() OR jobs.created_by = auth.uid())
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

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_job_attachments_updated_at ON job_attachments;
CREATE TRIGGER update_job_attachments_updated_at
  BEFORE UPDATE ON job_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE job_attachments IS 'Stores file attachments (photos, signatures, documents) for jobs and DVIRs';
COMMENT ON COLUMN job_attachments.attachment_type IS 'Type of attachment: photo, signature, document, dvir_photo, pod (proof of delivery)';
COMMENT ON COLUMN job_attachments.file_url IS 'URL path in Supabase Storage bucket (format: bucket_name/path/filename)';

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON job_attachments TO authenticated;
GRANT ALL ON job_attachments TO service_role;
