# Mobile SDK Documentation

This SDK provides easy integration with the Delivery API Hub for mobile applications (Android/iOS).

## Base URL

```
Development: https://YOUR_PROJECT_ID.supabase.co/functions/v1
Production: https://YOUR_PRODUCTION_URL.supabase.co/functions/v1
```

## Authentication

All requests (except `/check-app-version`) require authentication using Supabase JWT tokens.

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## API Endpoints Reference

### 1. Heartbeat (Keep Alive)

**Endpoint:** `POST /heartbeat`

**Purpose:** Let the server know the app is active

**Request:**
```json
{
  "app_type": "mobile"
}
```

**Response:**
```json
{
  "message": "Heartbeat received"
}
```

**Implementation Notes:**
- Call this every 5 minutes while app is active
- Helps admins see which drivers are online
- Use background task/service to keep heartbeat active

---

### 2. Error Logging

**Endpoint:** `POST /log-error`

**Purpose:** Automatically report crashes and errors

**Request:**
```json
{
  "error_message": "NullPointerException at MainActivity.java:42",
  "stack_trace": "Full stack trace here...",
  "app_version": "1.0.0",
  "device_info": {
    "os": "Android",
    "os_version": "13",
    "device_model": "Pixel 7",
    "app_build": "123"
  }
}
```

**Response:**
```json
{
  "message": "Error logged successfully"
}
```

**Implementation Notes:**
- Integrate with crash reporting library
- Capture uncaught exceptions
- Include device info for debugging

---

### 3. Report Issue

**Endpoint:** `POST /report-issue`

**Purpose:** Allow users to manually report bugs/issues

**Request:**
```json
{
  "description": "The map doesn't load when I open the app",
  "app_version": "1.0.0"
}
```

**Response:**
```json
{
  "message": "Issue reported successfully"
}
```

---

### 4. Check App Version

**Endpoint:** `POST /check-app-version`

**Purpose:** Check if app needs to be updated

**Request:**
```json
{
  "current_version": "1.0.0",
  "platform": "android"
}
```

**Response:**
```json
{
  "latest_version": "1.2.0",
  "current_version": "1.0.0",
  "needs_update": true,
  "force_update": false,
  "is_deprecated": false,
  "download_url": "https://play.google.com/store/...",
  "release_notes": "Bug fixes and improvements"
}
```

**Implementation Notes:**
- Check on app startup
- If `force_update` is true, block app usage until updated
- Show update dialog if `needs_update` is true

---

### 5. Get Optimized Route

**Endpoint:** `POST /get-optimized-route`

**Purpose:** Get navigation route from pickup to delivery

**Request:**
```json
{
  "pickup": "123 Main St, City",
  "delivery": "456 Oak Ave, City"
}
```

**Response:**
```json
{
  "polyline": "encoded_polyline_string",
  "distance": {
    "text": "5.2 km",
    "value": 5200
  },
  "duration": {
    "text": "12 mins",
    "value": 720
  }
}
```

---

### 6. Update Job Status

**Endpoint:** `POST /update-job-status`

**Purpose:** Update job status as driver progresses

**Request:**
```json
{
  "job_id": 123,
  "status": "in_progress"
}
```

**Valid statuses:**
- `in_progress` - Driver started the job
- `completed` - Job finished
- `cancelled` - Job cancelled

**Response:**
```json
{
  "success": true,
  "job": {
    "id": 123,
    "status": "in_progress",
    "started_at": "2025-01-01T10:00:00Z"
  }
}
```

**Implementation Notes:**
- Automatically starts time tracking when status changes to `in_progress`
- Automatically stops time tracking when status changes to `completed`

---

### 7. Track Analytics

**Endpoint:** `POST /track-analytics`

**Purpose:** Track user behavior and app usage

**Request:**
```json
{
  "event_name": "job_completed",
  "event_data": {
    "job_id": 123,
    "duration_minutes": 45
  },
  "app_version": "1.0.0",
  "platform": "android",
  "session_id": "unique_session_id"
}
```

**Response:**
```json
{
  "success": true
}
```

**Common Events:**
- `app_opened`
- `job_viewed`
- `job_started`
- `job_completed`
- `navigation_opened`
- `issue_reported`

---

## Rate Limiting

- Default: 60 requests per minute per user
- Exceeded limit returns HTTP 429 with `Retry-After` header

**Response:**
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "retry_after": 45
}
```

---

## Error Handling

All errors return appropriate HTTP status codes:

- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

**Error Response Format:**
```json
{
  "error": "Error message here"
}
```

---

## Best Practices

### 1. **Handle Offline Mode**
- Queue API calls when offline
- Retry when connection restored
- Cache data locally

### 2. **Optimize Heartbeat**
- Only send while app is in foreground
- Pause when app is backgrounded
- Resume when app returns to foreground

### 3. **Error Reporting**
- Don't spam error logs (debounce similar errors)
- Include context (user action, screen name, etc.)
- Respect user privacy (don't log sensitive data)

### 4. **Version Checking**
- Check on startup
- Cache result for 24 hours
- Show update dialog appropriately

### 5. **Analytics**
- Batch events when possible
- Don't track PII (personally identifiable information)
- Track meaningful user actions

---

## Example Implementations

See the following folders for example code:
- `/mobile-sdk/kotlin/` - Android (Kotlin)
- `/mobile-sdk/swift/` - iOS (Swift)
- `/mobile-sdk/flutter/` - Flutter (Dart)
- `/mobile-sdk/react-native/` - React Native (TypeScript)
