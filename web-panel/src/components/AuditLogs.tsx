'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Shield, Search, Filter, Calendar, User, Activity, AlertCircle, CheckCircle, XCircle, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

interface AuditLog {
  id: string
  user_id: string | null
  user_email: string
  user_role: string
  action: string
  resource_type: string
  resource_id: string | null
  description: string
  metadata: any
  ip_address: string | null
  user_agent: string | null
  status: string
  error_message: string | null
  created_at: string
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [resourceFilter, setResourceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [logs, searchTerm, actionFilter, resourceFilter, statusFilter, dateFrom, dateTo])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error

      setLogs(data || [])
    } catch (error: any) {
      console.error('Error fetching audit logs:', error.message)
      toast.error('Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...logs]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.resource_id?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter)
    }

    // Resource filter
    if (resourceFilter !== 'all') {
      filtered = filtered.filter(log => log.resource_type === resourceFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter)
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(log =>
        new Date(log.created_at) >= new Date(dateFrom)
      )
    }
    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(log =>
        new Date(log.created_at) <= toDate
      )
    }

    setFilteredLogs(filtered)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setActionFilter('all')
    setResourceFilter('all')
    setStatusFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <Activity className="w-4 h-4 text-green-500" />
      case 'update': return <Activity className="w-4 h-4 text-blue-500" />
      case 'delete': return <Activity className="w-4 h-4 text-red-500" />
      case 'view': return <Eye className="w-4 h-4 text-gray-500" />
      case 'download': return <Activity className="w-4 h-4 text-purple-500" />
      case 'login': return <Activity className="w-4 h-4 text-green-500" />
      case 'logout': return <Activity className="w-4 h-4 text-gray-500" />
      default: return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failure': return <XCircle className="w-4 h-4 text-red-500" />
      case 'error': return <AlertCircle className="w-4 h-4 text-orange-500" />
      default: return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-500 bg-green-500/10'
      case 'failure': return 'text-red-500 bg-red-500/10'
      case 'error': return 'text-orange-500 bg-orange-500/10'
      default: return 'text-gray-500 bg-gray-500/10'
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center space-x-2">
              <Shield className="w-8 h-8 text-green-500" />
              <span>Audit Logs</span>
            </h1>
            <p className="text-gray-400">Security and compliance tracking for all admin actions</p>
          </div>
          <button
            onClick={fetchLogs}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Actions</p>
              <p className="text-2xl font-bold mt-1">{logs.length}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Today</p>
              <p className="text-2xl font-bold mt-1">
                {logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Errors</p>
              <p className="text-2xl font-bold mt-1 text-red-500">
                {logs.filter(l => l.status === 'error' || l.status === 'failure').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Users</p>
              <p className="text-2xl font-bold mt-1">
                {new Set(logs.map(l => l.user_email)).size}
              </p>
            </div>
            <User className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Filters</span>
          </h3>
          <button
            onClick={clearFilters}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="User, description..."
                className="w-full bg-[#0f0f0f] border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-green-600"
              />
            </div>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-[#0f0f0f] border border-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-green-600"
            >
              <option value="all">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="view">View</option>
              <option value="download">Download</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
            </select>
          </div>

          {/* Resource Filter */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Resource</label>
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="w-full bg-[#0f0f0f] border border-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-green-600"
            >
              <option value="all">All Resources</option>
              <option value="load">Loads</option>
              <option value="driver">Drivers</option>
              <option value="dvir">DVIRs</option>
              <option value="document">Documents</option>
              <option value="message">Messages</option>
              <option value="system">System</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#0f0f0f] border border-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-green-600"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="error">Error</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-[#0f0f0f] border border-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-green-600"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-[#0f0f0f] border border-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-green-600"
            />
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 p-12 text-center">
          <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No audit logs found</p>
          <p className="text-gray-600 text-sm mt-2">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0f0f0f] border-b border-gray-800">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400">Action</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400">Resource</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400">User</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400">Description</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400">Time</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-800 hover:bg-[#0f0f0f] transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(log.status)}
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        {getActionIcon(log.action)}
                        <span className="text-sm font-medium">{log.action}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm">
                        <div className="font-medium">{log.resource_type}</div>
                        {log.resource_id && (
                          <div className="text-xs text-gray-500 font-mono">{log.resource_id}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm">
                        <div className="font-medium">{log.user_email || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{log.user_role || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm text-gray-300 max-w-md truncate">{log.description || 'N/A'}</p>
                      {log.error_message && (
                        <p className="text-xs text-red-400 mt-1 truncate">{log.error_message}</p>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm">
                        <div>{new Date(log.created_at).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">{new Date(log.created_at).toLocaleTimeString()}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => {
                          setSelectedLog(log)
                          setShowDetails(true)
                        }}
                        className="text-blue-500 hover:text-blue-400 transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedLog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 w-full max-w-3xl max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-xl font-bold">Audit Log Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Status</p>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(selectedLog.status)}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedLog.status)}`}>
                      {selectedLog.status}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-1">Action</p>
                  <div className="flex items-center space-x-2">
                    {getActionIcon(selectedLog.action)}
                    <span className="font-medium">{selectedLog.action}</span>
                  </div>
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-1">Resource Type</p>
                  <p className="font-medium">{selectedLog.resource_type}</p>
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-1">Resource ID</p>
                  <p className="font-mono text-sm">{selectedLog.resource_id || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-1">User Email</p>
                  <p className="font-medium">{selectedLog.user_email || 'Unknown'}</p>
                </div>

                <div>
                  <p className="text-gray-400 text-sm mb-1">User Role</p>
                  <p className="font-medium">{selectedLog.user_role || 'N/A'}</p>
                </div>

                <div className="col-span-2">
                  <p className="text-gray-400 text-sm mb-1">Timestamp</p>
                  <p className="font-medium">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>

                <div className="col-span-2">
                  <p className="text-gray-400 text-sm mb-1">Description</p>
                  <p className="font-medium">{selectedLog.description || 'N/A'}</p>
                </div>

                {selectedLog.error_message && (
                  <div className="col-span-2">
                    <p className="text-gray-400 text-sm mb-1">Error Message</p>
                    <p className="text-red-400 font-mono text-sm">{selectedLog.error_message}</p>
                  </div>
                )}

                {selectedLog.ip_address && (
                  <div>
                    <p className="text-gray-400 text-sm mb-1">IP Address</p>
                    <p className="font-mono text-sm">{selectedLog.ip_address}</p>
                  </div>
                )}

                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div className="col-span-2">
                    <p className="text-gray-400 text-sm mb-1">Metadata</p>
                    <pre className="bg-[#0f0f0f] border border-gray-800 rounded-lg p-4 text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
