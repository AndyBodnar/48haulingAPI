'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Activity, Server, AlertTriangle, TrendingUp, Plus, Settings, Play } from 'lucide-react'
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import EndpointTestingModal from './EndpointTestingModal'

interface APIMetric {
  id: string
  endpoint_name: string
  method: string
  status_code: number
  response_time_ms: number
  timestamp: string
}

interface APIEndpoint {
  id: string
  name: string
  display_name: string
  method: string
  path: string
  auth_required: boolean
  is_active: boolean
  rate_limit: number
}

export default function APIObservabilityDashboard() {
  const [metrics, setMetrics] = useState<APIMetric[]>([])
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddEndpoint, setShowAddEndpoint] = useState(false)
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null)

  // Calculate statistics
  const totalAPIs = endpoints.filter(e => e.is_active).length
  const totalGateways = 1
  const recentMetrics = metrics.slice(-100)
  const requestRate = recentMetrics.length / 5 // approx req/s over last 5 minutes
  const errorRate = recentMetrics.filter(m => m.status_code >= 400).length / 5

  // HTTP Status Distribution
  const statusCodeData = Object.entries(
    recentMetrics.reduce((acc, m) => {
      if (m.status_code >= 400) {
        acc[m.status_code] = (acc[m.status_code] || 0) + 1
      }
      return acc
    }, {} as Record<number, number>)
  ).map(([code, count]) => ({ name: code, value: count }))

  // HTTP Method Distribution
  const methodData = Object.entries(
    recentMetrics.reduce((acc, m) => {
      acc[m.method] = (acc[m.method] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([method, count]) => ({ name: method, value: count }))

  // Request timeline
  const requestTimeline = recentMetrics.slice(-20).map(m => ({
    time: new Date(m.timestamp).toLocaleTimeString(),
    requests: 1,
    errors: m.status_code >= 400 ? 1 : 0
  }))

  // Duration timeline
  const durationTimeline = recentMetrics.slice(-20).map(m => ({
    time: new Date(m.timestamp).toLocaleTimeString(),
    duration: m.response_time_ms
  }))

  useEffect(() => {
    fetchData()

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('api_metrics_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'api_metrics' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMetrics(prev => [...prev, payload.new as APIMetric])
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function fetchData() {
    try {
      // Fetch endpoints
      const { data: endpointsData } = await supabase
        .from('api_endpoints')
        .select('*')
        .order('created_at', { ascending: false })

      if (endpointsData) setEndpoints(endpointsData)

      // Fetch recent metrics (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { data: metricsData } = await supabase
        .from('api_metrics')
        .select('*')
        .gte('timestamp', fiveMinutesAgo)
        .order('timestamp', { ascending: true })

      if (metricsData) setMetrics(metricsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = {
    '500': '#3b82f6',
    '404': '#f59e0b',
    '502': '#f97316',
    '400': '#10b981',
    '503': '#ef4444',
    'GET': '#f59e0b',
    'POST': '#f97316',
    'PUT': '#ef4444',
    'DELETE': '#10b981',
    'PATCH': '#3b82f6'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f0f0f]">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#1a1a1a]">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img src="/logo.png" alt="48 Hauling" className="w-8 h-8 object-contain" />
            <h1 className="text-xl font-bold">General / 48 Hauling Dashboard - overview</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 rounded transition">
              Last 5 minutes
            </button>
            <Settings className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-200" />
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Title Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-24 h-24 bg-[#1a1a1a] rounded-lg flex items-center justify-center border border-gray-800 p-2">
              <img src="/logo.png" alt="48 Hauling Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-3xl font-bold">48 Hauling Dashboard</h2>
          </div>
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-4 gap-6">
          <MetricCard
            title="APIs"
            value={totalAPIs}
            color="green"
          />
          <MetricCard
            title="API Gateway"
            value={totalGateways}
            color="green"
          />
          <GaugeCard
            title="Request"
            value={Math.round(requestRate)}
            max={1000}
            unit="req/s"
            color="green"
          />
          <GaugeCard
            title="Errors"
            value={Number(errorRate.toFixed(2))}
            max={10}
            unit="req/s"
            color="green"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-3 gap-6">
          {/* Request Chart */}
          <div className="col-span-2 bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <h3 className="text-lg font-semibold mb-4">Request</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={requestTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="time" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Legend />
                <Line type="monotone" dataKey="requests" stroke="#10b981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="errors" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex space-x-4 mt-2 text-xs text-gray-400">
              <span className="flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>httpbin
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>httpstatus
              </span>
            </div>
          </div>

          {/* HTTP Status Code Pie */}
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <h3 className="text-lg font-semibold mb-4">HTTP status code (non 200)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusCodeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusCodeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-4">
              {statusCodeData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center">
                    <span
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: COLORS[entry.name as keyof typeof COLORS] || '#6b7280' }}
                    ></span>
                    {entry.name}
                  </span>
                  <span className="text-gray-400">
                    {Math.round((entry.value / statusCodeData.reduce((a, b) => a + b.value, 0)) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-3 gap-6">
          {/* Errors Chart */}
          <div className="col-span-2 bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <h3 className="text-lg font-semibold mb-4">Errors</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={requestTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="time" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                />
                <Legend />
                <Line type="monotone" dataKey="errors" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* HTTP Method Pie */}
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <h3 className="text-lg font-semibold mb-4">HTTP method</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={methodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {methodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#6b7280'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-4">
              {methodData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center">
                    <span
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: COLORS[entry.name as keyof typeof COLORS] || '#6b7280' }}
                    ></span>
                    {entry.name}
                  </span>
                  <span className="text-gray-400">
                    {Math.round((entry.value / methodData.reduce((a, b) => a + b.value, 0)) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Duration Chart */}
        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <h3 className="text-lg font-semibold mb-4">Duration</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={durationTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="time" stroke="#9ca3af" fontSize={11} />
              <YAxis stroke="#9ca3af" fontSize={11} label={{ value: 'ms', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
              />
              <Line type="monotone" dataKey="duration" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Endpoints Management Section */}
        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">API Endpoints</h3>
            <button
              onClick={() => setShowAddEndpoint(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Endpoint</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {endpoints.map((endpoint) => (
              <EndpointCard
                key={endpoint.id}
                endpoint={endpoint}
                onRefresh={fetchData}
                onTest={() => setSelectedEndpoint(endpoint)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Add Endpoint Modal */}
      {showAddEndpoint && (
        <AddEndpointModal
          onClose={() => setShowAddEndpoint(false)}
          onSuccess={() => {
            setShowAddEndpoint(false)
            fetchData()
          }}
        />
      )}

      {/* Testing Modal */}
      {selectedEndpoint && (
        <EndpointTestingModal
          endpoint={selectedEndpoint}
          onClose={() => setSelectedEndpoint(null)}
        />
      )}
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: number
  color: string
}

function MetricCard({ title, value, color }: MetricCardProps) {
  return (
    <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800 card-hover">
      <h3 className="text-gray-400 text-sm mb-2">{title}</h3>
      <div className="flex items-baseline space-x-2">
        <span className={`text-4xl font-bold text-${color}-500`}>{value}</span>
      </div>
      <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full bg-${color}-500`} style={{ width: '100%' }}></div>
      </div>
    </div>
  )
}

interface GaugeCardProps {
  title: string
  value: number
  max: number
  unit: string
  color: string
}

function GaugeCard({ title, value, max, unit, color }: GaugeCardProps) {
  const percentage = Math.min((value / max) * 100, 100)

  return (
    <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800 card-hover">
      <h3 className="text-gray-400 text-sm mb-4">{title}</h3>
      <div className="relative w-32 h-32 mx-auto">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="#2a2a2a"
            strokeWidth="12"
            fill="none"
          />
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="#10b981"
            strokeWidth="12"
            fill="none"
            strokeDasharray={`${(percentage / 100) * 2 * Math.PI * 56} ${2 * Math.PI * 56}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-green-500">{value}</span>
          <span className="text-xs text-gray-400">{unit}</span>
        </div>
      </div>
    </div>
  )
}

interface EndpointCardProps {
  endpoint: APIEndpoint
  onRefresh: () => void
  onTest: () => void
}

function EndpointCard({ endpoint, onRefresh, onTest }: EndpointCardProps) {
  const methodColors = {
    'GET': 'bg-blue-600',
    'POST': 'bg-green-600',
    'PUT': 'bg-yellow-600',
    'DELETE': 'bg-red-600',
    'PATCH': 'bg-purple-600'
  }

  return (
    <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className={`px-3 py-1 rounded text-xs font-medium ${methodColors[endpoint.method as keyof typeof methodColors]}`}>
            {endpoint.method}
          </span>
          <div>
            <h4 className="font-medium">{endpoint.display_name}</h4>
            <p className="text-sm text-gray-400">{endpoint.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">{endpoint.rate_limit} req/min</span>
          <div className={`w-3 h-3 rounded-full ${endpoint.is_active ? 'status-online' : 'status-offline'}`}></div>
          <button
            onClick={onTest}
            className="p-2 hover:bg-gray-800 rounded transition"
            title="Test endpoint"
          >
            <Play className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

interface AddEndpointModalProps {
  onClose: () => void
  onSuccess: () => void
}

function AddEndpointModal({ onClose, onSuccess }: AddEndpointModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    method: 'GET',
    description: '',
    auth_required: true,
    role_required: '',
    rate_limit: 60
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase.from('api_endpoints').insert({
        ...formData,
        path: `/${formData.name}`,
        created_by: user?.id,
        is_active: true
      })

      if (error) throw error

      onSuccess()
    } catch (error) {
      console.error('Error creating endpoint:', error)
      alert('Failed to create endpoint')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-[#1a1a1a] rounded-lg p-8 max-w-2xl w-full border border-gray-800 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Add New API Endpoint</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Endpoint Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                placeholder="get-user-profile"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                placeholder="Get User Profile"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                HTTP Method
              </label>
              <select
                value={formData.method}
                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rate Limit (req/min)
              </label>
              <input
                type="number"
                value={formData.rate_limit}
                onChange={(e) => setFormData({ ...formData, rate_limit: parseInt(e.target.value) })}
                className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
                min="1"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
              rows={3}
              placeholder="Describe what this endpoint does..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.auth_required}
                onChange={(e) => setFormData({ ...formData, auth_required: e.target.checked })}
                className="w-4 h-4 rounded border-gray-800 text-green-600 focus:ring-green-500"
              />
              <label className="text-sm font-medium text-gray-300">
                Requires Authentication
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Required Role
              </label>
              <select
                value={formData.role_required}
                onChange={(e) => setFormData({ ...formData, role_required: e.target.value })}
                className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded focus:ring-2 focus:ring-green-500 focus:outline-none"
              >
                <option value="">Any</option>
                <option value="admin">Admin</option>
                <option value="driver">Driver</option>
                <option value="user">User</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded font-medium transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Endpoint'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded font-medium transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
