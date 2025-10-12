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
    // Verify admin authentication
    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { endpoint_id } = await req.json()

    if (!endpoint_id) {
      return new Response(JSON.stringify({ error: 'endpoint_id is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Fetch endpoint details
    const { data: endpoint, error: fetchError } = await supabase
      .from('api_endpoints')
      .select('*, endpoint_parameters(*), middleware_config(*)')
      .eq('id', endpoint_id)
      .single()

    if (fetchError || !endpoint) {
      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // Generate the function code
    const functionCode = generateFunctionCode(endpoint)

    // In a real implementation, you would:
    // 1. Write the file to the filesystem
    // 2. Deploy it using Supabase CLI
    // For now, we'll return the generated code

    return new Response(
      JSON.stringify({
        success: true,
        endpoint: endpoint.name,
        code: functionCode,
        message: 'Function code generated successfully. Deploy using Supabase CLI.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

function generateFunctionCode(endpoint: any): string {
  const params = endpoint.endpoint_parameters || []
  const middlewares = endpoint.middleware_config || []

  // Generate parameter validation
  const paramValidation = params.map((p: any) => {
    if (p.is_required) {
      return `    if (!${p.param_name}) {
      return new Response(JSON.stringify({ error: 'Missing required parameter: ${p.param_name}' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }`
    }
    return ''
  }).filter(Boolean).join('\n\n')

  // Generate function body
  return `import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'
${endpoint.rate_limit ? `import { checkRateLimit } from '../_shared/rate-limit.ts'` : ''}

// ${endpoint.display_name}
// ${endpoint.description || 'Auto-generated endpoint'}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  ${endpoint.auth_required || endpoint.role_required ? `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''` : `Deno.env.get('SUPABASE_ANON_KEY') ?? ''`}
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Verify method
  if (req.method !== '${endpoint.method}') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  try {
    ${endpoint.auth_required ? `
    // Validate user authentication
    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }` : ''}

    ${endpoint.role_required ? `
    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== '${endpoint.role_required}') {
      return new Response(JSON.stringify({ error: '${endpoint.role_required} access required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }` : ''}

    ${endpoint.rate_limit ? `
    // Check rate limit
    const rateLimitResult = await checkRateLimit(user.id, '${endpoint.name}', ${endpoint.rate_limit})
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          retry_after: rateLimitResult.retry_after
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        }
      )
    }` : ''}

    // Parse request body
    const body = await req.json()
${params.map((p: any) => `    const { ${p.param_name} } = body`).join('\n')}

    // Validate required parameters
${paramValidation}

    // TODO: Implement your business logic here
    // This is a template - customize based on your needs

    const result = {
      success: true,
      message: 'Endpoint ${endpoint.name} executed successfully',
      data: {
        // Add your response data here
      }
    }

    // Log metrics
    await supabase.from('api_metrics').insert({
      endpoint_name: '${endpoint.name}',
      method: '${endpoint.method}',
      status_code: 200,
      response_time_ms: Date.now() - startTime,
      ${endpoint.auth_required ? `user_id: user.id,` : ''}
      timestamp: new Date().toISOString()
    })

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error:', error)

    // Log error metrics
    await supabase.from('api_metrics').insert({
      endpoint_name: '${endpoint.name}',
      method: '${endpoint.method}',
      status_code: 500,
      error_message: error.message,
      timestamp: new Date().toISOString()
    })

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
`
}
