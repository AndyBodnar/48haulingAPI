import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { getCorsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    // Get query parameters
    const url = new URL(req.url)
    const driverId = url.searchParams.get('driver_id')
    const jobId = url.searchParams.get('job_id')
    const startDate = url.searchParams.get('start_date')
    const endDate = url.searchParams.get('end_date')
    const limit = parseInt(url.searchParams.get('limit') || '1000')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const includeStats = url.searchParams.get('include_stats') === 'true'

    // Validate required parameters
    if (!driverId && !jobId) {
      throw new Error('Either driver_id or job_id parameter is required')
    }

    // Check permissions
    if (driverId && !isAdmin && driverId !== user.id) {
      throw new Error('Unauthorized to view this driver location history')
    }

    // Build query
    let query = supabase
      .from('location_history')
      .select('*', { count: 'exact' })
      .order('recorded_at', { ascending: true })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (driverId) {
      query = query.eq('driver_id', driverId)
    }

    if (jobId) {
      query = query.eq('job_id', jobId)
    }

    if (startDate) {
      query = query.gte('recorded_at', startDate)
    }

    if (endDate) {
      query = query.lte('recorded_at', endDate)
    }

    const { data: locations, error: fetchError, count } = await query

    if (fetchError) {
      throw new Error(`Failed to fetch location history: ${fetchError.message}`)
    }

    // Prepare response
    const response: any = {
      success: true,
      data: locations || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
      },
    }

    // Calculate route statistics if requested
    if (includeStats && driverId) {
      const { data: stats, error: statsError } = await supabase
        .rpc('get_route_stats', {
          p_driver_id: driverId,
          p_job_id: jobId || null,
          p_start_time: startDate || null,
          p_end_time: endDate || null,
        })

      if (!statsError && stats) {
        response.statistics = stats
      }
    }

    return new Response(
      JSON.stringify(response),
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
