import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
)

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validate user authentication
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { pickup, delivery } = await req.json()
    if (!pickup || !delivery) {
      return new Response(JSON.stringify({ error: 'Missing pickup or delivery address' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 2. Retrieve Google Maps API key from Supabase secrets
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!googleMapsApiKey) {
        return new Response(JSON.stringify({ error: 'Google Maps API key not found' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }


    // 3. Call the Google Maps Directions API
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${pickup}&destination=${delivery}&key=${googleMapsApiKey}`
    const directionsResponse = await fetch(directionsUrl)
    const directionsData = await directionsResponse.json()

    if (directionsData.status !== 'OK') {
        return new Response(JSON.stringify({ error: 'Error fetching directions from Google Maps', details: directionsData }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }

    // 4. Return a JSON object with the optimized route
    const route = directionsData.routes[0]
    const leg = route.legs[0]
    const polyline = route.overview_polyline.points

    return new Response(JSON.stringify({
      polyline,
      distance: leg.distance,
      duration: leg.duration,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
