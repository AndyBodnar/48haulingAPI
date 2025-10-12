import { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'

/**
 * Subscribe to device status changes
 */
export function subscribeToDeviceStatus(
  callback: (payload: any) => void
): RealtimeChannel {
  return supabase
    .channel('device-status-changes')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'device_status'
      },
      callback
    )
    .subscribe()
}

/**
 * Subscribe to job updates
 */
export function subscribeToJobs(
  callback: (payload: any) => void,
  driverId?: string
): RealtimeChannel {
  const channel = supabase
    .channel('job-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'jobs',
        filter: driverId ? `driver_id=eq.${driverId}` : undefined
      },
      callback
    )

  return channel.subscribe()
}

/**
 * Subscribe to error logs
 */
export function subscribeToErrorLogs(
  callback: (payload: any) => void
): RealtimeChannel {
  return supabase
    .channel('error-logs-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT', // Only listen to new errors
        schema: 'public',
        table: 'error_logs'
      },
      callback
    )
    .subscribe()
}

/**
 * Subscribe to reported issues
 */
export function subscribeToIssues(
  callback: (payload: any) => void
): RealtimeChannel {
  return supabase
    .channel('issues-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reported_issues'
      },
      callback
    )
    .subscribe()
}

/**
 * Unsubscribe from channel
 */
export async function unsubscribe(channel: RealtimeChannel) {
  await supabase.removeChannel(channel)
}
