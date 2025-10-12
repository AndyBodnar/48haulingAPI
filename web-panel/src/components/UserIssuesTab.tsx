'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function UserIssuesTab() {
  const [issues, setIssues] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchIssues = async () => {
      const { data, error } = await supabase
        .from('reported_issues')
        .select(`
          id,
          reported_at,
          reporter_id,
          description,
          status,
          app_version,
          reporter:profiles!reporter_id ( full_name )
        `)
        .order('reported_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setIssues(data)
      }
    }

    fetchIssues()
  }, [])

  const handleStatusChange = async (id: number, newStatus: string) => {
    const { error } = await supabase
      .from('reported_issues')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      setError(error.message)
    } else {
      setIssues(issues.map(issue => issue.id === id ? { ...issue, status: newStatus } : issue))
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">User Reported Issues</h2>
      {error && <p className="text-red-500">{error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Date</th>
              <th className="py-2 px-4 border-b">Reporter</th>
              <th className="py-2 px-4 border-b">Description</th>
              <th className="py-2 px-4 border-b">App Version</th>
              <th className="py-2 px-4 border-b">Status</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.id}>
                <td className="py-2 px-4 border-b">{new Date(issue.reported_at).toLocaleString()}</td>
                <td className="py-2 px-4 border-b">{issue.reporter?.full_name || 'N/A'}</td>
                <td className="py-2 px-4 border-b">{issue.description}</td>
                <td className="py-2 px-4 border-b">{issue.app_version}</td>
                <td className="py-2 px-4 border-b">
                  <select
                    value={issue.status}
                    onChange={(e) => handleStatusChange(issue.id, e.target.value)}
                    className="p-2 border rounded-lg"
                  >
                    <option value="new">New</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
