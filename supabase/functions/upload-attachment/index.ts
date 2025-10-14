import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { getCorsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BUCKET_NAME = 'job-attachments'

// Allowed file types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024

serve(async (req) => {
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get user from token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const jobId = formData.get('job_id') as string
    const attachmentType = formData.get('attachment_type') as string || 'photo'
    const description = formData.get('description') as string || ''

    // Validate required fields
    if (!file) {
      throw new Error('No file provided')
    }

    if (!jobId) {
      throw new Error('job_id is required')
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`File type ${file.type} not allowed. Allowed types: ${ALLOWED_TYPES.join(', ')}`)
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size ${file.size} exceeds maximum of ${MAX_FILE_SIZE} bytes (10MB)`)
    }

    // Check if job exists and user has access
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, driver_id, created_by')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      throw new Error('Job not found')
    }

    // Check if user is admin, job creator, or assigned driver
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isJobOwner = job.created_by === user.id || job.driver_id === user.id

    if (!isAdmin && !isJobOwner) {
      throw new Error('Unauthorized to upload attachments for this job')
    }

    // Generate unique file name
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(7)
    const fileExt = file.name.split('.').pop()
    const fileName = `${jobId}/${attachmentType}_${timestamp}_${randomStr}.${fileExt}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw new Error(`Failed to upload file: ${uploadError.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName)

    // Insert record into database
    const { data: attachment, error: dbError } = await supabase
      .from('job_attachments')
      .insert({
        job_id: jobId,
        uploaded_by: user.id,
        file_name: file.name,
        file_url: uploadData.path,
        file_type: file.type,
        file_size: file.size,
        attachment_type: attachmentType,
        description: description,
      })
      .select()
      .single()

    if (dbError) {
      // If database insert fails, try to delete the uploaded file
      await supabase.storage.from(BUCKET_NAME).remove([fileName])
      throw new Error(`Failed to save attachment record: ${dbError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...attachment,
          public_url: publicUrl,
        },
        message: 'File uploaded successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
