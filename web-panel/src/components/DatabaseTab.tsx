'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Database, CheckCircle2, XCircle, Activity, HardDrive, Table, Users as UsersIcon, Eye, Code, FileCode, Settings } from 'lucide-react'
import TableBrowser from './TableBrowser'
import QueryExecutor from './QueryExecutor'
import SchemaManager from './SchemaManager'
import DatabaseManagement from './DatabaseManagement'

interface DatabaseStats {
  isConnected: boolean
  databaseSize: string
  tablesCount: number
  totalRecords: number
  activeConnections: number
  tables: Array<{
    name: string
    rowCount: number
    size: string
  }>
}

interface TableColumn {
  name: string
  type: string
  nullable: boolean
  defaultValue: string | null
}

interface TableData {
  columns: TableColumn[]
  rows: Array<Record<string, unknown>>
  totalCount: number
}

export default function DatabaseTab() {
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Table browser state
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [showQueryExecutor, setShowQueryExecutor] = useState(false)
  const [showSchemaManager, setShowSchemaManager] = useState(false)
  const [showManagement, setShowManagement] = useState(false)

  useEffect(() => {
    fetchDatabaseStats()
    // Refresh every 30 seconds
    const interval = setInterval(fetchDatabaseStats, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchDatabaseStats() {
    try {
      setLoading(true)
      setError(null)

      // Test connection
      const { error: connectionError } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
      const isConnected = !connectionError

      if (!isConnected) {
        throw new Error('Database connection failed')
      }

      // Get all public tables with row counts
      const { data: tablesData, error: tablesError } = await supabase.rpc('get_table_stats')

      let tables: Array<{ name: string; rowCount: number; size: string }> = []
      let totalRecords = 0

      if (tablesError) {
        // Fallback: manually query each known table
        const knownTables = ['profiles', 'api_endpoints', 'api_metrics', 'error_logs', 'reported_issues', 'device_status', 'jobs']

        for (const tableName of knownTables) {
          try {
            const { count } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true })

            const rowCount = count || 0
            totalRecords += rowCount

            tables.push({
              name: tableName,
              rowCount,
              size: 'N/A'
            })
          } catch (e) {
            // Skip tables that don't exist or we don't have access to
            console.warn(`Could not query table ${tableName}`)
          }
        }
      } else {
        tables = tablesData || []
        totalRecords = tables.reduce((sum, t) => sum + t.rowCount, 0)
      }

      // Get active connections count (this might not work with RLS, will return N/A if fails)
      let activeConnections = 0
      try {
        const { data: connectionsData } = await supabase.rpc('get_active_connections')
        activeConnections = connectionsData || 0
      } catch {
        // Can't get this info with current permissions
        activeConnections = 0
      }

      setStats({
        isConnected,
        databaseSize: 'N/A', // Would need admin access to get this
        tablesCount: tables.length,
        totalRecords,
        activeConnections,
        tables: tables.sort((a, b) => b.rowCount - a.rowCount)
      })

    } catch (err) {
      console.error('Error fetching database stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch database statistics')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <div className="spinner"></div>
          <p className="text-gray-400">Loading database statistics...</p>
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Database Connection Failed</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchDatabaseStats}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Database className="w-8 h-8 text-green-500" />
          <div>
            <h2 className="text-2xl font-bold">Database Overview</h2>
            <p className="text-sm text-gray-400">Real-time database statistics and health monitoring</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setShowQueryExecutor(!showQueryExecutor)
              setShowSchemaManager(false)
              setShowManagement(false)
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded transition ${
              showQueryExecutor ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Query Executor</span>
          </button>
          <button
            onClick={() => {
              setShowSchemaManager(!showSchemaManager)
              setShowQueryExecutor(false)
              setShowManagement(false)
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded transition ${
              showSchemaManager ? 'bg-purple-600 text-white' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Schema Manager</span>
          </button>
          <button
            onClick={() => {
              setShowManagement(!showManagement)
              setShowQueryExecutor(false)
              setShowSchemaManager(false)
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded transition ${
              showManagement ? 'bg-green-600 text-white' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Management</span>
          </button>
          <button
            onClick={fetchDatabaseStats}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition disabled:opacity-50"
          >
            <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Query Executor Section */}
      {showQueryExecutor && (
        <QueryExecutor />
      )}

      {/* Schema Manager Section */}
      {showSchemaManager && (
        <SchemaManager />
      )}

      {/* Database Management Section */}
      {showManagement && (
        <DatabaseManagement />
      )}

      {/* Connection Status */}
      {!showQueryExecutor && !showSchemaManager && !showManagement && (
      <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {stats?.isConnected ? (
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
            <div>
              <h3 className="text-lg font-semibold">Connection Status</h3>
              <p className="text-sm text-gray-400">
                {stats?.isConnected ? 'Connected to Supabase PostgreSQL' : 'Disconnected'}
              </p>
            </div>
          </div>
          {stats?.isConnected && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-500">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<HardDrive className="w-6 h-6" />}
          title="Database Size"
          value={stats?.databaseSize || 'N/A'}
          subtitle="Total storage used"
          color="blue"
        />
        <StatCard
          icon={<Table className="w-6 h-6" />}
          title="Tables"
          value={stats?.tablesCount.toString() || '0'}
          subtitle="Public tables"
          color="purple"
        />
        <StatCard
          icon={<Database className="w-6 h-6" />}
          title="Total Records"
          value={stats?.totalRecords.toLocaleString() || '0'}
          subtitle="Across all tables"
          color="green"
        />
        <StatCard
          icon={<UsersIcon className="w-6 h-6" />}
          title="Active Connections"
          value={(stats?.activeConnections && stats.activeConnections > 0) ? stats.activeConnections.toString() : 'N/A'}
          subtitle="Current connections"
          color="orange"
        />
      </div>

      {/* Tables List */}
      <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
        <h3 className="text-xl font-semibold mb-4">Tables Overview</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Table Name</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Row Count</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Size</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stats?.tables.map((table) => (
                <tr key={table.name} className="border-b border-gray-800 hover:bg-[#0f0f0f] transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <Table className="w-4 h-4 text-gray-400" />
                      <span className="font-mono text-sm">{table.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-sm">
                    {table.rowCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-gray-400">
                    {table.size}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-900 text-green-300">
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedTable(table.name)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded transition text-sm"
                      title="Browse table data"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-400">
        Last updated: {new Date().toLocaleString()}
        <span className="mx-2">•</span>
        Auto-refresh every 30 seconds
      </div>
      )}

      {/* Table Browser Modal */}
      {selectedTable && (
        <TableBrowser
          tableName={selectedTable}
          onClose={() => setSelectedTable(null)}
        />
      )}
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  title: string
  value: string
  subtitle: string
  color: 'blue' | 'purple' | 'green' | 'orange'
}

function StatCard({ icon, title, value, subtitle, color }: StatCardProps) {
  const colorClasses = {
    blue: 'text-blue-500 bg-blue-900/20',
    purple: 'text-purple-500 bg-purple-900/20',
    green: 'text-green-500 bg-green-900/20',
    orange: 'text-orange-500 bg-orange-900/20'
  }

  return (
    <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800 hover:border-gray-700 transition">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${colorClasses[color]}`}>
        {icon}
      </div>
      <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  )
}
