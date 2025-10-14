import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { getCorsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Firebase Cloud Messaging (FCM) configuration
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')
const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send'

// OneSignal configuration (alternative)
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY')
const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')
const ONESIGNAL_ENDPOINT = 'https://onesignal.com/api/v1/notifications'

// Determine which service to use (FCM takes priority if both are configured)
const useFirebase = !!FCM_SERVER_KEY
const useOneSignal = !useFirebase && !!ONESIGNAL_API_KEY && !!ONESIGNAL_APP_ID

async function sendFCMNotification(
  pushToken: string,
  title: string,
  body: string,
  data: Record<string, any>
) {
  const response = await fetch(FCM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `key=${FCM_SERVER_KEY}`,
    },
    body: JSON.stringify({
      to: pushToken,
      notification: {
        title,
        body,
        sound: 'default',
        badge: '1',
      },
      data,
      priority: 'high',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`FCM error: ${error}`)
  }

  return await response.json()
}

async function sendOneSignalNotification(
  pushToken: string,
  title: string,
  body: string,
  data: Record<string, any>
) {
  const response = await fetch(ONESIGNAL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: [pushToken],
      headings: { en: title },
      contents: { en: body },
      data,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OneSignal error: ${error}`)
  }

  return await response.json()
}

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
    const {
      recipient_id,
      recipient_ids, // For batch sending
      title,
      body,
      data = {},
      type = 'general',
    } = await req.json()

    // Validate required fields
    if (!title || !body) {
      throw new Error('title and body are required')
    }

    if (!recipient_id && (!recipient_ids || recipient_ids.length === 0)) {
      throw new Error('Either recipient_id or recipient_ids array is required')
    }

    // Get recipients list
    const recipients = recipient_ids || [recipient_id]

    // Fetch recipient profiles with push tokens
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id, push_token, push_platform, notifications_enabled, full_name')
      .in('id', recipients)

    if (fetchError) {
      throw new Error(`Failed to fetch recipients: ${fetchError.message}`)
    }

    const results = []
    const notificationRecords = []

    // Send notification to each recipient
    for (const profile of profiles || []) {
      // Skip if notifications disabled or no push token
      if (!profile.notifications_enabled || !profile.push_token) {
        results.push({
          user_id: profile.id,
          success: false,
          reason: !profile.notifications_enabled ? 'notifications_disabled' : 'no_push_token',
        })
        continue
      }

      try {
        // Send push notification
        let pushResult
        if (useFirebase) {
          pushResult = await sendFCMNotification(profile.push_token, title, body, data)
        } else if (useOneSignal) {
          pushResult = await sendOneSignalNotification(profile.push_token, title, body, data)
        } else {
          throw new Error('No push notification service configured (FCM or OneSignal)')
        }

        results.push({
          user_id: profile.id,
          success: true,
          push_result: pushResult,
        })

        // Create notification record in database
        notificationRecords.push({
          user_id: profile.id,
          title,
          body,
          data: data || {},
          type,
        })
      } catch (error) {
        console.error(`Failed to send to ${profile.id}:`, error)
        results.push({
          user_id: profile.id,
          success: false,
          error: error.message,
        })

        // Still create notification record for in-app viewing
        notificationRecords.push({
          user_id: profile.id,
          title,
          body,
          data: data || {},
          type,
        })
      }
    }

    // Insert notification records into database
    if (notificationRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationRecords)

      if (insertError) {
        console.error('Failed to save notifications:', insertError)
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failCount = results.length - successCount

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} notifications, ${failCount} failed`,
        results,
        push_service: useFirebase ? 'firebase' : useOneSignal ? 'onesignal' : 'none',
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
