# API Endpoints Overview

Complete list of all available endpoints in the Delivery API Hub.

## Authentication Endpoints
*Handled by Supabase Auth directly*

- **Sign Up**: `supabase.auth.signUp({ email, password })`
- **Sign In**: `supabase.auth.signInWithPassword({ email, password })`
- **Sign Out**: `supabase.auth.signOut()`
- **Get User**: `supabase.auth.getUser()`

## Edge Function Endpoints

### 📱 Mobile App Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/heartbeat` | POST | ✅ Yes | Keep-alive ping from mobile/web app |
| `/log-error` | POST | ✅ Yes | Automatic crash/error reporting |
| `/report-issue` | POST | ✅ Yes | User-submitted bug reports |
| `/check-app-version` | POST | ❌ No | Check for app updates |
| `/get-optimized-route` | POST | ✅ Yes | Get navigation route (Google Maps) |
| `/update-job-status` | POST | ✅ Yes (Driver) | Update job progress |
| `/track-analytics` | POST | ✅ Yes | Track user behavior/events |

### 🔧 Admin Panel Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/get-dashboard-stats` | GET | ✅ Yes (Admin) | Dashboard statistics |
| `/get-users` | GET | ✅ Yes (Admin) | List all users |
| `/update-user-role` | POST | ✅ Yes (Admin) | Change user role |
| `/create-job` | POST | ✅ Yes (Admin) | Create new delivery job |
| `/assign-job` | POST | ✅ Yes (Admin) | Assign job to driver |
| `/submit-payroll` | POST | ✅ Yes (Admin) | Process payroll (QuickBooks) |

## Direct Database Access (via Supabase Client)

All tables have Row Level Security (RLS) policies configured.

### Tables

- **profiles** - User profiles (extends auth.users)
- **jobs** - Delivery jobs
- **time_logs** - Driver time tracking
- **device_status** - Online/offline status
- **error_logs** - Application errors
- **reported_issues** - User-reported bugs
- **app_versions** - Version management
- **analytics_events** - Usage analytics

### Real-time Subscriptions

Enabled for:
- `device_status` - Live online/offline updates
- `jobs` - Live job updates
- `error_logs` - Real-time error monitoring
- `reported_issues` - Live issue tracking

## Rate Limiting

- **Default**: 60 requests/minute per user
- **Strict endpoints** (expensive operations): 10 requests/minute
- **Lenient endpoints** (read operations): 100 requests/minute

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error message"
}
```

### Rate Limit Response (HTTP 429)
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "retry_after": 45
}
```

## Environment Variables Required

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# External Services
GOOGLE_MAPS_API_KEY=your-google-maps-key
QUICKBOOKS_API_KEY=your-quickbooks-key

# Configuration
ENVIRONMENT=development|production
```

## Testing

Use tools like:
- **Postman** - API testing
- **Bruno** - Open-source Postman alternative
- **cURL** - Command line testing
- **Insomnia** - REST client

Example cURL:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/heartbeat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"app_type": "mobile"}'
```

## Next Steps

1. Deploy to Supabase (see DEPLOYMENT.md)
2. Configure environment variables
3. Run database migrations
4. Test all endpoints
5. Integrate mobile SDK
