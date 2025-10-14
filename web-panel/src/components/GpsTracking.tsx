'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MapPin, Navigation, Clock, User, TrendingUp, Activity } from 'lucide-react'

interface DriverLocation {
  driver_id: string
  driver_name: string
  driver_email: string
  latitude: number
  longitude: number
  accuracy: number
  speed: number
  heading: number
  job_id: number | null
  recorded_at: string
  minutes_old: number
}

interface LocationHistoryPoint {
  latitude: number
  longitude: number
  speed: number
  heading: number
  recorded_at: string
}

export default function GpsTracking() {
  const [activeDrivers, setActiveDrivers] = useState<DriverLocation[]>([])
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null)
  const [locationHistory, setLocationHistory] = useState<LocationHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetchActiveDrivers()

    // Auto-refresh every 10 seconds if enabled
    if (autoRefresh) {
      const interval = setInterval(fetchActiveDrivers, 10000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  useEffect(() => {
    if (selectedDriver) {
      fetchLocationHistory(selectedDriver.driver_id)
    }
  }, [selectedDriver])

  const fetchActiveDrivers = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_latest_driver_locations', { minutes_ago: 30 })

      if (error) throw error

      setActiveDrivers(data || [])
    } catch (error: any) {
      console.error('Error fetching active drivers:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchLocationHistory = async (driverId: string) => {
    try {
      // Get last 2 hours of location history
      const twoHoursAgo = new Date()
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)

      const { data, error } = await supabase
        .from('location_history')
        .select('latitude, longitude, speed, heading, recorded_at')
        .eq('driver_id', driverId)
        .gte('recorded_at', twoHoursAgo.toISOString())
        .order('recorded_at', { ascending: true })
        .limit(500)

      if (error) throw error

      setLocationHistory(data || [])
    } catch (error: any) {
      console.error('Error fetching location history:', error.message)
    }
  }

  const getStatusColor = (minutesOld: number) => {
    if (minutesOld < 5) return 'bg-green-500'
    if (minutesOld < 15) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getStatusText = (minutesOld: number) => {
    if (minutesOld < 1) return 'Just now'
    if (minutesOld < 5) return `${Math.floor(minutesOld)} min ago`
    if (minutesOld < 60) return `${Math.floor(minutesOld)} minutes ago`
    return `${Math.floor(minutesOld / 60)}h ${Math.floor(minutesOld % 60)}m ago`
  }

  const openInGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">GPS Tracking</h1>
            <p className="text-gray-400">Real-time driver locations and route history</p>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 text-green-600 focus:ring-green-600"
              />
              <span className="text-sm text-gray-400">Auto-refresh (10s)</span>
            </label>
            <button
              onClick={fetchActiveDrivers}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Refresh Now
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Drivers</p>
              <p className="text-2xl font-bold mt-1">{activeDrivers.length}</p>
            </div>
            <MapPin className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Online (&lt; 5 min)</p>
              <p className="text-2xl font-bold mt-1 text-green-500">
                {activeDrivers.filter(d => d.minutes_old < 5).length}
              </p>
            </div>
            <Activity className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Avg Speed</p>
              <p className="text-2xl font-bold mt-1">
                {activeDrivers.length > 0
                  ? Math.round(activeDrivers.reduce((sum, d) => sum + d.speed, 0) / activeDrivers.length)
                  : 0} mph
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">On Active Loads</p>
              <p className="text-2xl font-bold mt-1 text-purple-500">
                {activeDrivers.filter(d => d.job_id).length}
              </p>
            </div>
            <Navigation className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Map Notice */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
        <p className="text-blue-400 text-sm">
          <strong>Note:</strong> Interactive map integration with Google Maps or Mapbox can be added here. Currently showing driver locations in list format.
          Click "View on Map" to open location in Google Maps.
        </p>
      </div>

      {/* Driver Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
        ) : activeDrivers.length === 0 ? (
          <div className="col-span-2 bg-[#1a1a1a] rounded-lg border border-gray-800 p-12 text-center">
            <MapPin className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No active drivers</p>
            <p className="text-gray-600 text-sm mt-2">Drivers will appear here when they share their location</p>
          </div>
        ) : (
          activeDrivers.map((driver) => (
            <div
              key={driver.driver_id}
              className="bg-[#1a1a1a] rounded-lg border border-gray-800 p-6 hover:border-gray-700 transition-colors cursor-pointer"
              onClick={() => setSelectedDriver(driver)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                    {driver.driver_name?.charAt(0).toUpperCase() || 'D'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{driver.driver_name}</h3>
                    <p className="text-xs text-gray-400">{driver.driver_email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(driver.minutes_old)} animate-pulse`}></div>
                  <span className="text-xs text-gray-400">{getStatusText(driver.minutes_old)}</span>
                </div>
              </div>

              {/* Location Details */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Latitude</p>
                    <p className="font-mono">{driver.latitude.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Longitude</p>
                    <p className="font-mono">{driver.longitude.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Speed</p>
                    <div className="flex items-center space-x-2">
                      <Navigation className="w-4 h-4 text-blue-500" style={{ transform: `rotate(${driver.heading}deg)` }} />
                      <span>{Math.round(driver.speed)} mph</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Accuracy</p>
                    <p>{Math.round(driver.accuracy)}m</p>
                  </div>
                </div>

                {/* Job Info */}
                {driver.job_id && (
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                    <p className="text-xs text-purple-400 mb-1">On Active Load</p>
                    <p className="text-sm font-medium">Load #{driver.job_id}</p>
                  </div>
                )}

                {/* Last Updated */}
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>Updated: {new Date(driver.recorded_at).toLocaleString()}</span>
                </div>

                {/* Action Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openInGoogleMaps(driver.latitude, driver.longitude)
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                >
                  View on Google Maps
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Location History Modal/Panel (simplified) */}
      {selectedDriver && locationHistory.length > 0 && (
        <div className="mt-6 bg-[#1a1a1a] rounded-lg border border-gray-800 p-6">
          <h3 className="text-xl font-bold mb-4">
            Location History - {selectedDriver.driver_name}
          </h3>
          <p className="text-gray-400 mb-4">
            Last 2 hours ({locationHistory.length} points tracked)
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">Total Points</p>
              <p className="text-2xl font-bold">{locationHistory.length}</p>
            </div>
            <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">Avg Speed</p>
              <p className="text-2xl font-bold">
                {Math.round(locationHistory.reduce((sum, p) => sum + p.speed, 0) / locationHistory.length)} mph
              </p>
            </div>
            <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
              <p className="text-gray-400 text-sm mb-1">Max Speed</p>
              <p className="text-2xl font-bold">
                {Math.round(Math.max(...locationHistory.map(p => p.speed)))} mph
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-400 space-y-2 max-h-64 overflow-y-auto">
            {locationHistory.slice(-20).reverse().map((point, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-800">
                <div className="flex items-center space-x-4">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(point.recorded_at).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="font-mono">{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</span>
                  <span className="text-blue-500">{Math.round(point.speed)} mph</span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setSelectedDriver(null)}
            className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Close History
          </button>
        </div>
      )}
    </div>
  )
}
