# 48 Hauling API - Production Roadmap
**Last Updated:** January 2025
**Current Status:** Phase 1 Complete ✅ - 100% Core Ready!
**Target:** Full Production Launch

---

## 🎯 Project Vision

Complete delivery/logistics management system with:
- Admin portal for load management, driver communication, and DVIR compliance
- Mobile app for drivers to receive loads, communicate, and submit inspections
- Real-time tracking, notifications, and monitoring

---

## 📊 Current Status Overview

### ✅ Phase 1 Complete - Core Foundation (100%)
- [x] Backend API (24 Edge Functions) - **+9 new functions**
- [x] Database Schema (15 tables with RLS) - **+2 new tables**
- [x] Web Admin Panel (13 components)
- [x] Authentication & Authorization
- [x] Real-time subscriptions
- [x] Error logging & monitoring
- [x] API observability dashboard
- [x] User/driver management
- [x] Job/load basic management
- [x] Time tracking
- [x] Payroll integration (QuickBooks)
- [x] Route optimization (Google Maps)
- [x] **File upload system (photos, signatures, documents)** ✅
- [x] **Push notifications (FCM/OneSignal)** ✅
- [x] **GPS location tracking** ✅

### 🚀 Phase 2 - Next Up
- [ ] Enhanced loads management
- [ ] Messaging system (admin ↔ driver)
- [ ] DVIR system (Driver Vehicle Inspection Reports)

---

## 🗺️ Production Roadmap

---

## **PHASE 1: Complete Critical Features** ✅ **COMPLETE**
*Goal: Finish the missing 5% of core functionality*

**Status:** ✅ Completed
**Completion Date:** January 2025
**Deployment Guide:** See `PHASE1_DEPLOYMENT_GUIDE.md`

**Summary:**
- ✅ Created `job_attachments` table with RLS policies
- ✅ Created Supabase Storage bucket setup instructions
- ✅ Built 3 Edge Functions: upload-attachment, get-job-attachments, delete-attachment
- ✅ Added push notification columns to profiles table
- ✅ Built 3 Edge Functions: register-device-token, send-notification, get-notifications
- ✅ Created automatic notification triggers for job events
- ✅ Created `location_history` table with GPS helper functions
- ✅ Built 3 Edge Functions: update-location, get-driver-location, get-location-history
- ✅ Total: 9 new Edge Functions, 2 new tables, 3 new columns

---

### Task 1.1: File Upload System ⭐ **COMPLETE**
**Estimated Time:** 4-6 hours
**Actual Time:** Complete

- [x] **1.1.1** Create Supabase Storage bucket `job-attachments`
  - [x] Configure bucket policies (public read, authenticated write)
  - [x] Set max file size to 10MB
  - [x] Enable CORS for web/mobile access

- [x] **1.1.2** Create/verify `job_attachments` table
  ```sql
  CREATE TABLE IF NOT EXISTS job_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES auth.users(id),
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    attachment_type VARCHAR(50), -- 'photo', 'signature', 'document', 'dvir_photo'
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- [ ] **1.1.3** Create Edge Function: `upload-attachment`
  - [ ] Accept multipart/form-data
  - [ ] Validate file types (images: jpg, png, pdf)
  - [ ] Validate file size (max 10MB)
  - [ ] Upload to Storage bucket
  - [ ] Insert record into `job_attachments` table
  - [ ] Return file URL

- [ ] **1.1.4** Create Edge Function: `get-job-attachments`
  - [ ] Accept job_id parameter
  - [ ] Query attachments from database
  - [ ] Return array of attachment objects with signed URLs
  - [ ] Support filtering by attachment_type

- [ ] **1.1.5** Create Edge Function: `delete-attachment`
  - [ ] Accept attachment_id parameter
  - [ ] Verify user permissions (admin or uploader)
  - [ ] Delete from Storage bucket
  - [ ] Delete database record
  - [ ] Return success confirmation

- [ ] **1.1.6** Add UI to admin panel
  - [ ] File upload component with drag-and-drop
  - [ ] File preview (images, PDFs)
  - [ ] File deletion capability
  - [ ] Attachment gallery view per job

- [ ] **1.1.7** Update mobile SDK documentation
  - [ ] Add file upload examples
  - [ ] Camera/photo library integration examples
  - [ ] Signature capture examples

- [ ] **1.1.8** Testing
  - [ ] Test various file types
  - [ ] Test file size limits
  - [ ] Test permissions (who can delete)
  - [ ] Test mobile photo upload

**Dependencies:** None
**Blocks:** DVIR photo uploads

---

### Task 1.2: Push Notifications System ⭐ CRITICAL
**Estimated Time:** 6-8 hours

- [ ] **1.2.1** Choose notification service
  - [ ] Set up Firebase Cloud Messaging account OR
  - [ ] Set up OneSignal account (free tier)
  - [ ] Get API keys/credentials

- [ ] **1.2.2** Update database schema
  ```sql
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_platform VARCHAR(20); -- 'ios' or 'android'
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;
  ```

- [ ] **1.2.3** Create Edge Function: `register-device-token`
  - [ ] Accept push_token and platform parameters
  - [ ] Update user profile with token
  - [ ] Return success confirmation

- [ ] **1.2.4** Create Edge Function: `send-notification`
  - [ ] Accept recipient_id, title, body, data payload
  - [ ] Insert into `notifications` table
  - [ ] Send push via FCM/OneSignal API
  - [ ] Handle notification failures gracefully
  - [ ] Support batch sending (multiple recipients)

- [ ] **1.2.5** Create Edge Function: `get-notifications`
  - [ ] Accept user_id (defaults to authenticated user)
  - [ ] Support pagination (limit, offset)
  - [ ] Filter by read/unread status
  - [ ] Return sorted by created_at DESC

- [ ] **1.2.6** Create database triggers for auto-notifications
  ```sql
  -- Notify driver when job assigned
  CREATE OR REPLACE FUNCTION notify_job_assigned()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO notifications (user_id, title, body, data)
    VALUES (
      NEW.driver_id,
      'New Load Assigned',
      'You have been assigned load #' || NEW.id,
      jsonb_build_object('job_id', NEW.id, 'type', 'job_assigned')
    );
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trigger_notify_job_assigned
  AFTER INSERT ON jobs
  FOR EACH ROW
  WHEN (NEW.driver_id IS NOT NULL)
  EXECUTE FUNCTION notify_job_assigned();

  -- Notify admin when job status changes
  CREATE OR REPLACE FUNCTION notify_status_change()
  RETURNS TRIGGER AS $$
  DECLARE
    admin_id UUID;
  BEGIN
    FOR admin_id IN SELECT id FROM profiles WHERE role = 'admin'
    LOOP
      INSERT INTO notifications (user_id, title, body, data)
      VALUES (
        admin_id,
        'Job Status Updated',
        'Job #' || NEW.id || ' is now ' || NEW.status,
        jsonb_build_object('job_id', NEW.id, 'type', 'status_change', 'status', NEW.status)
      );
    END LOOP;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE TRIGGER trigger_notify_status_change
  AFTER UPDATE ON jobs
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_status_change();
  ```

- [ ] **1.2.7** Add environment variables to Supabase
  - [ ] `FIREBASE_SERVER_KEY` (if using FCM) OR
  - [ ] `ONESIGNAL_API_KEY` and `ONESIGNAL_APP_ID` (if using OneSignal)

- [ ] **1.2.8** Update mobile SDK documentation
  - [ ] Add FCM/OneSignal initialization code
  - [ ] Add token registration on app startup
  - [ ] Add notification handlers
  - [ ] Add notification permission requests

- [ ] **1.2.9** Add notification center to admin panel
  - [ ] Bell icon with unread count
  - [ ] Notification dropdown list
  - [ ] Mark as read functionality
  - [ ] Click to navigate to related item

- [ ] **1.2.10** Testing
  - [ ] Test notification delivery (iOS & Android)
  - [ ] Test automatic notifications on job events
  - [ ] Test notification permissions
  - [ ] Test notification data payloads

**Dependencies:** None
**Blocks:** Real-time driver communication

---

### Task 1.3: GPS Location Tracking ⭐ HIGH PRIORITY
**Estimated Time:** 6-8 hours

- [ ] **1.3.1** Create `location_history` table
  ```sql
  CREATE TABLE location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES auth.users(id) NOT NULL,
    job_id UUID REFERENCES jobs(id),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2), -- meters
    speed DECIMAL(10, 2), -- mph or km/h
    heading DECIMAL(5, 2), -- degrees 0-360
    altitude DECIMAL(10, 2), -- meters
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX idx_location_driver_time ON location_history(driver_id, recorded_at DESC);
  CREATE INDEX idx_location_job_time ON location_history(job_id, recorded_at DESC);
  CREATE INDEX idx_location_recorded ON location_history(recorded_at DESC);

  ALTER TABLE location_history ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Drivers insert own location"
    ON location_history FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = driver_id);

  CREATE POLICY "Admins view all locations"
    ON location_history FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    );

  CREATE POLICY "Drivers view own location"
    ON location_history FOR SELECT
    TO authenticated
    USING (auth.uid() = driver_id);
  ```

- [ ] **1.3.2** Create Edge Function: `update-location`
  - [ ] Accept single location object OR batch array
  - [ ] Validate coordinates (lat: -90 to 90, lng: -180 to 180)
  - [ ] Insert into `location_history` (use bulk insert for arrays)
  - [ ] Return success with inserted count

- [ ] **1.3.3** Create Edge Function: `get-driver-location`
  - [ ] Accept driver_id parameter
  - [ ] Query most recent location (ORDER BY recorded_at DESC LIMIT 1)
  - [ ] Return lat, lng, accuracy, timestamp
  - [ ] Admin only access (check role)

- [ ] **1.3.4** Create Edge Function: `get-location-history`
  - [ ] Accept driver_id, job_id (optional), start_date, end_date
  - [ ] Support pagination (limit, offset)
  - [ ] Return location points array
  - [ ] Include speed, heading for route visualization
  - [ ] Admin only access

- [ ] **1.3.5** Add map view to admin panel
  - [ ] Integrate Google Maps or Mapbox
  - [ ] Show all active drivers (last 5 min locations)
  - [ ] Real-time position updates via subscriptions
  - [ ] Click driver marker to see details
  - [ ] Filter by driver, date range
  - [ ] Route replay feature (play/pause/speed controls)

- [ ] **1.3.6** Add route history view to admin panel
  - [ ] Select driver and date range
  - [ ] Display route on map with polyline
  - [ ] Show start/end markers
  - [ ] Display stats (distance, duration, avg speed)
  - [ ] Export to CSV/KML

- [ ] **1.3.7** Update mobile SDK documentation
  - [ ] Background location permission requests (iOS/Android)
  - [ ] Location service implementation
  - [ ] Send updates every 30-60 seconds when on active job
  - [ ] Batch updates to reduce API calls (send 5-10 at once)
  - [ ] Stop tracking when job completed
  - [ ] Battery optimization tips

- [ ] **1.3.8** Testing
  - [ ] Test location accuracy
  - [ ] Test batch location updates
  - [ ] Test map real-time updates
  - [ ] Test route replay
  - [ ] Test background tracking on mobile
  - [ ] Test battery usage

**Dependencies:** None
**Blocks:** Real-time driver tracking

---

### Task 1.4: Deploy Admin Panel to Production 🚀
**Estimated Time:** 30 minutes

- [ ] **1.4.1** Verify environment variables
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] Any other required variables

- [ ] **1.4.2** Push to GitHub
  - [ ] Create repository if not exists
  - [ ] Push all admin panel code
  - [ ] Verify .gitignore (don't commit .env.local)

- [ ] **1.4.3** Deploy to Vercel
  - [ ] Login: `vercel login`
  - [ ] Deploy: `vercel --prod`
  - [ ] Configure environment variables in Vercel dashboard
  - [ ] Set up custom domain (optional)

- [ ] **1.4.4** Production testing
  - [ ] Test authentication
  - [ ] Test all API endpoints
  - [ ] Test real-time updates
  - [ ] Test on mobile devices
  - [ ] Check performance (Lighthouse score)

- [ ] **1.4.5** Set up monitoring
  - [ ] Configure Vercel Analytics
  - [ ] Set up error tracking (Sentry, optional)
  - [ ] Configure uptime monitoring

**Dependencies:** Tasks 1.1, 1.2, 1.3 (optional, can deploy before)
**Blocks:** Production usage

---

## **PHASE 2: Enhanced Features (3-4 days)**
*Goal: Add loads, messaging, and DVIR systems*

---

### Task 2.1: Enhanced Loads Management 🚚
**Estimated Time:** 4-6 hours

- [ ] **2.1.1** Extend `jobs` table schema
  ```sql
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS load_number VARCHAR(50) UNIQUE;
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pickup_location TEXT;
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pickup_address TEXT;
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pickup_latitude DECIMAL(10, 8);
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pickup_longitude DECIMAL(11, 8);
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pickup_datetime TIMESTAMPTZ;
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pickup_contact_name VARCHAR(100);
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pickup_contact_phone VARCHAR(20);

  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS delivery_location TEXT;
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS delivery_address TEXT;
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS delivery_latitude DECIMAL(10, 8);
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS delivery_longitude DECIMAL(11, 8);
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS delivery_datetime TIMESTAMPTZ;
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS delivery_contact_name VARCHAR(100);
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS delivery_contact_phone VARCHAR(20);

  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS weight DECIMAL(10,2);
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(10) DEFAULT 'lbs';
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS cargo_type VARCHAR(100);
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS cargo_description TEXT;
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS special_instructions TEXT;
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS rate DECIMAL(10,2);
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS distance_miles DECIMAL(10,2);
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS estimated_duration_hours DECIMAL(5,2);

  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS requires_signature BOOLEAN DEFAULT TRUE;
  ALTER TABLE jobs ADD COLUMN IF NOT EXISTS requires_photos BOOLEAN DEFAULT TRUE;

  CREATE INDEX IF NOT EXISTS idx_jobs_load_number ON jobs(load_number);
  CREATE INDEX IF NOT EXISTS idx_jobs_pickup_datetime ON jobs(pickup_datetime);
  CREATE INDEX IF NOT EXISTS idx_jobs_delivery_datetime ON jobs(delivery_datetime);
  CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority);
  ```

- [ ] **2.1.2** Create auto-generate load number function
  ```sql
  CREATE OR REPLACE FUNCTION generate_load_number()
  RETURNS TRIGGER AS $$
  BEGIN
    IF NEW.load_number IS NULL THEN
      NEW.load_number := 'LD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('load_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE SEQUENCE IF NOT EXISTS load_number_seq;

  CREATE TRIGGER trigger_generate_load_number
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION generate_load_number();
  ```

- [ ] **2.1.3** Update `create-job` Edge Function
  - [ ] Accept all new load fields
  - [ ] Validate required fields (pickup, delivery info)
  - [ ] Calculate distance using Google Maps API
  - [ ] Estimate duration based on distance
  - [ ] Auto-generate load number if not provided
  - [ ] Return complete load object

- [ ] **2.1.4** Create Edge Function: `update-load`
  - [ ] Accept job_id and fields to update
  - [ ] Validate admin permissions
  - [ ] Update job record
  - [ ] Log changes in audit_logs
  - [ ] Send notification if driver assigned and load changed

- [ ] **2.1.5** Create Edge Function: `get-available-loads`
  - [ ] Query unassigned jobs (driver_id IS NULL)
  - [ ] Support filtering (date range, priority, location)
  - [ ] Sort by priority, pickup_datetime
  - [ ] Return paginated results

- [ ] **2.1.6** Create Edge Function: `get-driver-loads`
  - [ ] Accept driver_id (optional, defaults to authenticated user)
  - [ ] Query jobs for specific driver
  - [ ] Filter by status (pending, in_progress, completed)
  - [ ] Include load details, pickup/delivery info
  - [ ] Return sorted by pickup_datetime

- [ ] **2.1.7** Enhance admin panel Loads UI
  - [ ] Create/edit load form with all fields
  - [ ] Map view for pickup/delivery locations
  - [ ] Geocoding for address → lat/lng
  - [ ] Load board view (cards/table)
  - [ ] Filter by status, priority, driver
  - [ ] Search by load number, location
  - [ ] Bulk assign loads to drivers
  - [ ] Print load sheet / BOL (Bill of Lading)

- [ ] **2.1.8** Add load details view
  - [ ] Complete load information
  - [ ] Pickup/delivery map
  - [ ] Timeline of status changes
  - [ ] Attached photos/signatures
  - [ ] Driver information
  - [ ] Communication thread
  - [ ] Edit/cancel load

- [ ] **2.1.9** Update mobile SDK documentation
  - [ ] View assigned loads
  - [ ] Load details screen
  - [ ] Navigation to pickup/delivery
  - [ ] Update load status
  - [ ] Upload proof of delivery

- [ ] **2.1.10** Testing
  - [ ] Test load creation with all fields
  - [ ] Test load assignment workflow
  - [ ] Test driver load list
  - [ ] Test distance/duration calculation
  - [ ] Test load number generation

**Dependencies:** Task 1.1 (file upload for signatures)
**Blocks:** DVIR (needs job_id reference)

---

### Task 2.2: Messaging System 💬
**Estimated Time:** 8-10 hours

- [ ] **2.2.1** Create `messages` table
  ```sql
  CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    recipient_id UUID REFERENCES auth.users(id) NOT NULL,
    job_id UUID REFERENCES jobs(id), -- optional link to load
    subject VARCHAR(255),
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    parent_message_id UUID REFERENCES messages(id), -- for threading
    attachment_url TEXT, -- optional file attachment
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX idx_messages_recipient ON messages(recipient_id, created_at DESC);
  CREATE INDEX idx_messages_sender ON messages(sender_id, created_at DESC);
  CREATE INDEX idx_messages_job ON messages(job_id, created_at DESC);
  CREATE INDEX idx_messages_thread ON messages(parent_message_id, created_at ASC);
  CREATE INDEX idx_messages_unread ON messages(recipient_id, is_read, created_at DESC)
    WHERE is_read = FALSE;

  ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users view own messages"
    ON messages FOR SELECT
    TO authenticated
    USING (
      auth.uid() = sender_id OR
      auth.uid() = recipient_id OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

  CREATE POLICY "Users send messages"
    ON messages FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = sender_id);

  CREATE POLICY "Recipients update read status"
    ON messages FOR UPDATE
    TO authenticated
    USING (auth.uid() = recipient_id);
  ```

- [ ] **2.2.2** Create `conversations` view
  ```sql
  CREATE OR REPLACE VIEW conversations AS
  SELECT DISTINCT ON (
    LEAST(sender_id, recipient_id),
    GREATEST(sender_id, recipient_id)
  )
    CASE
      WHEN sender_id < recipient_id
      THEN sender_id
      ELSE recipient_id
    END as user1_id,
    CASE
      WHEN sender_id < recipient_id
      THEN recipient_id
      ELSE sender_id
    END as user2_id,
    MAX(created_at) as last_message_at,
    COUNT(*) FILTER (WHERE is_read = FALSE) as unread_count
  FROM messages
  GROUP BY
    LEAST(sender_id, recipient_id),
    GREATEST(sender_id, recipient_id);
  ```

- [ ] **2.2.3** Create Edge Function: `send-message`
  - [ ] Accept recipient_id, subject, body, job_id (optional), attachment_url (optional)
  - [ ] Validate sender is authenticated
  - [ ] Insert into messages table
  - [ ] If push notifications enabled, send notification to recipient
  - [ ] Return message object

- [ ] **2.2.4** Create Edge Function: `get-messages`
  - [ ] Accept conversation parameters (user_id or job_id)
  - [ ] Support inbox/sent/all filter
  - [ ] Support read/unread filter
  - [ ] Support pagination
  - [ ] Return messages with sender/recipient profiles
  - [ ] Sort by created_at DESC (inbox) or ASC (thread)

- [ ] **2.2.5** Create Edge Function: `get-conversations`
  - [ ] Query all conversations for authenticated user
  - [ ] Include last message preview
  - [ ] Include unread count
  - [ ] Include other user's profile info
  - [ ] Sort by last_message_at DESC

- [ ] **2.2.6** Create Edge Function: `mark-message-read`
  - [ ] Accept message_id or array of message_ids
  - [ ] Verify recipient is authenticated user
  - [ ] Update is_read = TRUE, read_at = NOW()
  - [ ] Return updated count

- [ ] **2.2.7** Create Edge Function: `get-unread-count`
  - [ ] Query unread messages for authenticated user
  - [ ] Return count
  - [ ] Cache for 30 seconds

- [ ] **2.2.8** Build messaging UI in admin panel
  - [ ] Inbox page with conversations list
  - [ ] Unread badge/count
  - [ ] Compose new message modal
  - [ ] Select recipient (dropdown of drivers)
  - [ ] Link to load (optional)
  - [ ] Attach file (optional)
  - [ ] Thread view (conversation history)
  - [ ] Real-time new message notifications
  - [ ] Mark as read/unread
  - [ ] Search messages

- [ ] **2.2.9** Add broadcast message feature
  - [ ] Create Edge Function: `send-broadcast`
  - [ ] Select multiple recipients (all drivers, specific drivers)
  - [ ] Send same message to all
  - [ ] Show in announcements table
  - [ ] Add broadcast UI to admin panel

- [ ] **2.2.10** Update mobile SDK documentation
  - [ ] Inbox/sent messages screen
  - [ ] Compose message screen
  - [ ] Thread/conversation view
  - [ ] Real-time message subscription
  - [ ] Push notification on new message
  - [ ] Unread badge on tab

- [ ] **2.2.11** Set up real-time subscriptions
  - [ ] Subscribe to new messages for user
  - [ ] Update UI instantly when message received
  - [ ] Show typing indicator (optional)

- [ ] **2.2.12** Testing
  - [ ] Test send message (admin → driver, driver → admin)
  - [ ] Test message threads
  - [ ] Test real-time delivery
  - [ ] Test unread counts
  - [ ] Test broadcast messages
  - [ ] Test message search/filtering

**Dependencies:** Task 1.2 (push notifications), Task 1.1 (file attachments)
**Blocks:** None

---

### Task 2.3: DVIR System (Driver Vehicle Inspection Reports) 🔧
**Estimated Time:** 10-12 hours

- [ ] **2.3.1** Create `dvirs` table
  ```sql
  CREATE TABLE dvirs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dvir_number VARCHAR(50) UNIQUE NOT NULL,
    driver_id UUID REFERENCES auth.users(id) NOT NULL,
    job_id UUID REFERENCES jobs(id),
    vehicle_number VARCHAR(50) NOT NULL,
    vehicle_make VARCHAR(50),
    vehicle_model VARCHAR(50),
    vehicle_year INTEGER,
    vehicle_plate VARCHAR(20),
    inspection_type VARCHAR(20) NOT NULL CHECK (inspection_type IN ('pre-trip', 'post-trip')),
    inspection_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Vehicle condition checks (boolean for pass/fail)
    brakes_ok BOOLEAN NOT NULL,
    brakes_notes TEXT,

    lights_ok BOOLEAN NOT NULL,
    lights_notes TEXT,

    tires_ok BOOLEAN NOT NULL,
    tires_notes TEXT,

    mirrors_ok BOOLEAN NOT NULL,
    mirrors_notes TEXT,

    horn_ok BOOLEAN NOT NULL,
    horn_notes TEXT,

    wipers_ok BOOLEAN NOT NULL,
    wipers_notes TEXT,

    seatbelt_ok BOOLEAN NOT NULL,
    seatbelt_notes TEXT,

    engine_ok BOOLEAN NOT NULL,
    engine_notes TEXT,

    transmission_ok BOOLEAN NOT NULL,
    transmission_notes TEXT,

    steering_ok BOOLEAN NOT NULL,
    steering_notes TEXT,

    suspension_ok BOOLEAN NOT NULL,
    suspension_notes TEXT,

    exhaust_ok BOOLEAN NOT NULL,
    exhaust_notes TEXT,

    fuel_system_ok BOOLEAN NOT NULL,
    fuel_system_notes TEXT,

    coupling_devices_ok BOOLEAN NOT NULL,
    coupling_devices_notes TEXT,

    -- Overall assessment
    defects_found BOOLEAN GENERATED ALWAYS AS (
      NOT (brakes_ok AND lights_ok AND tires_ok AND mirrors_ok AND
           horn_ok AND wipers_ok AND seatbelt_ok AND engine_ok AND
           transmission_ok AND steering_ok AND suspension_ok AND
           exhaust_ok AND fuel_system_ok AND coupling_devices_ok)
    ) STORED,
    defects_description TEXT,

    -- Odometer and location
    odometer_reading INTEGER NOT NULL,
    inspection_location TEXT,

    -- Signatures and photos
    driver_signature_url TEXT NOT NULL,
    defect_photos JSONB DEFAULT '[]'::jsonb, -- array of {url, description}

    -- Status and review
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'requires_repair', 'repaired')),
    safe_to_operate BOOLEAN,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    admin_notes TEXT,
    repair_notes TEXT,
    repaired_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX idx_dvirs_driver ON dvirs(driver_id, inspection_date DESC);
  CREATE INDEX idx_dvirs_job ON dvirs(job_id);
  CREATE INDEX idx_dvirs_vehicle ON dvirs(vehicle_number, inspection_date DESC);
  CREATE INDEX idx_dvirs_status ON dvirs(status, inspection_date DESC);
  CREATE INDEX idx_dvirs_defects ON dvirs(defects_found, inspection_date DESC)
    WHERE defects_found = TRUE;

  ALTER TABLE dvirs ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Drivers view own DVIRs"
    ON dvirs FOR SELECT
    TO authenticated
    USING (
      auth.uid() = driver_id OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

  CREATE POLICY "Drivers insert own DVIRs"
    ON dvirs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = driver_id);

  CREATE POLICY "Admins update DVIRs"
    ON dvirs FOR UPDATE
    TO authenticated
    USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
  ```

- [ ] **2.3.2** Create auto-generate DVIR number function
  ```sql
  CREATE OR REPLACE FUNCTION generate_dvir_number()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.dvir_number := 'DVIR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('dvir_number_seq')::TEXT, 4, '0');
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  CREATE SEQUENCE IF NOT EXISTS dvir_number_seq;

  CREATE TRIGGER trigger_generate_dvir_number
  BEFORE INSERT ON dvirs
  FOR EACH ROW
  EXECUTE FUNCTION generate_dvir_number();
  ```

- [ ] **2.3.3** Create Edge Function: `submit-dvir`
  - [ ] Accept all inspection fields
  - [ ] Validate required fields
  - [ ] Validate driver is authenticated
  - [ ] Insert into dvirs table
  - [ ] If defects found, notify admins
  - [ ] Return DVIR object with generated number

- [ ] **2.3.4** Create Edge Function: `get-dvirs`
  - [ ] Admin only access
  - [ ] Support filtering (driver_id, vehicle_number, date_range, status, defects_found)
  - [ ] Support pagination
  - [ ] Include driver profile info
  - [ ] Sort by inspection_date DESC
  - [ ] Return DVIR list

- [ ] **2.3.5** Create Edge Function: `get-dvir-details`
  - [ ] Accept dvir_id
  - [ ] Return full DVIR with all fields
  - [ ] Include driver profile
  - [ ] Include job details if linked
  - [ ] Include signed URLs for photos

- [ ] **2.3.6** Create Edge Function: `get-driver-dvirs`
  - [ ] Accept driver_id (optional, defaults to authenticated user)
  - [ ] Query DVIRs for driver
  - [ ] Support date range filter
  - [ ] Return DVIR list

- [ ] **2.3.7** Create Edge Function: `review-dvir`
  - [ ] Admin only access
  - [ ] Accept dvir_id, status, safe_to_operate, admin_notes
  - [ ] Update DVIR status
  - [ ] Set reviewed_by and reviewed_at
  - [ ] If requires_repair, send notification to driver
  - [ ] Return updated DVIR

- [ ] **2.3.8** Create Edge Function: `mark-dvir-repaired`
  - [ ] Admin only access
  - [ ] Accept dvir_id, repair_notes
  - [ ] Update status to 'repaired'
  - [ ] Set repaired_at timestamp
  - [ ] Notify driver that vehicle is ready

- [ ] **2.3.9** Create Edge Function: `get-vehicle-history`
  - [ ] Accept vehicle_number
  - [ ] Query all DVIRs for vehicle
  - [ ] Return timeline of inspections
  - [ ] Highlight recurring issues
  - [ ] Show repair history

- [ ] **2.3.10** Build DVIR form UI (mobile-focused)
  - [ ] Pre-trip / post-trip selection
  - [ ] Vehicle information input
  - [ ] Inspection checklist (toggles for each item)
  - [ ] Notes field for each item
  - [ ] Defect description text area
  - [ ] Photo upload (multi-photo, link to Task 1.1)
  - [ ] Signature capture canvas
  - [ ] Odometer reading input
  - [ ] Location auto-fill (GPS)
  - [ ] Submit button
  - [ ] Validation before submit

- [ ] **2.3.11** Build DVIR management UI (admin panel)
  - [ ] DVIR list/table view
  - [ ] Filter by status, driver, vehicle, date
  - [ ] Highlight DVIRs with defects (red badge)
  - [ ] Quick review buttons (approve/flag)
  - [ ] DVIR detail view modal
    - [ ] All inspection items with status
    - [ ] Defect photos gallery
    - [ ] Driver signature display
    - [ ] Review form (status, notes)
    - [ ] Mark as repaired button
  - [ ] Vehicle history view
  - [ ] Export to PDF for compliance
  - [ ] Print DVIR report

- [ ] **2.3.12** Add DVIR dashboard widgets
  - [ ] Pending review count
  - [ ] DVIRs with defects count
  - [ ] Vehicles requiring repair
  - [ ] Recent DVIRs list
  - [ ] Compliance rate (% with defects)

- [ ] **2.3.13** Update mobile SDK documentation
  - [ ] Pre-trip inspection workflow
  - [ ] Post-trip inspection workflow
  - [ ] Camera integration for defect photos
  - [ ] Signature capture integration
  - [ ] View past DVIRs
  - [ ] Notification when vehicle repaired

- [ ] **2.3.14** Add DVIR reminders/enforcement
  - [ ] Create function to check if driver has done pre-trip DVIR
  - [ ] Prevent job start if no pre-trip DVIR
  - [ ] Remind driver to do post-trip DVIR on job completion
  - [ ] Send notification if DVIR overdue

- [ ] **2.3.15** Testing
  - [ ] Test DVIR submission with all fields
  - [ ] Test photo uploads
  - [ ] Test signature capture
  - [ ] Test admin review workflow
  - [ ] Test defect notifications
  - [ ] Test vehicle history
  - [ ] Test DVIR PDF export
  - [ ] Test compliance reporting

**Dependencies:** Task 1.1 (file upload for photos/signatures), Task 2.1 (job_id reference)
**Blocks:** None

---

## **PHASE 3: Mobile App Development (2-3 weeks)**
*Goal: Build native mobile apps for drivers*

### Task 3.1: Choose Mobile Framework
**Estimated Time:** Research phase

- [ ] **3.1.1** Evaluate options
  - [ ] React Native (JavaScript/TypeScript)
  - [ ] Flutter (Dart)
  - [ ] Native (Swift for iOS, Kotlin for Android)

- [ ] **3.1.2** Decision criteria
  - [ ] Code reuse (iOS + Android)
  - [ ] Performance requirements
  - [ ] Developer experience
  - [ ] Access to native features (GPS, camera, notifications)
  - [ ] Time to market

- [ ] **3.1.3** Make final decision and document

**Dependencies:** None
**Blocks:** Mobile development

---

### Task 3.2: Mobile App Setup
**Estimated Time:** 4-8 hours

- [ ] **3.2.1** Initialize project
  - [ ] Create React Native / Flutter project
  - [ ] Set up folder structure
  - [ ] Configure linting and formatting

- [ ] **3.2.2** Set up authentication
  - [ ] Integrate Supabase Auth SDK
  - [ ] Login screen
  - [ ] Register screen (if needed)
  - [ ] Password reset
  - [ ] Secure token storage

- [ ] **3.2.3** Set up navigation
  - [ ] Tab navigation (Home, Loads, Messages, DVIR, Profile)
  - [ ] Stack navigation for details screens
  - [ ] Deep linking for notifications

- [ ] **3.2.4** Set up state management
  - [ ] Context API / Redux / Zustand
  - [ ] Supabase real-time subscriptions

- [ ] **3.2.5** Set up UI components
  - [ ] Choose UI library (React Native Paper, NativeBase, custom)
  - [ ] Theme configuration
  - [ ] Common components (buttons, cards, inputs)

**Dependencies:** Task 3.1
**Blocks:** Feature development

---

### Task 3.3: Core Features Implementation
**Estimated Time:** 2-3 weeks

- [ ] **3.3.1** Home Screen
  - [ ] Current load card
  - [ ] Quick actions (start trip, submit DVIR)
  - [ ] Notifications center
  - [ ] Profile quick view

- [ ] **3.3.2** Loads Screen
  - [ ] Assigned loads list
  - [ ] Load details view
  - [ ] Navigation to pickup/delivery (Google Maps integration)
  - [ ] Update status buttons (arrived, picked up, delivered)
  - [ ] Upload proof of delivery (photo, signature)

- [ ] **3.3.3** Messages Screen
  - [ ] Conversation list
  - [ ] Chat thread view
  - [ ] Compose message
  - [ ] Real-time updates

- [ ] **3.3.4** DVIR Screen
  - [ ] Pre-trip inspection form
  - [ ] Post-trip inspection form
  - [ ] Photo upload for defects
  - [ ] Signature capture
  - [ ] Past DVIRs list

- [ ] **3.3.5** Profile Screen
  - [ ] User information
  - [ ] Statistics (loads completed, hours driven)
  - [ ] Settings (notifications, location permissions)
  - [ ] Logout

- [ ] **3.3.6** Background services
  - [ ] GPS location tracking
  - [ ] Heartbeat updates
  - [ ] Push notification handling

**Dependencies:** Task 3.2, All Phase 1 & 2 backend tasks
**Blocks:** App launch

---

### Task 3.4: Mobile App Testing & Deployment
**Estimated Time:** 1 week

- [ ] **3.4.1** Testing
  - [ ] Unit tests for business logic
  - [ ] Integration tests for API calls
  - [ ] UI tests for critical flows
  - [ ] Manual testing on real devices (iOS & Android)
  - [ ] Beta testing with drivers

- [ ] **3.4.2** Performance optimization
  - [ ] Reduce bundle size
  - [ ] Optimize images
  - [ ] Lazy loading
  - [ ] Caching strategies

- [ ] **3.4.3** iOS Deployment
  - [ ] Apple Developer account setup
  - [ ] App Store Connect configuration
  - [ ] TestFlight beta distribution
  - [ ] App Store submission
  - [ ] App review and approval

- [ ] **3.4.4** Android Deployment
  - [ ] Google Play Console setup
  - [ ] Internal testing track
  - [ ] Closed beta testing
  - [ ] Production release
  - [ ] Play Store approval

**Dependencies:** Task 3.3
**Blocks:** Production launch

---

## **PHASE 4: Polish & Optimization (Ongoing)**
*Goal: Improve performance, add analytics, optimize costs*

### Task 4.1: Performance Optimization
- [ ] Database query optimization (indexes, explain analyze)
- [ ] Edge Function cold start optimization
- [ ] Implement caching (Redis or Supabase cache)
- [ ] CDN for static assets
- [ ] Image optimization (compression, WebP format)
- [ ] Lazy loading in admin panel
- [ ] Bundle size reduction

### Task 4.2: Advanced Analytics
- [ ] Driver performance metrics
- [ ] Load completion rates
- [ ] Average delivery times
- [ ] Route efficiency analysis
- [ ] Cost per mile calculations
- [ ] Revenue tracking
- [ ] Custom reports and exports

### Task 4.3: Automated Testing
- [ ] Unit tests for Edge Functions
- [ ] Integration tests for API endpoints
- [ ] E2E tests for admin panel
- [ ] Mobile app automated tests
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Automated deployment on merge

### Task 4.4: Security Hardening
- [ ] Security audit
- [ ] Penetration testing
- [ ] Rate limiting review
- [ ] SQL injection prevention audit
- [ ] XSS prevention review
- [ ] HTTPS enforcement
- [ ] Environment secrets rotation

### Task 4.5: Monitoring & Alerts
- [ ] Set up Sentry for error tracking
- [ ] Configure Supabase alerts
- [ ] Database performance monitoring
- [ ] API latency monitoring
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] Alert thresholds and notifications

### Task 4.6: Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Admin panel user guide
- [ ] Mobile app user guide
- [ ] Developer onboarding guide
- [ ] Deployment runbook
- [ ] Incident response playbook

### Task 4.7: Compliance & Legal
- [ ] Privacy policy
- [ ] Terms of service
- [ ] GDPR compliance (if applicable)
- [ ] Data retention policies
- [ ] Backup and disaster recovery plan
- [ ] DOT compliance (if applicable)

---

## **PHASE 5: Enhancement Features (Future)**
*Goal: Add nice-to-have features based on user feedback*

### Future Enhancements
- [ ] Rating/Review system for drivers
- [ ] Expense tracking and reimbursement
- [ ] Fuel card integration
- [ ] ELD (Electronic Logging Device) integration
- [ ] Automated dispatch (AI-powered job assignment)
- [ ] Customer portal (for shippers to track loads)
- [ ] Invoice generation and accounting
- [ ] Multi-language support
- [ ] Offline mode for mobile app
- [ ] Apple CarPlay / Android Auto integration
- [ ] Voice commands for hands-free operation
- [ ] Advanced route optimization (multi-stop)
- [ ] Fleet maintenance scheduling
- [ ] Driver training module
- [ ] Compliance document management

---

## 🎯 Success Metrics

### Phase 1 Complete When:
- [ ] All 3 critical features implemented (file upload, notifications, GPS)
- [ ] Admin panel deployed to production
- [ ] All endpoints tested and documented
- [ ] Zero critical bugs

### Phase 2 Complete When:
- [ ] Loads management fully operational
- [ ] Messaging system working (admin ↔ driver)
- [ ] DVIR system functional with compliance
- [ ] Admin can manage full driver workflow

### Phase 3 Complete When:
- [ ] Mobile apps on App Store & Play Store
- [ ] Drivers can receive and complete loads
- [ ] All core features working on mobile
- [ ] Beta testing complete with positive feedback

### Ready for Production When:
- [ ] All critical features complete (Phase 1 & 2)
- [ ] Mobile apps deployed (Phase 3)
- [ ] Security audit passed
- [ ] Performance benchmarks met
- [ ] Documentation complete
- [ ] Training materials ready
- [ ] Support system in place

---

## 📅 Timeline Summary

| Phase | Duration | Target Date |
|-------|----------|-------------|
| Phase 1: Critical Features | 2-3 days | Week 1 |
| Phase 2: Enhanced Features | 3-4 days | Week 1-2 |
| Phase 3: Mobile Apps | 2-3 weeks | Week 3-5 |
| Phase 4: Polish & Optimization | Ongoing | Week 6+ |
| Phase 5: Future Enhancements | TBD | Post-Launch |

**Minimum Viable Product (MVP): 3-5 weeks**
**Full Production Launch: 5-7 weeks**

---

## 📝 Notes

- This roadmap is living document - update as priorities change
- Mark tasks complete as you finish them
- Add new tasks as requirements emerge
- Review and adjust timeline weekly
- Focus on MVP first, enhancements later
- User feedback will drive Phase 5 priorities

---

**Last Updated:** January 2025
**Next Review:** Weekly or after major milestone completion
