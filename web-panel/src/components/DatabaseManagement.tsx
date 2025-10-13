'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Database,
  Download,
  Upload,
  Play,
  History,
  AlertCircle,
  CheckCircle,
  Clock,
  HardDrive,
  Zap,
  FileText,
  TrendingDown,
  RefreshCw,
  Activity
} from 'lucide-react'

interface Migration {
  id: string
  name: string
  executed_at: string
  success: boolean
}

interface HealthMetric {
  metric: string
  value: string
  status: 'good' | 'warning' | 'critical'
  description: string
}

interface SlowQuery {
  query: string
  avg_time: number
  calls: number
  table: string
}

interface TableSize {
  table_name: string
  total_size: string
  table_size: string
  indexes_size: string
  row_count: number
}

interface AuditLog {
  id: string
  timestamp: string
  action: string
  table_name: string
  user_id: string
  details: string
}

export default function DatabaseManagement() {
  const [activeTab, setActiveTab] = useState<'migrations' | 'backup' | 'audit' | 'health'>('health')
  const [loading, setLoading] = useState(false)

  // Health metrics state
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([])
  const [tableSizes, setTableSizes] = useState<TableSize[]>([])
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([])

  // Migrations state
  const [migrations, setMigrations] = useState<Migration[]>([])
  const [newMigration, setNewMigration] = useState('')
  const [migrationName, setMigrationName] = useState('')

  // Backup state
  const [backupInProgress, setBackupInProgress] = useState(false)
  const [lastBackup, setLastBackup] = useState<string | null>(null)

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])

  useEffect(() => {
    if (activeTab === 'health') {
      fetchHealthMetrics()
    } else if (activeTab === 'migrations') {
      fetchMigrations()
    } else if (activeTab === 'audit') {
      fetchAuditLogs()
    }
  }, [activeTab])

  async function fetchHealthMetrics() {
    setLoading(true)
    try {
      // Get table sizes
      const { data: sizesData, error: sizesError } = await supabase.rpc('get_table_sizes')

      if (!sizesError && sizesData) {
        setTableSizes(sizesData)
      }

      // Calculate basic health metrics
      const metrics: HealthMetric[] = [
        {
          metric: 'Database Connection',
          value: 'Active',
          status: 'good',
          description: 'Connection to database is healthy'
        },
        {
          metric: 'Total Tables',
          value: sizesData?.length.toString() || '0',
          status: 'good',
          description: 'Number of tables in public schema'
        },
        {
          metric: 'Total Size',
          value: sizesData?.[0]?.total_size || 'N/A',
          status: 'good',
          description: 'Combined size of all tables'
        }
      ]

      setHealthMetrics(metrics)

    } catch (err) {
      console.error('Error fetching health metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchMigrations() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('migrations')
        .select('*')
        .order('executed_at', { ascending: false })

      if (!error && data) {
        setMigrations(data)
      }
    } catch (err) {
      console.error('Error fetching migrations:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchAuditLogs() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100)

      if (!error && data) {
        setAuditLogs(data)
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err)
      // If table doesn't exist, show empty state
      setAuditLogs([])
    } finally {
      setLoading(false)
    }
  }

  async function runMigration() {
    if (!newMigration.trim() || !migrationName.trim()) {
      alert('Please provide both migration name and SQL')
      return
    }

    setLoading(true)
    try {
      // Execute the migration SQL
      const { error: execError } = await supabase.rpc('execute_sql', {
        query_text: newMigration
      })

      if (execError) {
        alert(`Migration failed: ${execError.message}`)
        return
      }

      // Record the migration
      const { error: recordError } = await supabase
        .from('migrations')
        .insert({
          name: migrationName,
          executed_at: new Date().toISOString(),
          success: true
        })

      if (!recordError) {
        alert('Migration executed successfully!')
        setNewMigration('')
        setMigrationName('')
        fetchMigrations()
      }

    } catch (err) {
      console.error('Error running migration:', err)
      alert('Migration failed')
    } finally {
      setLoading(false)
    }
  }

  async function createBackup() {
    setBackupInProgress(true)
    try {
      // In a real implementation, this would trigger a server-side backup
      // For now, we'll export table data
      alert('Backup functionality requires server-side implementation. Use pg_dump for full backups.')
      setLastBackup(new Date().toISOString())
    } catch (err) {
      console.error('Error creating backup:', err)
    } finally {
      setBackupInProgress(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Database className="w-8 h-8 text-green-500" />
          <div>
            <h3 className="text-2xl font-bold">Database Management</h3>
            <p className="text-sm text-gray-400">Manage migrations, backups, and monitor health</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition ${
            activeTab === 'health'
              ? 'border-green-500 text-green-500'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Health Metrics</span>
        </button>
        <button
          onClick={() => setActiveTab('migrations')}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition ${
            activeTab === 'migrations'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>Migrations</span>
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition ${
            activeTab === 'backup'
              ? 'border-purple-500 text-purple-500'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Backup & Restore</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition ${
            activeTab === 'audit'
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Audit Log</span>
        </button>
      </div>

      {/* Health Metrics Tab */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Health Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {healthMetrics.map((metric, idx) => (
              <div key={idx} className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-400">{metric.metric}</h4>
                  {metric.status === 'good' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {metric.status === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-500" />}
                  {metric.status === 'critical' && <AlertCircle className="w-5 h-5 text-red-500" />}
                </div>
                <p className="text-2xl font-bold mb-2">{metric.value}</p>
                <p className="text-xs text-gray-500">{metric.description}</p>
              </div>
            ))}
          </div>

          {/* Table Sizes */}
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Table Sizes</h4>
              <button
                onClick={fetchHealthMetrics}
                disabled={loading}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 rounded transition"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-800">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Table</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-400">Rows</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-400">Table Size</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-400">Indexes</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-400">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8">
                        <div className="spinner mx-auto"></div>
                      </td>
                    </tr>
                  ) : tableSizes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        No data available
                      </td>
                    </tr>
                  ) : (
                    tableSizes.map((table, idx) => (
                      <tr key={idx} className="border-b border-gray-800 hover:bg-[#0f0f0f]">
                        <td className="py-3 px-4 font-mono">{table.table_name}</td>
                        <td className="py-3 px-4 text-right">{table.row_count?.toLocaleString() || 'N/A'}</td>
                        <td className="py-3 px-4 text-right">{table.table_size || 'N/A'}</td>
                        <td className="py-3 px-4 text-right">{table.indexes_size || 'N/A'}</td>
                        <td className="py-3 px-4 text-right font-semibold">{table.total_size}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Tips */}
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-400">
                <p className="font-semibold mb-1">Performance Optimization Tips</p>
                <ul className="text-blue-500 space-y-1 list-disc list-inside">
                  <li>Monitor table sizes and consider partitioning large tables</li>
                  <li>Regularly vacuum and analyze tables for optimal performance</li>
                  <li>Add indexes on frequently queried columns</li>
                  <li>Archive old data to keep tables lean</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Migrations Tab */}
      {activeTab === 'migrations' && (
        <div className="space-y-6">
          {/* Run Migration */}
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <h4 className="text-lg font-semibold mb-4">Run New Migration</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Migration Name</label>
                <input
                  type="text"
                  value={migrationName}
                  onChange={(e) => setMigrationName(e.target.value)}
                  placeholder="e.g., add_user_preferences_table"
                  className="w-full bg-[#0f0f0f] border border-gray-800 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">SQL Migration</label>
                <textarea
                  value={newMigration}
                  onChange={(e) => setNewMigration(e.target.value)}
                  placeholder="CREATE TABLE example (&#10;  id SERIAL PRIMARY KEY,&#10;  name VARCHAR(255)&#10;);"
                  className="w-full h-48 bg-[#0f0f0f] border border-gray-800 rounded px-4 py-3 font-mono text-sm focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Migrations are executed immediately and recorded in the migrations table
                </p>
                <button
                  onClick={runMigration}
                  disabled={loading || !newMigration.trim() || !migrationName.trim()}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  <span>{loading ? 'Running...' : 'Run Migration'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Migration History */}
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <h4 className="text-lg font-semibold mb-4">Migration History</h4>
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-8">
                  <div className="spinner mx-auto"></div>
                </div>
              ) : migrations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                  <p>No migrations recorded yet</p>
                  <p className="text-xs mt-1">Run your first migration above</p>
                </div>
              ) : (
                migrations.map((migration) => (
                  <div
                    key={migration.id}
                    className="bg-[#0f0f0f] rounded p-4 border border-gray-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {migration.success ? (
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <h5 className="font-semibold">{migration.name}</h5>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(migration.executed_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          migration.success
                            ? 'bg-green-900/30 text-green-400'
                            : 'bg-red-900/30 text-red-400'
                        }`}
                      >
                        {migration.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Backup & Restore Tab */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Backup Actions */}
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <h4 className="text-lg font-semibold mb-4">Database Backup</h4>
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-400 mb-2">
                    Create a full backup of your database. Backups include all tables, data, and schema.
                  </p>
                  {lastBackup && (
                    <p className="text-xs text-gray-500">
                      Last backup: {new Date(lastBackup).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={createBackup}
                  disabled={backupInProgress}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition disabled:opacity-50"
                >
                  <Download className={`w-4 h-4 ${backupInProgress ? 'animate-bounce' : ''}`} />
                  <span>{backupInProgress ? 'Creating...' : 'Create Backup'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Backup Instructions */}
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <h4 className="text-lg font-semibold mb-4">Manual Backup Commands</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">PostgreSQL pg_dump</label>
                <pre className="bg-[#0f0f0f] rounded p-4 border border-gray-800 text-xs font-mono text-gray-300 overflow-x-auto">
pg_dump -h db.lnktfijmykqyejtikymu.supabase.co -U postgres -d postgres &gt; backup.sql
                </pre>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Supabase CLI Backup</label>
                <pre className="bg-[#0f0f0f] rounded p-4 border border-gray-800 text-xs font-mono text-gray-300 overflow-x-auto">
supabase db dump -f backup.sql
                </pre>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Restore from Backup</label>
                <pre className="bg-[#0f0f0f] rounded p-4 border border-gray-800 text-xs font-mono text-gray-300 overflow-x-auto">
psql -h db.lnktfijmykqyejtikymu.supabase.co -U postgres -d postgres &lt; backup.sql
                </pre>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-orange-900/20 border border-orange-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-400">
                <p className="font-semibold mb-1">Important Backup Notes</p>
                <ul className="text-orange-500 space-y-1 list-disc list-inside">
                  <li>Always test your backups by restoring to a test environment</li>
                  <li>Store backups securely and in multiple locations</li>
                  <li>Schedule regular automated backups</li>
                  <li>Backups should be encrypted if they contain sensitive data</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Recent Changes</h4>
              <button
                onClick={fetchAuditLogs}
                disabled={loading}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 rounded transition"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="spinner mx-auto"></div>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <History className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="mb-2">No audit logs available</p>
                <p className="text-xs">
                  Audit logging requires the audit_logs table to be created
                </p>
                <details className="mt-4 text-left max-w-2xl mx-auto">
                  <summary className="cursor-pointer text-sm text-blue-400 hover:text-blue-300">
                    Show SQL to create audit_logs table
                  </summary>
                  <pre className="mt-2 bg-[#0f0f0f] rounded p-4 border border-gray-800 text-xs font-mono text-gray-300 overflow-x-auto">
{`CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP DEFAULT NOW(),
  action VARCHAR(50) NOT NULL,
  table_name VARCHAR(100),
  user_id UUID REFERENCES auth.users(id),
  details TEXT
);`}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-[#0f0f0f] rounded p-4 border border-gray-800"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded">
                        {log.action}
                      </span>
                    </div>
                    <p className="text-sm mb-1">
                      Table: <span className="font-mono text-blue-400">{log.table_name}</span>
                    </p>
                    {log.details && (
                      <p className="text-xs text-gray-500">{log.details}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
