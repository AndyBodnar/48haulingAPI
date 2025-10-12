# API Observability Dashboard Setup Guide

## Overview

This guide will help you set up the new API Observability Dashboard with Tyk-inspired dark theme UI, complete with:

- Real-time metrics visualization (requests, errors, duration)
- Dynamic endpoint management with dropdown menu
- Auto-generation of Supabase Edge Functions
- Interactive endpoint testing interface
- Full Supabase database integration

## Prerequisites

- Supabase project set up
- Node.js and npm installed
- Supabase CLI installed (`npm install -g supabase`)

## Setup Steps

### 1. Run Database Migrations

First, apply the new database schema for API management:

```bash
cd C:\Users\Bodna\api

# Connect to your Supabase project
supabase db push

# Or manually run the SQL file in Supabase Dashboard > SQL Editor
```

Run the SQL file `STEP5_api_management.sql` which creates:

- `api_endpoints` - Stores endpoint configurations
- `api_metrics` - Tracks all API calls and performance
- `endpoint_parameters` - Defines parameters for each endpoint
- `middleware_config` - Middleware settings per endpoint

### 2. Install Web Panel Dependencies

The required packages have already been installed:

```bash
cd web-panel
npm install  # Already done - recharts and lucide-react are installed
```

### 3. Deploy New Edge Function

Deploy the `generate-endpoint` function that auto-generates code:

```bash
# From the api directory
supabase functions deploy generate-endpoint
```

### 4. Configure Environment Variables

Ensure your `web-panel/.env.local` contains:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Start the Development Server

```bash
cd web-panel
npm run dev
```

Visit `http://localhost:3000` and you'll see the new "API Observability" tab!

## Features

### 1. API Observability Dashboard

**Location:** Main dashboard > API Observability tab

**Features:**
- Real-time metrics visualization
- Request rate gauge (req/s)
- Error rate monitoring
- HTTP status code distribution (pie chart)
- HTTP method distribution (pie chart)
- Request/Error timeline charts
- Response duration tracking
- Dark theme UI matching Tyk design

### 2. Dynamic Endpoint Management

**How to add a new endpoint:**

1. Click "Add Endpoint" button in the API Observability dashboard
2. Fill in the form:
   - **Endpoint Name**: `get-user-data` (kebab-case)
   - **Display Name**: `Get User Data` (human-readable)
   - **HTTP Method**: GET, POST, PUT, DELETE, or PATCH
   - **Description**: What the endpoint does
   - **Rate Limit**: Requests per minute (default: 60)
   - **Authentication**: Requires auth token?
   - **Required Role**: admin, driver, user, or any

3. Click "Create Endpoint"
4. The endpoint is immediately added to the database and appears in the list

### 3. Auto-Generate Supabase Functions

**How to generate a Supabase Edge Function:**

1. Click the "Play" button on any endpoint in the list
2. In the modal, click "Generate Code"
3. The system will:
   - Fetch endpoint configuration from database
   - Generate a complete TypeScript Edge Function
   - Include authentication, rate limiting, parameter validation
   - Add automatic metrics logging
4. You can:
   - **Copy** the code to clipboard
   - **Download** as a `.ts` file
   - **Deploy** using the instructions provided

**Generated code includes:**
- CORS headers
- Authentication checks
- Role-based access control
- Rate limiting integration
- Parameter validation
- Automatic metrics logging
- Error handling

### 4. Endpoint Testing Interface

**How to test an endpoint:**

1. Click the "Play" button on any endpoint
2. Enter test JSON data in the request body
3. Click "Test Endpoint"
4. View the response:
   - HTTP status code
   - Response time
   - Full JSON response
   - Copy response to clipboard

### 5. Real-Time Metrics

All API calls are automatically tracked in the `api_metrics` table:

- Endpoint name
- HTTP method
- Status code
- Response time (ms)
- User ID (if authenticated)
- Error messages
- Timestamp

The dashboard subscribes to real-time updates and automatically refreshes charts.

## Database Schema

### api_endpoints

Stores endpoint configurations:

```sql
id UUID PRIMARY KEY
name TEXT UNIQUE -- 'get-user-profile'
display_name TEXT -- 'Get User Profile'
method TEXT -- 'GET', 'POST', etc.
path TEXT -- '/get-user-profile'
description TEXT
auth_required BOOLEAN
role_required TEXT -- 'admin', 'driver', 'user', NULL
rate_limit INTEGER -- requests per minute
is_active BOOLEAN
created_at TIMESTAMPTZ
created_by UUID
updated_at TIMESTAMPTZ
```

### api_metrics

Tracks API performance:

```sql
id UUID PRIMARY KEY
endpoint_id UUID
endpoint_name TEXT
method TEXT
status_code INTEGER
response_time_ms INTEGER
user_id UUID
user_agent TEXT
ip_address TEXT
error_message TEXT
request_size_bytes INTEGER
response_size_bytes INTEGER
timestamp TIMESTAMPTZ
```

### endpoint_parameters

Defines endpoint parameters:

```sql
id UUID PRIMARY KEY
endpoint_id UUID
param_name TEXT
param_type TEXT -- 'string', 'number', 'boolean', 'array', 'object'
is_required BOOLEAN
description TEXT
default_value TEXT
validation_rule TEXT -- JSON schema or regex
created_at TIMESTAMPTZ
```

### middleware_config

Configure middleware per endpoint:

```sql
id UUID PRIMARY KEY
endpoint_id UUID
middleware_name TEXT
execution_order INTEGER
config JSONB
is_enabled BOOLEAN
created_at TIMESTAMPTZ
```

## Usage Examples

### Example 1: Create a User Profile Endpoint

1. **Add Endpoint via UI:**
   - Name: `get-user-profile`
   - Display Name: `Get User Profile`
   - Method: `GET`
   - Auth Required: Yes
   - Role: Any
   - Rate Limit: 60

2. **Generate Code:**
   - Click Play button
   - Click "Generate Code"
   - Download the generated `get-user-profile.ts`

3. **Deploy:**
   ```bash
   # Save to supabase/functions/get-user-profile/index.ts
   supabase functions deploy get-user-profile
   ```

4. **Test:**
   - Click Play button again
   - Enter test JSON: `{}`
   - Click "Test Endpoint"
   - Verify response

5. **Monitor:**
   - View real-time metrics in dashboard
   - Check request rate, errors, response times

### Example 2: Create an Admin-Only Endpoint

1. **Add Endpoint:**
   - Name: `delete-user`
   - Display Name: `Delete User`
   - Method: `DELETE`
   - Auth Required: Yes
   - Role: **admin**
   - Rate Limit: 10 (stricter for destructive ops)

2. **Generate & Deploy** as above

3. **Result:**
   - Only admin users can call this endpoint
   - Rate limited to 10 requests/minute
   - All calls logged with user info

## File Structure

```
api/
├── STEP5_api_management.sql         # Database schema
├── supabase/
│   └── functions/
│       └── generate-endpoint/       # NEW: Code generator
│           └── index.ts
└── web-panel/
    └── src/
        ├── app/
        │   ├── globals.css          # UPDATED: Dark theme
        │   └── page.tsx             # UPDATED: Added Observability tab
        └── components/
            ├── APIObservabilityDashboard.tsx  # NEW: Main dashboard
            └── EndpointTestingModal.tsx       # NEW: Testing interface
```

## Dashboard Colors

The dashboard uses a dark theme matching Tyk's design:

- **Background**: `#0f0f0f`
- **Cards**: `#1a1a1a`
- **Borders**: `#2a2a2a`
- **Primary (Success)**: `#10b981` (green)
- **Secondary**: `#3b82f6` (blue)
- **Warning**: `#f59e0b` (yellow)
- **Error**: `#ef4444` (red)
- **Purple**: `#8b5cf6`

## Troubleshooting

### Dashboard shows no metrics

**Solution:** Endpoints need to log metrics. Update existing endpoints to insert into `api_metrics` table:

```typescript
await supabase.from('api_metrics').insert({
  endpoint_name: 'your-endpoint-name',
  method: 'POST',
  status_code: 200,
  response_time_ms: Date.now() - startTime,
  user_id: user.id,
  timestamp: new Date().toISOString()
})
```

### "Generate Code" button doesn't work

**Solution:**
1. Verify `generate-endpoint` function is deployed: `supabase functions list`
2. Check you're logged in as admin user
3. View browser console for errors

### Charts show "NaN" or empty

**Solution:**
- Need actual API traffic to populate charts
- Use "Test Endpoint" button to generate test data
- Wait a few seconds for real-time updates

### Endpoint test fails with 404

**Solution:**
- The endpoint needs to be physically deployed as a Supabase function
- Adding it to the database only registers it - you must deploy the code
- Use "Generate Code" → Save file → Deploy with Supabase CLI

## Next Steps

1. **Customize Metrics:** Add custom fields to `api_metrics` table
2. **Add Middleware:** Implement middleware configurations
3. **Create Alerts:** Set up alerts for error rates
4. **Export Data:** Add export functionality for analytics
5. **Add More Charts:** Revenue, latency percentiles, etc.

## Security Notes

- All endpoints respect Row Level Security (RLS)
- Only admins can create/modify endpoints
- Rate limiting prevents abuse
- Authentication required by default
- All actions logged with user ID

## Support

For issues or questions:
1. Check Supabase logs: Dashboard > Functions > Logs
2. Check browser console for frontend errors
3. Verify database permissions (RLS policies)
4. Ensure environment variables are set

---

**Built with:**
- Next.js 15
- React 19
- Supabase
- Recharts
- Lucide Icons
- Tailwind CSS

