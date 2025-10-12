import { SupabaseClient } from '@supabase/supabase-js'
import { getCorsHeaders } from './cors.ts'
import { checkRateLimit, getRateLimitIdentifier, RateLimitConfig } from './rate-limiter.ts'

export interface AuthResult {
  user: any
  profile?: any
  error?: Response
}

/**
 * Authenticate user and optionally check role
 */
export async function authenticateUser(
  req: Request,
  supabase: SupabaseClient,
  requiredRole?: 'admin' | 'driver' | 'user'
): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization')

  if (!authHeader) {
    return {
      user: null,
      error: new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
        status: 401,
      })
    }
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return {
      user: null,
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
        status: 401,
      })
    }
  }

  // If role check is required
  if (requiredRole) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        user,
        error: new Response(JSON.stringify({ error: 'Profile not found' }), {
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
          status: 403,
        })
      }
    }

    if (profile.role !== requiredRole && requiredRole === 'admin') {
      return {
        user,
        profile,
        error: new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), {
          headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
          status: 403,
        })
      }
    }

    return { user, profile }
  }

  return { user }
}

/**
 * Apply rate limiting to request
 */
export function applyRateLimit(
  req: Request,
  userId?: string,
  config?: RateLimitConfig
): Response | null {
  const identifier = getRateLimitIdentifier(req, userId)
  const result = checkRateLimit(identifier, config)

  if (!result.allowed) {
    const resetInSeconds = Math.ceil((result.resetAt - Date.now()) / 1000)

    return new Response(JSON.stringify({
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${resetInSeconds} seconds.`,
      retry_after: resetInSeconds
    }), {
      headers: {
        ...getCorsHeaders(req.headers.get('origin')),
        'Content-Type': 'application/json',
        'Retry-After': resetInSeconds.toString(),
        'X-RateLimit-Limit': config?.maxRequests.toString() || '60',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(result.resetAt).toISOString()
      },
      status: 429,
    })
  }

  return null
}

/**
 * Standard error response
 */
export function errorResponse(message: string, status: number = 500, origin?: string | null): Response {
  return new Response(JSON.stringify({ error: message }), {
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
    status,
  })
}

/**
 * Standard success response
 */
export function successResponse(data: any, origin?: string | null): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
    status: 200,
  })
}
