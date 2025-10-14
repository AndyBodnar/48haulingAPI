'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Activity,
  Database,
  Zap,
  Server,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Users,
  HardDrive,
  Layers,
  BarChart3,
  Info
} from 'lucide-react'

interface ActiveQuery {
  pid: number
  username: string
  database: string
  client_address: string
  application_name: string
  state: string
  query: string
  duration_seconds: number
  duration_formatted: string
  query_start: string
  state_change: string
}

interface ConnectionPoolStats {
  total_connections: number
  active_connections: number
  idle_connections: number
  idle_in_transaction: number
  waiting_connections: number
  max_connections: number
  usage_percentage: number
  available_connections: number
}

interface SlowQuery {
  query: string
  calls: number
  total_exec_time_ms: number
  mean_exec_time_ms: number
  max_exec_time_ms: number
  min_exec_time_ms: number
  stddev_exec_time_ms: number
  rows_returned: number
}

interface CacheStats {
  cache_hit_ratio: number
  cache_hit_ratio_formatted: string
  blocks_hit: number
  blocks_read: number
  total_blocks: number
  status: string
  recommendation: string
}

interface DatabaseSizeStats {
  database_name: string
  size_bytes: number
  size_formatted: string
  table_count: number
  index_count: number
  total_rows: number
}

interface TableBloat {
  table_name: string
  total_bytes: number
  total_size: string
  dead_tuples: number
  live_tuples: number
  dead_tuple_percentage: number
  last_vacuum: string | null
  last_autovacuum: string | null
  needs_vacuum: boolean
}

interface IndexUsage {
  schema_name: string
  table_name: string
  index_name: string
  index_size: string
  index_scans: number
  tuples_read: number
  tuples_fetched: number
  is_unique: boolean
  is_unused: boolean
}

export default function RealtimeMonitoring() {
  const [activeTab, setActiveTab] = useState<'queries' | 'connections' | 'performance' | 'maintenance'>('queries')
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5)

  // Data states
  const [activeQueries, setActiveQueries] = useState<ActiveQuery[]>([])
  const [connectionStats, setConnectionStats] = useState<ConnectionPoolStats | null>(null)
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([])
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [dbStats, setDbStats] = useState<DatabaseSizeStats | null>(null)
  const [tableBloat, setTableBloat] = useState<TableBloat[]>([])
  const [indexUsage, setIndexUsage] = useState<IndexUsage[]>([])

  const fetchActiveQueries = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_active_queries')
      if (!error && data) {
        setActiveQueries(data)
      }
    } catch (err) {
      console.error('Error fetching active queries:', err)
    }
  }, [])

  const fetchConnectionStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_connection_pool_stats')
      if (!error && data && data.length > 0) {
        setConnectionStats(data[0])
      }
    } catch (err) {
      console.error('Error fetching connection stats:', err)
    }
  }, [])

  const fetchSlowQueries = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_slow_queries', { min_duration_ms: 100 })
      if (!error && data) {
        setSlowQueries(data)
      }
    } catch (err) {
      console.error('Error fetching slow queries:', err)
    }
  }, [])

  const fetchCacheStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_cache_hit_ratio')
      if (!error && data && data.length > 0) {
        setCacheStats(data[0])
      }
    } catch (err) {
      console.error('Error fetching cache stats:', err)
    }
  }, [])

  const fetchDatabaseStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_database_size_stats')
      if (!error && data && data.length > 0) {
        setDbStats(data[0])
      }
    } catch (err) {
      console.error('Error fetching database stats:', err)
    }
  }, [])

  const fetchTableBloat = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_table_bloat_stats')
      if (!error && data) {
        setTableBloat(data)
      }
    } catch (err) {
      console.error('Error fetching table bloat:', err)
    }
  }, [])

  const fetchIndexUsage = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_index_usage_stats')
      if (!error && data) {
        setIndexUsage(data)
      }
    } catch (err) {
      console.error('Error fetching index usage:', err)
    }
  }, [])

  const fetchAllData = useCallback(async () => {
    setLoading(true)
    try {
      if (activeTab === 'queries') {
        await fetchActiveQueries()
      } else if (activeTab === 'connections') {
        await Promise.all([fetchConnectionStats(), fetchDatabaseStats()])
      } else if (activeTab === 'performance') {
        await Promise.all([fetchSlowQueries(), fetchCacheStats()])
      } else if (activeTab === 'maintenance') {
        await Promise.all([fetchTableBloat(), fetchIndexUsage()])
      }
    } finally {
      setLoading(false)
    }
  }, [activeTab, fetchActiveQueries, fetchConnectionStats, fetchSlowQueries, fetchCacheStats, fetchDatabaseStats, fetchTableBloat, fetchIndexUsage])

  useEffect(() => {
    fetchAllData()
  }, [activeTab, fetchAllData])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchAllData()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchAllData])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="w-8 h-8 text-blue-500" />
          <div>
            <h3 className="text-2xl font-bold">Real-time Monitoring</h3>
            <p className="text-sm text-gray-400">Live database performance metrics and query monitoring</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-400">Auto-refresh</label>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`relative w-12 h-6 rounded-full transition ${
                autoRefresh ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  autoRefresh ? 'transform translate-x-6' : ''
                }`}
              />
            </button>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
              >
                <option value={3}>3s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
              </select>
            )}
          </div>
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('queries')}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition ${
            activeTab === 'queries'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Active Queries</span>
        </button>
        <button
          onClick={() => setActiveTab('connections')}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition ${
            activeTab === 'connections'
              ? 'border-green-500 text-green-500'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Connection Pool</span>
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition ${
            activeTab === 'performance'
              ? 'border-yellow-500 text-yellow-500'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Performance</span>
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition ${
            activeTab === 'maintenance'
              ? 'border-purple-500 text-purple-500'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Maintenance</span>
        </button>
      </div>

      {/* Active Queries Tab */}
      {activeTab === 'queries' && (
        <div className="space-y-6">
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Currently Running Queries</h4>
              <span className="text-sm text-gray-400">
                {activeQueries.length} active {activeQueries.length === 1 ? 'query' : 'queries'}
              </span>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
              </div>
            ) : activeQueries.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <p>No active queries at the moment</p>
                <p className="text-xs mt-1">All queries have completed</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeQueries.map((query, idx) => (
                  <div key={idx} className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          query.state === 'active' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
                        }`} />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{query.username}</span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-400">{query.application_name || 'Unknown App'}</span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-400">PID: {query.pid}</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span className="text-xs text-gray-400">
                              Duration: {query.duration_formatted}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        query.state === 'active' ? 'bg-green-900/30 text-green-400' :
                        query.state === 'idle' ? 'bg-gray-700 text-gray-400' :
                        'bg-yellow-900/30 text-yellow-400'
                      }`}>
                        {query.state}
                      </span>
                    </div>
                    <pre className="text-xs bg-[#050505] rounded p-3 overflow-x-auto border border-gray-800">
                      <code className="text-gray-300">{query.query}</code>
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connection Pool Tab */}
      {activeTab === 'connections' && (
        <div className="space-y-6">
          {connectionStats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-400">Total Connections</h4>
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold">{connectionStats.total_connections}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {connectionStats.available_connections} available
                  </p>
                </div>

                <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-400">Active</h4>
                    <Activity className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-green-400">{connectionStats.active_connections}</p>
                  <p className="text-xs text-gray-500 mt-1">Running queries</p>
                </div>

                <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-400">Idle</h4>
                    <Clock className="w-5 h-5 text-gray-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-400">{connectionStats.idle_connections}</p>
                  <p className="text-xs text-gray-500 mt-1">Waiting for work</p>
                </div>

                <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-400">Usage</h4>
                    <BarChart3 className={`w-5 h-5 ${
                      connectionStats.usage_percentage > 80 ? 'text-red-500' :
                      connectionStats.usage_percentage > 60 ? 'text-yellow-500' :
                      'text-green-500'
                    }`} />
                  </div>
                  <p className="text-3xl font-bold">{connectionStats.usage_percentage.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500 mt-1">
                    of {connectionStats.max_connections} max
                  </p>
                </div>
              </div>

              {connectionStats.usage_percentage > 80 && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-400">
                      <p className="font-semibold mb-1">High Connection Usage Warning</p>
                      <p className="text-red-500">
                        Connection pool is at {connectionStats.usage_percentage.toFixed(1)}% capacity.
                        Consider increasing max_connections or investigating connection leaks.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {dbStats && (
            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
              <h4 className="text-lg font-semibold mb-4">Database Statistics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Database Size</p>
                  <p className="text-2xl font-bold text-blue-400">{dbStats.size_formatted}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Tables</p>
                  <p className="text-2xl font-bold text-green-400">{dbStats.table_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Indexes</p>
                  <p className="text-2xl font-bold text-yellow-400">{dbStats.index_count}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Rows</p>
                  <p className="text-2xl font-bold text-purple-400">{dbStats.total_rows?.toLocaleString() || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {cacheStats && (
            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
              <h4 className="text-lg font-semibold mb-4">Cache Hit Ratio</h4>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-5xl font-bold text-blue-400">{cacheStats.cache_hit_ratio_formatted}</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Status: <span className={`font-semibold ${
                      cacheStats.status === 'Excellent' ? 'text-green-400' :
                      cacheStats.status === 'Good' ? 'text-blue-400' :
                      cacheStats.status === 'Fair' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>{cacheStats.status}</span>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">
                    <p>Blocks Hit: <span className="font-mono text-green-400">{cacheStats.blocks_hit.toLocaleString()}</span></p>
                    <p>Blocks Read: <span className="font-mono text-yellow-400">{cacheStats.blocks_read.toLocaleString()}</span></p>
                    <p>Total: <span className="font-mono">{cacheStats.total_blocks.toLocaleString()}</span></p>
                  </div>
                </div>
              </div>
              <div className={`p-4 rounded-lg ${
                cacheStats.status === 'Poor' || cacheStats.status === 'Fair' ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-blue-900/20 border border-blue-800'
              }`}>
                <div className="flex items-start space-x-3">
                  <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    cacheStats.status === 'Poor' || cacheStats.status === 'Fair' ? 'text-yellow-500' : 'text-blue-500'
                  }`} />
                  <p className="text-sm">{cacheStats.recommendation}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <h4 className="text-lg font-semibold mb-4">Slow Queries (avg &gt; 100ms)</h4>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
              </div>
            ) : slowQueries.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <p>No slow queries detected</p>
                <p className="text-xs mt-1">All queries are performing well</p>
              </div>
            ) : (
              <div className="space-y-3">
                {slowQueries.slice(0, 10).map((query, idx) => (
                  <div key={idx} className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <div>
                            <span className="text-sm text-gray-400">Avg Time:</span>
                            <span className={`ml-2 font-bold ${
                              query.mean_exec_time_ms > 1000 ? 'text-red-400' :
                              query.mean_exec_time_ms > 500 ? 'text-yellow-400' :
                              'text-blue-400'
                            }`}>{query.mean_exec_time_ms.toFixed(2)}ms</span>
                          </div>
                          <div>
                            <span className="text-sm text-gray-400">Calls:</span>
                            <span className="ml-2 font-mono">{query.calls.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-sm text-gray-400">Max:</span>
                            <span className="ml-2 font-mono text-red-400">{query.max_exec_time_ms.toFixed(2)}ms</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <pre className="text-xs bg-[#050505] rounded p-3 overflow-x-auto border border-gray-800">
                      <code className="text-gray-300">{query.query.substring(0, 200)}{query.query.length > 200 ? '...' : ''}</code>
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Maintenance Tab */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <h4 className="text-lg font-semibold mb-4">Table Bloat & Vacuum Status</h4>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
              </div>
            ) : tableBloat.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No data available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-800">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-400">Table</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-400">Dead Tuples</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-400">Dead %</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-400">Last Vacuum</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableBloat.map((table, idx) => (
                      <tr key={idx} className="border-b border-gray-800 hover:bg-[#0f0f0f]">
                        <td className="py-3 px-4 font-mono text-sm">{table.table_name}</td>
                        <td className="py-3 px-4 text-right">{table.dead_tuples.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-semibold ${
                            table.dead_tuple_percentage > 20 ? 'text-red-400' :
                            table.dead_tuple_percentage > 10 ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {table.dead_tuple_percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-gray-400">
                          {table.last_vacuum || table.last_autovacuum
                            ? new Date(table.last_vacuum || table.last_autovacuum!).toLocaleString()
                            : 'Never'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {table.needs_vacuum ? (
                            <span className="inline-flex items-center space-x-1 text-xs bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded">
                              <AlertCircle className="w-3 h-3" />
                              <span>Needs VACUUM</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded">
                              <CheckCircle className="w-3 h-3" />
                              <span>OK</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <h4 className="text-lg font-semibold mb-4">Index Usage Statistics</h4>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
              </div>
            ) : indexUsage.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No indexes found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-800">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-400">Index Name</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-400">Table</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-400">Size</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-400">Scans</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indexUsage.map((index, idx) => (
                      <tr key={idx} className="border-b border-gray-800 hover:bg-[#0f0f0f]">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm">{index.index_name}</span>
                            {index.is_unique && (
                              <span className="text-xs bg-blue-900/30 text-blue-400 px-1 py-0.5 rounded">UNIQUE</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-sm text-gray-400">{index.table_name}</td>
                        <td className="py-3 px-4 text-right">{index.index_size}</td>
                        <td className="py-3 px-4 text-right font-mono">{index.index_scans.toLocaleString()}</td>
                        <td className="py-3 px-4 text-center">
                          {index.is_unused ? (
                            <span className="inline-flex items-center space-x-1 text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded">
                              <XCircle className="w-3 h-3" />
                              <span>Unused</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded">
                              <CheckCircle className="w-3 h-3" />
                              <span>Used</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {indexUsage.some(idx => idx.is_unused) && (
              <div className="mt-4 bg-orange-900/20 border border-orange-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-400">
                    <p className="font-semibold mb-1">Unused Indexes Detected</p>
                    <p className="text-orange-500">
                      Some indexes are never used and may be slowing down INSERT/UPDATE operations.
                      Consider dropping unused indexes to improve write performance.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
