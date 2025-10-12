'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function ErrorLogsTab() {
  const [logs, setLogs] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterUserId, setFilterUserId] = useState('')
  const [filterAppVersion, setFilterAppVersion] = useState('')

  const logsPerPage = 10

  useEffect(() => {
    const fetchErrorLogs = async () => {
      let query = supabase
        .from('error_logs')
        .select(`
          id,
          created_at,
          user_id,
          error_message,
          stack_trace,
          app_version,
          device_info,
          severity,
          resolved,
          user:profiles!user_id ( full_name )
        `)
        .order('created_at', { ascending: false })
        .range(page * logsPerPage, (page + 1) * logsPerPage - 1)

      if (searchTerm) {
        query = query.ilike('error_message', `%${searchTerm}%`)
      }
      if (filterUserId) {
        query = query.eq('user_id', filterUserId)
      }
      if (filterAppVersion) {
        query = query.eq('app_version', filterAppVersion)
      }

      const { data, error } = await query

      if (error) {
        setError(error.message)
      } else {
        setLogs(data)
      }
    }

    fetchErrorLogs()
  }, [page, searchTerm, filterUserId, filterAppVersion])

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Error Logs</h2>
      <div className="flex mb-4 space-x-4">
        <input
          type="text"
          placeholder="Search errors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
        <input
          type="text"
          placeholder="Filter by User ID..."
          value={filterUserId}
          onChange={(e) => setFilterUserId(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
        <input
          type="text"
          placeholder="Filter by App Version..."
          value={filterAppVersion}
          onChange={(e) => setFilterAppVersion(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Date</th>
              <th className="py-2 px-4 border-b">User</th>
              <th className="py-2 px-4 border-b">Error</th>
              <th className="py-2 px-4 border-b">App Version</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="py-2 px-4 border-b">{new Date(log.created_at).toLocaleString()}</td>
                <td className="py-2 px-4 border-b">{log.user?.full_name || 'N/A'}</td>
                <td className="py-2 px-4 border-b">{log.error_message}</td>
                <td className="py-2 px-4 border-b">{log.app_version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between mt-4">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 0}
          className="px-4 py-2 bg-gray-300 rounded-lg disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => setPage(page + 1)}
          className="px-4 py-2 bg-gray-300 rounded-lg"
        >
          Next
        </button>
      </div>
    </div>
  )
}
