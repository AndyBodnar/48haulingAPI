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
    const getAllDrivers = url.searchParams.get('all') === 'true'

    // If requesting all drivers, must be admin
    if (getAllDrivers) {
      if (!isAdmin) {
        throw new Error('Admin access required to view all driver locations')
      }

      // Use the database function to get latest locations for all drivers
      const { data: locations, error: fetchError } = await supabase
        .rpc('get_latest_driver_locations', { minutes_ago: 5 })

      if (fetchError) {
        throw new Error(`Failed to fetch driver locations: ${fetchError.message}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: locations || [],
          count: locations?.length || 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // If requesting specific driver
    if (!driverId) {
      throw new Error('driver_id parameter is required (or use ?all=true for all drivers)')
    }

    // Check permissions: admin can view any driver, drivers can only view themselves
    if (!isAdmin && driverId !== user.id) {
      throw new Error('Unauthorized to view this driver location')
    }

    // Get most recent location for the driver
    const { data: location, error: fetchError } = await supabase
      .from('location_history')
      .select(`
        *,
        driver:driver_id(id, email, full_name)
      `)
      .eq('driver_id', driverId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error(`Failed to fetch location: ${fetchError.message}`)
    }

    if (!location) {
      return new Response(
        JSON.stringify({
          success: true,
          data: null,
          message: 'No location data found for this driver',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Calculate how old the location is
    const recordedAt = new Date(location.recorded_at)
    const now = new Date()
    const minutesOld = (now.getTime() - recordedAt.getTime()) / 1000 / 60

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...location,
          minutes_old: Math.round(minutesOld * 10) / 10, // Round to 1 decimal
          is_stale: minutesOld > 5, // Consider stale if older than 5 minutes
        },
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
