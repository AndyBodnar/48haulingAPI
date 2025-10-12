# Deployment Guide

Step-by-step guide to deploy the Delivery API Hub to Supabase.

## Prerequisites

1. **Supabase Account** - Sign up at [supabase.com](https://supabase.com)
2. **Supabase CLI** - Install globally:
   ```bash
   npm install -g supabase
   ```
3. **Node.js & npm** - For web panel deployment

## Step 1: Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name**: `delivery-api-hub`
   - **Database Password**: (save this securely)
   - **Region**: Choose closest to your users
4. Wait for project initialization (~2 minutes)

## Step 2: Get Project Credentials

1. Go to **Project Settings** > **API**
2. Copy these values:
   - `Project URL` → SUPABASE_URL
   - `anon public` key → SUPABASE_ANON_KEY
   - `service_role` key → SUPABASE_SERVICE_ROLE_KEY (keep secret!)

## Step 3: Link Local Project to Supabase

```bash
cd C:\Users\Bodna\api

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Get project ref from project URL: https://YOUR_PROJECT_REF.supabase.co
```

## Step 4: Run Database Migrations

```bash
# Push all migrations to Supabase
supabase db push

# Or run migrations manually in Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Paste contents of each migration file
# 3. Run in order:
#    - 20250101000000_initial_schema.sql
#    - 20250101000001_seed_data.sql
#    - 20250101000002_realtime_config.sql
```

## Step 5: Configure Secrets

```bash
# Set environment variables for Edge Functions
supabase secrets set GOOGLE_MAPS_API_KEY=your_google_maps_key
supabase secrets set QUICKBOOKS_API_KEY=your_quickbooks_key
supabase secrets set ENVIRONMENT=production

# List secrets to verify
supabase secrets list
```

## Step 6: Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy heartbeat
supabase functions deploy log-error
supabase functions deploy report-issue
supabase functions deploy get-optimized-route
supabase functions deploy submit-payroll
supabase functions deploy check-app-version
supabase functions deploy create-job
supabase functions deploy assign-job
supabase functions deploy update-job-status
supabase functions deploy get-users
supabase functions deploy update-user-role
supabase functions deploy track-analytics
supabase functions deploy get-dashboard-stats

# Or deploy all at once
supabase functions deploy --project-ref YOUR_PROJECT_REF
```

## Step 7: Enable Realtime

1. Go to **Database** > **Replication**
2. Find `supabase_realtime` publication
3. Enable tables:
   - ✅ device_status
   - ✅ jobs
   - ✅ error_logs
   - ✅ reported_issues

Or run the SQL from migration file `20250101000002_realtime_config.sql`

## Step 8: Create Admin User

1. Go to **Authentication** > **Users**
2. Click "Add user" > "Create new user"
3. Enter email and password
4. After user is created, go to **SQL Editor**
5. Run:
   ```sql
   UPDATE profiles
   SET role = 'admin'
   WHERE email = 'your-admin@email.com';
   ```

## Step 9: Deploy Web Admin Panel

### Option A: Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import repository: `api/web-panel`
4. Set environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
5. Deploy

### Option B: Deploy to Netlify

1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Import repository
4. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
5. Environment variables (same as Vercel)
6. Deploy

### Option C: Self-host with PM2

```bash
cd web-panel

# Install dependencies
npm install

# Build
npm run build

# Start with PM2
pm2 start npm --name "admin-panel" -- start
pm2 save
pm2 startup
```

## Step 10: Configure CORS

Update `supabase/functions/_shared/cors.ts`:

```typescript
const ALLOWED_ORIGINS = [
  'https://your-admin-panel-domain.com',
  'https://your-production-domain.com',
]
```

Redeploy functions:
```bash
supabase functions deploy
```

## Step 11: Test Everything

### Test Database
```bash
# Run in Supabase SQL Editor
SELECT * FROM profiles;
SELECT * FROM jobs;
```

### Test Edge Functions
```bash
# Test heartbeat
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/heartbeat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"app_type":"mobile"}'
```

### Test Admin Panel
1. Navigate to your deployed web panel
2. Login with admin credentials
3. Check all tabs work:
   - Live Status
   - Error Logs
   - User Issues

## Step 12: Monitor & Maintain

### View Logs
```bash
# View function logs
supabase functions logs heartbeat --project-ref YOUR_PROJECT_REF

# Or in Dashboard: Edge Functions > Select Function > Logs
```

### Monitor Performance
- **Database**: Dashboard > Database > Performance
- **Auth**: Dashboard > Authentication
- **Functions**: Dashboard > Edge Functions
- **Realtime**: Dashboard > Database > Replication

### Backup Strategy
Supabase automatically backs up your database daily. To export:

```bash
# Export database
supabase db dump --project-ref YOUR_PROJECT_REF > backup.sql

# Export specific table
supabase db dump --table profiles > profiles_backup.sql
```

## Troubleshooting

### Issue: Functions returning 401 Unauthorized
**Solution**: Check JWT token is valid and not expired

### Issue: CORS errors in mobile app
**Solution**: Add your domains to ALLOWED_ORIGINS in cors.ts

### Issue: Realtime not working
**Solution**: Check tables are added to supabase_realtime publication

### Issue: Database migrations failing
**Solution**: Run migrations one at a time and check for errors

### Issue: Rate limiting too strict
**Solution**: Adjust rate limit configs in respective function files

## Production Checklist

- [ ] All migrations applied
- [ ] All functions deployed
- [ ] Secrets configured
- [ ] Admin user created
- [ ] Web panel deployed
- [ ] CORS configured for production domains
- [ ] Realtime enabled for required tables
- [ ] Environment variables set correctly
- [ ] API tested end-to-end
- [ ] Mobile SDK integrated
- [ ] Monitoring set up
- [ ] Backup strategy in place

## Estimated Costs

**Supabase Free Tier:**
- 500MB database
- 2GB bandwidth
- 500K Edge Function invocations
- Perfect for development & small deployments

**Supabase Pro ($25/month):**
- 8GB database
- 250GB bandwidth
- 2M Edge Function invocations
- Recommended for production

**Google Maps API:**
- Routes: ~$5 per 1000 requests
- Monitor usage in Google Cloud Console

## Next Steps

1. Integrate mobile app with SDK
2. Set up monitoring alerts
3. Configure custom domain
4. Enable 2FA for admin users
5. Set up staging environment
