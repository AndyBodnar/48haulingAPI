# Quick Deploy Guide - Phase 1
**Time Required: 15-20 minutes**

---

## Step 1: Run Database Migrations (10 minutes)

You need to run these SQL files in the Supabase SQL Editor because they require admin privileges.

### Go to Supabase SQL Editor:
**URL:** https://lnktfijmykqyejtikymu.supabase.co/project/lnktfijmykqyejtikymu/sql/new

### Run these 3 files in order:

#### 1. File Upload System
- Open: `C:\Users\Bodna\api\sql\STEP6_file_upload_system.sql`
- Copy ALL contents
- Paste into SQL Editor
- Click **"Run"**
- ✅ Should see: "Success. No rows returned"

#### 2. Push Notifications
- Open: `C:\Users\Bodna\api\sql\STEP7_push_notifications.sql`
- Copy ALL contents
- Paste into SQL Editor
- Click **"Run"**
- ✅ Should see: "Success. No rows returned"

#### 3. GPS Location Tracking
- Open: `C:\Users\Bodna\api\sql\STEP8_gps_location_tracking.sql`
- Copy ALL contents
- Paste into SQL Editor
- Click **"Run"**
- ✅ Should see: "Success. No rows returned"

---

## Step 2: Create Storage Bucket (2 minutes)

### Go to Supabase Storage:
**URL:** https://lnktfijmykqyejtikymu.supabase.co/project/lnktfijmykqyejtikymu/storage/buckets

1. Click **"New bucket"**
2. Configuration:
   - Name: `job-attachments`
   - Public bucket: ✅ **YES**
   - File size limit: `10485760` (10MB)
   - Allowed MIME types: Leave blank or add:
     - `image/jpeg`
     - `image/png`
     - `image/webp`
     - `application/pdf`
3. Click **"Create bucket"**

---

## Step 3: Set Up Push Notifications (5 minutes)

### Option A: Firebase Cloud Messaging (Recommended)

1. **Create Firebase Project:**
   - Go to: https://console.firebase.google.com
   - Click "Add project"
   - Name: "48 Hauling"
   - Disable Analytics
   - Click "Create"

2. **Get Server Key:**
   - Go to Project Settings (gear icon)
   - Click "Cloud Messaging" tab
   - Copy the **"Server key"**

3. **Add to Supabase:**
   - Go to: https://lnktfijmykqyejtikymu.supabase.co/project/lnktfijmykqyejtikymu/settings/functions
   - Add Secret:
     - Name: `FCM_SERVER_KEY`
     - Value: [paste your server key]
   - Click "Add secret"

### Option B: OneSignal (Alternative)

1. Go to: https://onesignal.com
2. Create account and new app
3. Get App ID and REST API Key
4. Add to Supabase Secrets:
   - `ONESIGNAL_APP_ID`
   - `ONESIGNAL_API_KEY`

---

## Step 4: Deploy Edge Functions (3 minutes)

Run these commands from your API directory:

```bash
cd C:\Users\Bodna\api

# File upload functions
npx supabase functions deploy upload-attachment
npx supabase functions deploy get-job-attachments
npx supabase functions deploy delete-attachment

# Push notification functions
npx supabase functions deploy register-device-token
npx supabase functions deploy send-notification
npx supabase functions deploy get-notifications

# GPS tracking functions
npx supabase functions deploy update-location
npx supabase functions deploy get-driver-location
npx supabase functions deploy get-location-history
```

---

## Step 5: Verify Deployment (2 minutes)

### Run this query in Supabase SQL Editor:

```sql
-- Check if tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('job_attachments', 'location_history');
-- Should return 2 rows

-- Check if columns were added
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('push_token', 'push_platform', 'notifications_enabled');
-- Should return 3 rows

-- Check if functions were created
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_latest_driver_locations', 'calculate_distance_miles', 'get_route_stats');
-- Should return 3 rows

-- Check storage bucket
SELECT * FROM storage.buckets WHERE name = 'job-attachments';
-- Should return 1 row with public = true
```

### Check Edge Functions:
- Go to: https://lnktfijmykqyejtikymu.supabase.co/project/lnktfijmykqyejtikymu/functions
- You should see 9 new functions listed

---

## ✅ You're Done!

After completing these steps:
- ✅ Your API is now 100% core complete
- ✅ You have 24 Edge Functions (was 15)
- ✅ You have 15 database tables (was 13)
- ✅ File uploads work (photos, signatures, PDFs)
- ✅ Push notifications configured
- ✅ GPS tracking enabled

---

## 🚀 What's Next?

**Phase 2:** Enhanced Features
- Loads management with pickup/delivery details
- Messaging system (admin ↔ driver)
- DVIR system for vehicle inspections

**Phase 3:** Mobile App Development

---

## 🐛 Troubleshooting

### "Table already exists" error
- This is OK! It means the table was created previously
- The migration uses `CREATE TABLE IF NOT EXISTS`

### "Bucket already exists" error
- Skip bucket creation if it already exists
- Verify it's set to public in Storage settings

### Push notifications not working
- Verify FCM_SERVER_KEY is set in Edge Functions settings
- Check that the key is correct in Firebase Console
- Ensure Cloud Messaging API is enabled

### Functions not deploying
- Make sure you're in the `C:\Users\Bodna\api` directory
- Check that the function folders exist in `supabase/functions/`
- Try: `npx supabase login` first if auth issues

---

**Your Supabase Project:** lnktfijmykqyejtikymu
**Project URL:** https://lnktfijmykqyejtikymu.supabase.co
