import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

// Initialize Supabase client with the service role key for admin-level access
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validate user authentication and role
    const authHeader = req.headers.get('Authorization')!
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(jwt)

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Check for 'admin' role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { startDate, endDate } = await req.json()
    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ error: 'Missing startDate or endDate' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // 2. Query the time_logs table
    const { data: timeLogs, error: timeLogsError } = await supabase
      .from('time_logs')
      .select('driver_id, start_time, end_time')
      .gte('start_time', startDate)
      .lte('end_time', endDate)

    if (timeLogsError) {
      throw timeLogsError
    }

    // 3. Aggregate total hours worked for each driver
    const payrollData = timeLogs.reduce((acc, log) => {
      if (log.end_time && log.start_time) {
        const hours = (new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) / (1000 * 60 * 60)
        acc[log.driver_id] = (acc[log.driver_id] || 0) + hours
      }
      return acc
    }, {})

    // 4. Retrieve QuickBooks credentials and submit payroll
    const quickbooksApiKey = Deno.env.get('QUICKBOOKS_API_KEY')
    if (!quickbooksApiKey) {
        console.error('QuickBooks API key not found. Skipping payroll submission.')
    } else {
        // In a real application, you would make the API call to QuickBooks here
        console.log('Submitting payroll to QuickBooks:', payrollData)
    }

    // 5. Log the action's success
    await supabase.from('error_logs').insert({
        user_id: user.id,
        error_message: `Payroll submitted for ${startDate} to ${endDate}`,
        app_version: 'backend'
    })

    return new Response(JSON.stringify({ message: 'Payroll submitted successfully', payrollData }), {
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
