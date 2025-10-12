# Shared Utilities for Supabase Edge Functions

This directory contains shared utilities used across all Edge Functions.

## Files

### `cors.ts`
Handles CORS (Cross-Origin Resource Sharing) configuration.
- **Development mode**: Allows all origins (*)
- **Production mode**: Only allows whitelisted domains
- Configure `ALLOWED_ORIGINS` array with your production domains

### `rate-limiter.ts`
Simple in-memory rate limiter to prevent API abuse.
- Default: 60 requests per minute per user/IP
- Automatically cleans up expired entries
- Identifier: Uses user ID if authenticated, otherwise IP address

### `auth-helper.ts`
Authentication and authorization helper functions:
- `authenticateUser()` - Validate JWT token and check user role
- `applyRateLimit()` - Apply rate limiting to requests
- `errorResponse()` - Standardized error responses
- `successResponse()` - Standardized success responses

## Usage Examples

### Basic endpoint with auth and rate limiting:

```typescript
import { createClient } from '@supabase/supabase-js'
import { corsHeaders, getCorsHeaders } from '../_shared/cors.ts'
import { authenticateUser, applyRateLimit, successResponse, errorResponse } from '../_shared/auth-helper.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
)

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req.headers.get('origin')) })
  }

  try {
    // Authenticate user
    const { user, error: authError } = await authenticateUser(req, supabase)
    if (authError) return authError

    // Apply rate limiting
    const rateLimitError = applyRateLimit(req, user.id, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitError) return rateLimitError

    // Your business logic here
    const data = { message: 'Success', user_id: user.id }

    return successResponse(data, req.headers.get('origin'))
  } catch (error) {
    return errorResponse(error.message, 500, req.headers.get('origin'))
  }
})
```

### Admin-only endpoint:

```typescript
const { user, profile, error: authError } = await authenticateUser(req, supabase, 'admin')
if (authError) return authError
// User is confirmed to be admin
```

## Rate Limit Configs

Different endpoints can have different rate limits:

```typescript
// Stricter for expensive operations
applyRateLimit(req, user.id, { maxRequests: 10, windowMs: 60000 })

// More lenient for read operations
applyRateLimit(req, user.id, { maxRequests: 100, windowMs: 60000 })
```

## Environment Variables

Required in your Supabase project:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (admin endpoints only)
- `ENVIRONMENT` - Set to "production" for production deployments
- `GOOGLE_MAPS_API_KEY` - For route optimization
- `QUICKBOOKS_API_KEY` - For payroll integration
