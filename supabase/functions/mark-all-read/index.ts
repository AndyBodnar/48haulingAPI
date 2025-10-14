import { createClient } from '@supabase/supabase-js'
import { getCorsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
)

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')
  const cors = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    const { data: userRes, error: userErr } = await supabase.auth.getUser(token)
    const user = userRes?.user
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null)

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'Internal error' }), {
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

