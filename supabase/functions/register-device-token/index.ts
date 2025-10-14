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

    // Get request body
    const { push_token, push_platform, notifications_enabled } = await req.json()

    // Validate required fields
    if (!push_token) {
      throw new Error('push_token is required')
    }

    if (!push_platform || !['ios', 'android', 'web'].includes(push_platform)) {
      throw new Error('push_platform must be one of: ios, android, web')
    }

    // Update user profile with push token
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update({
        push_token,
        push_platform,
        notifications_enabled: notifications_enabled !== undefined ? notifications_enabled : true,
        push_token_updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to register device token: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Device token registered successfully',
        data: {
          user_id: user.id,
          push_platform: profile.push_platform,
          notifications_enabled: profile.notifications_enabled,
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
