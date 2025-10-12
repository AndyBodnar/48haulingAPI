/**
 * TypeScript/React Native API Client
 *
 * Install dependencies:
 * npm install @supabase/supabase-js
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

export interface DeviceInfo {
  os: string
  os_version: string
  device_model: string
  app_build: string
}

export interface VersionCheckResponse {
  latest_version: string
  current_version: string
  needs_update: boolean
  force_update: boolean
  is_deprecated: boolean
  download_url?: string
  release_notes?: string
}

export interface RouteResponse {
  polyline: string
  distance: {
    text: string
    value: number
  }
  duration: {
    text: string
    value: number
  }
}

export class ApiClient {
  private supabase: SupabaseClient
  private functionsUrl: string
  private heartbeatInterval?: NodeJS.Timeout

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.functionsUrl = `${supabaseUrl}/functions/v1`
  }

  /**
   * Get auth token
   */
  private async getAuthToken(): Promise<string | null> {
    const { data } = await this.supabase.auth.getSession()
    return data.session?.access_token || null
  }

  /**
   * Make authenticated API call
   */
  private async apiCall<T = any>(
    endpoint: string,
    body: any,
    requiresAuth = true
  ): Promise<T> {
    const token = requiresAuth ? await this.getAuthToken() : null
    if (requiresAuth && !token) {
      throw new Error('Not authenticated')
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${this.functionsUrl}/${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'API call failed')
    }

    return response.json()
  }

  /**
   * Start heartbeat
   */
  startHeartbeat() {
    this.stopHeartbeat() // Clear any existing interval

    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.apiCall('heartbeat', { app_type: 'mobile' })
      } catch (error) {
        console.error('Heartbeat failed:', error)
      }
    }, 5 * 60 * 1000) // 5 minutes

    // Send initial heartbeat immediately
    this.apiCall('heartbeat', { app_type: 'mobile' }).catch(console.error)
  }

  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = undefined
    }
  }

  /**
   * Log error
   */
  async logError(
    errorMessage: string,
    stackTrace: string | null,
    appVersion: string,
    deviceInfo: DeviceInfo
  ): Promise<void> {
    await this.apiCall('log-error', {
      error_message: errorMessage,
      stack_trace: stackTrace,
      app_version: appVersion,
      device_info: deviceInfo,
    })
  }

  /**
   * Report issue
   */
  async reportIssue(description: string, appVersion: string): Promise<void> {
    await this.apiCall('report-issue', {
      description,
      app_version: appVersion,
    })
  }

  /**
   * Check app version
   */
  async checkAppVersion(
    currentVersion: string,
    platform: 'android' | 'ios' = 'android'
  ): Promise<VersionCheckResponse> {
    return this.apiCall<VersionCheckResponse>(
      'check-app-version',
      {
        current_version: currentVersion,
        platform,
      },
      false
    )
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    jobId: number,
    status: 'in_progress' | 'completed' | 'cancelled'
  ): Promise<void> {
    await this.apiCall('update-job-status', {
      job_id: jobId,
      status,
    })
  }

  /**
   * Get optimized route
   */
  async getOptimizedRoute(
    pickup: string,
    delivery: string
  ): Promise<RouteResponse> {
    return this.apiCall<RouteResponse>('get-optimized-route', {
      pickup,
      delivery,
    })
  }

  /**
   * Track analytics
   */
  async trackAnalytics(
    eventName: string,
    eventData?: Record<string, any>,
    appVersion?: string,
    platform?: string,
    sessionId?: string
  ): Promise<void> {
    await this.apiCall('track-analytics', {
      event_name: eventName,
      event_data: eventData || {},
      app_version: appVersion,
      platform,
      session_id: sessionId,
    })
  }

  /**
   * Sign in
   */
  async signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password })
  }

  /**
   * Sign out
   */
  async signOut() {
    this.stopHeartbeat()
    return this.supabase.auth.signOut()
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    const { data } = await this.supabase.auth.getUser()
    return data.user
  }
}

// Usage example:
// const apiClient = new ApiClient(SUPABASE_URL, SUPABASE_ANON_KEY)
// apiClient.startHeartbeat()
//
// // When app goes to background:
// apiClient.stopHeartbeat()
//
// // When app returns to foreground:
// apiClient.startHeartbeat()
