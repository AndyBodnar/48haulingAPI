// CORS configuration for API endpoints
// In production, replace '*' with your actual domain(s)
const ALLOWED_ORIGINS = [
  'http://localhost:3000', // Local development
  'http://localhost:3001',
  // Add your production domains here:
  // 'https://yourdomain.com',
  // 'https://admin.yourdomain.com',
]

// For development, allow all origins. For production, restrict to ALLOWED_ORIGINS
const isDevelopment = Deno.env.get('ENVIRONMENT') !== 'production'

export function getCorsHeaders(origin?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-app-version, x-platform',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400', // 24 hours
  }

  if (isDevelopment) {
    // Allow all origins in development
    headers['Access-Control-Allow-Origin'] = '*'
  } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
    // Only allow whitelisted origins in production
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  } else {
    // Default fallback for production (restrictive)
    headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGINS[0] || 'null'
  }

  return headers
}

// Legacy export for backward compatibility
export const corsHeaders = getCorsHeaders()
