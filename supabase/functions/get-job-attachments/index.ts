import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { getCorsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BUCKET_NAME = 'job-attachments'

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

    // Get query parameters
    const url = new URL(req.url)
    const jobId = url.searchParams.get('job_id')
    const attachmentType = url.searchParams.get('attachment_type')

    if (!jobId) {
      throw new Error('job_id parameter is required')
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

    // Check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isJobOwner = job.created_by === user.id || job.driver_id === user.id

    if (!isAdmin && !isJobOwner) {
      throw new Error('Unauthorized to view attachments for this job')
    }

    // Build query
    let query = supabase
      .from('job_attachments')
      .select(`
        *,
        uploader:uploaded_by(id, email, full_name)
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })

    // Filter by attachment type if provided
    if (attachmentType) {
      query = query.eq('attachment_type', attachmentType)
    }

    const { data: attachments, error: fetchError } = await query

    if (fetchError) {
      throw new Error(`Failed to fetch attachments: ${fetchError.message}`)
    }

    // Generate signed URLs for each attachment (valid for 1 hour)
    const attachmentsWithUrls = await Promise.all(
      (attachments || []).map(async (attachment) => {
        const { data: signedData } = await supabase.storage
          .from(BUCKET_NAME)
          .createSignedUrl(attachment.file_url, 3600) // 1 hour

        return {
          ...attachment,
          signed_url: signedData?.signedUrl || null,
        }
      })
    )

    return new Response(
      JSON.stringify({
        success: true,
        data: attachmentsWithUrls,
        count: attachmentsWithUrls.length,
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
