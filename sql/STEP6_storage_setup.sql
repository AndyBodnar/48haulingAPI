-- ============================================
-- Storage Bucket Setup for File Uploads
-- ============================================
-- Note: Storage buckets must be created through Supabase Dashboard or CLI
-- This file documents the required configuration

-- MANUAL STEPS (Run in Supabase Dashboard):
--
-- 1. Go to Storage > Create new bucket
-- 2. Bucket name: job-attachments
-- 3. Public bucket: YES (for easy access to files)
-- 4. File size limit: 10MB
-- 5. Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, application/pdf

-- Storage Policies (Run after bucket creation):

-- Policy 1: Anyone can view files (public bucket)
-- This is handled by making the bucket public

-- Policy 2: Authenticated users can upload files
INSERT INTO storage.policies (name, bucket_id, definition, check)
VALUES (
  'Authenticated users can upload',
  'job-attachments',
  '((bucket_id = ''job-attachments''::text) AND (auth.role() = ''authenticated''::text))',
  '((bucket_id = ''job-attachments''::text) AND (auth.role() = ''authenticated''::text))'
)
ON CONFLICT DO NOTHING;

-- Policy 3: Users can delete their own files or admins can delete any
INSERT INTO storage.policies (name, bucket_id, definition, check)
VALUES (
  'Users delete own files or admins delete any',
  'job-attachments',
  '((bucket_id = ''job-attachments''::text) AND ((auth.uid() = owner) OR (EXISTS (SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = ''admin''::text))))))',
  NULL
)
ON CONFLICT DO NOTHING;

-- ALTERNATIVE: If you prefer to use Supabase CLI:
--
-- Run this command from your project root:
-- supabase storage create job-attachments --public
--
-- Then apply the policies above through the dashboard or by running:
-- supabase db push

-- Verification Query (run after setup to verify bucket exists):
-- SELECT * FROM storage.buckets WHERE name = 'job-attachments';
