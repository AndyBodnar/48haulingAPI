'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function LiveStatusTab() {
  const [deviceStatus, setDeviceStatus] = useState<Array<{
    user_id: string
    last_seen: string
    app_type: string
    user?: { full_name?: string }
  }>>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDeviceStatus = async () => {
      const { data, error } = await supabase
        .from('device_status')
        .select(`
          user_id,
          last_seen,
          app_type,
          user:profiles!user_id ( full_name )
        `)

      if (error) {
        setError(error.message)
      } else {
        setDeviceStatus(data as typeof deviceStatus)
      }
    }

    // Initial fetch
    fetchDeviceStatus()

    // Subscribe to realtime updates
    const channel = supabase
      .channel('device-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'device_status'
        },
        () => {
          // Refetch data when changes occur
          fetchDeviceStatus()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Live Status</h2>
      {error && <p className="text-red-500">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deviceStatus.map((device) => (
          <div key={device.user_id} className={`p-4 rounded-lg shadow-md ${new Date(device.last_seen).getTime() < Date.now() - 10 * 60 * 1000 ? 'bg-red-200' : 'bg-green-200'}`}>
            <p className="font-bold">{device.user?.full_name || 'Unknown User'}</p>
            <p>App: {device.app_type}</p>
            <p>Last Seen: {new Date(device.last_seen).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
