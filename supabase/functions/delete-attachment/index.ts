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

    // Get attachment_id from request body
    const { attachment_id } = await req.json()

    if (!attachment_id) {
      throw new Error('attachment_id is required')
    }

    // Get attachment details
    const { data: attachment, error: fetchError } = await supabase
      .from('job_attachments')
      .select('*, job:jobs(driver_id, created_by)')
      .eq('id', attachment_id)
      .single()

    if (fetchError || !attachment) {
      throw new Error('Attachment not found')
    }

    // Check permissions - user must be uploader or admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'
    const isUploader = attachment.uploaded_by === user.id

    if (!isAdmin && !isUploader) {
      throw new Error('Unauthorized to delete this attachment')
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([attachment.file_url])

    if (storageError) {
      console.error('Storage deletion error:', storageError)
      // Continue anyway to delete database record
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('job_attachments')
      .delete()
      .eq('id', attachment_id)

    if (dbError) {
      throw new Error(`Failed to delete attachment record: ${dbError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Attachment deleted successfully',
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
