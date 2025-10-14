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

    // Get request body - can be single location or array of locations
    const body = await req.json()
    const locations = Array.isArray(body) ? body : [body]

    // Validate and prepare location records
    const locationRecords = []

    for (const loc of locations) {
      // Validate required fields
      if (loc.latitude === undefined || loc.longitude === undefined) {
        throw new Error('latitude and longitude are required')
      }

      // Validate coordinate ranges
      const lat = parseFloat(loc.latitude)
      const lng = parseFloat(loc.longitude)

      if (lat < -90 || lat > 90) {
        throw new Error(`Invalid latitude: ${lat}. Must be between -90 and 90`)
      }

      if (lng < -180 || lng > 180) {
        throw new Error(`Invalid longitude: ${lng}. Must be between -180 and 180`)
      }

      // Validate heading if provided
      if (loc.heading !== undefined) {
        const heading = parseFloat(loc.heading)
        if (heading < 0 || heading > 360) {
          throw new Error(`Invalid heading: ${heading}. Must be between 0 and 360`)
        }
      }

      locationRecords.push({
        driver_id: user.id,
        job_id: loc.job_id || null,
        latitude: lat,
        longitude: lng,
        accuracy: loc.accuracy ? parseFloat(loc.accuracy) : null,
        speed: loc.speed ? parseFloat(loc.speed) : null,
        heading: loc.heading ? parseFloat(loc.heading) : null,
        altitude: loc.altitude ? parseFloat(loc.altitude) : null,
        recorded_at: loc.recorded_at || new Date().toISOString(),
      })
    }

    // Insert locations (bulk insert for efficiency)
    const { data: insertedLocations, error: insertError } = await supabase
      .from('location_history')
      .insert(locationRecords)
      .select()

    if (insertError) {
      throw new Error(`Failed to save locations: ${insertError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully saved ${locationRecords.length} location(s)`,
        count: locationRecords.length,
        data: insertedLocations,
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
