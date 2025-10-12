import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
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

    const { job_id, status } = await req.json()

    const validStatuses = ['in_progress', 'completed', 'cancelled']
    if (!job_id || !status || !validStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid job_id or status' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Verify the job belongs to this driver
    const { data: existingJob } = await supabase
      .from('jobs')
      .select('driver_id')
      .eq('id', job_id)
      .single()

    if (!existingJob || existingJob.driver_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Job not found or not assigned to you' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // Update status with appropriate timestamp
    const updateData: any = { status }
    if (status === 'in_progress') {
      updateData.started_at = new Date().toISOString()
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { data: job, error } = await supabase
      .from('jobs')
      .update(updateData)
      .eq('id', job_id)
      .select()
      .single()

    if (error) throw error

    // If job is starting, create a time log entry
    if (status === 'in_progress') {
      await supabase
        .from('time_logs')
        .insert({
          job_id,
          driver_id: user.id,
          start_time: new Date().toISOString()
        })
    }

    // If job is completed, close the time log
    if (status === 'completed') {
      const { data: openLog } = await supabase
        .from('time_logs')
        .select('id')
        .eq('job_id', job_id)
        .eq('driver_id', user.id)
        .is('end_time', null)
        .single()

      if (openLog) {
        await supabase
          .from('time_logs')
          .update({ end_time: new Date().toISOString() })
          .eq('id', openLog.id)
      }
    }

    return new Response(JSON.stringify({ success: true, job }), {
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
