import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // Get various statistics
    const [
      { count: totalUsers },
      { count: totalDrivers },
      { count: activeDevices },
      { count: pendingJobs },
      { count: inProgressJobs },
      { count: completedJobsToday },
      { count: unresolvedErrors },
      { count: openIssues }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'driver'),
      supabase.from('device_status').select('*', { count: 'exact', head: true }).gt('last_seen', new Date(Date.now() - 10 * 60 * 1000).toISOString()),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('completed_at', new Date().toISOString().split('T')[0]),
      supabase.from('error_logs').select('*', { count: 'exact', head: true }).eq('resolved', false),
      supabase.from('reported_issues').select('*', { count: 'exact', head: true }).in('status', ['new', 'in_progress'])
    ])

    // Get recent activity
    const { data: recentJobs } = await supabase
      .from('jobs')
      .select('id, status, created_at, pickup_address, delivery_address, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: recentErrors } = await supabase
      .from('error_logs')
      .select('id, created_at, error_message, severity, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(10)

    return new Response(JSON.stringify({
      stats: {
        total_users: totalUsers || 0,
        total_drivers: totalDrivers || 0,
        active_devices: activeDevices || 0,
        pending_jobs: pendingJobs || 0,
        in_progress_jobs: inProgressJobs || 0,
        completed_jobs_today: completedJobsToday || 0,
        unresolved_errors: unresolvedErrors || 0,
        open_issues: openIssues || 0
      },
      recent_jobs: recentJobs,
      recent_errors: recentErrors
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
