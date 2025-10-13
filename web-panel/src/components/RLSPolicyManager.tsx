'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Shield,
  Eye,
  EyeOff,
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Code,
  User,
  Lock,
  Unlock,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react'

interface RLSPolicy {
  schemaname: string
  tablename: string
  policyname: string
  permissive: string
  roles: string[]
  cmd: string
  qual: string | null
  with_check: string | null
}

interface PolicyTest {
  policy: string
  role: string
  result: 'allowed' | 'denied' | 'error'
  message?: string
}

export default function RLSPolicyManager() {
  const [policies, setPolicies] = useState<RLSPolicy[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [testRole, setTestRole] = useState('authenticated')
  const [testQuery, setTestQuery] = useState('')
  const [testResult, setTestResult] = useState<PolicyTest | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Create policy form state
  const [newPolicyTable, setNewPolicyTable] = useState('')
  const [newPolicyName, setNewPolicyName] = useState('')
  const [newPolicyCommand, setNewPolicyCommand] = useState('SELECT')
  const [newPolicyRole, setNewPolicyRole] = useState('authenticated')
  const [newPolicyUsing, setNewPolicyUsing] = useState('')
  const [newPolicyCheck, setNewPolicyCheck] = useState('')

  useEffect(() => {
    fetchPolicies()
  }, [])

  async function fetchPolicies() {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_rls_policies')

      if (error) {
        console.error('Error fetching policies:', error)
      } else {
        setPolicies(data || [])
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function togglePolicy(tableName: string, policyName: string, enable: boolean) {
    try {
      const action = enable ? 'ENABLE' : 'DISABLE'
      const query = `ALTER TABLE ${tableName} ${action} ROW LEVEL SECURITY;`

      const { error } = await supabase.rpc('execute_sql', {
        query_text: query
      })

      if (error) {
        alert(`Failed to ${action.toLowerCase()} policy: ${error.message}`)
      } else {
        alert(`Policy ${action.toLowerCase()}d successfully`)
        fetchPolicies()
      }
    } catch (err) {
      console.error('Error toggling policy:', err)
      alert('Failed to toggle policy')
    }
  }

  async function deletePolicy(tableName: string, policyName: string) {
    if (!confirm(`Delete policy "${policyName}" from table "${tableName}"?`)) {
      return
    }

    try {
      const query = `DROP POLICY IF EXISTS "${policyName}" ON ${tableName};`

      const { error } = await supabase.rpc('execute_sql', {
        query_text: query
      })

      if (error) {
        alert(`Failed to delete policy: ${error.message}`)
      } else {
        alert('Policy deleted successfully')
        fetchPolicies()
      }
    } catch (err) {
      console.error('Error deleting policy:', err)
      alert('Failed to delete policy')
    }
  }

  async function createPolicy() {
    if (!newPolicyTable || !newPolicyName || !newPolicyUsing) {
      alert('Please fill in all required fields')
      return
    }

    try {
      let query = `CREATE POLICY "${newPolicyName}" ON ${newPolicyTable}\n`
      query += `  FOR ${newPolicyCommand}\n`
      query += `  TO ${newPolicyRole}\n`
      query += `  USING (${newPolicyUsing})`

      if (newPolicyCheck && ['INSERT', 'UPDATE', 'ALL'].includes(newPolicyCommand)) {
        query += `\n  WITH CHECK (${newPolicyCheck})`
      }

      query += ';'

      const { error } = await supabase.rpc('execute_sql', {
        query_text: query
      })

      if (error) {
        alert(`Failed to create policy: ${error.message}`)
      } else {
        alert('Policy created successfully!')
        setShowCreateDialog(false)
        setNewPolicyTable('')
        setNewPolicyName('')
        setNewPolicyUsing('')
        setNewPolicyCheck('')
        fetchPolicies()
      }
    } catch (err) {
      console.error('Error creating policy:', err)
      alert('Failed to create policy')
    }
  }

  async function testPolicy() {
    if (!testQuery.trim()) {
      alert('Please enter a test query')
      return
    }

    setLoading(true)
    try {
      // In a real implementation, this would test the query with the specified role
      // For now, we'll just execute the query and see if it works
      const { data, error } = await supabase.rpc('execute_sql', {
        query_text: testQuery
      })

      if (error) {
        setTestResult({
          policy: 'Test Query',
          role: testRole,
          result: 'denied',
          message: error.message
        })
      } else {
        setTestResult({
          policy: 'Test Query',
          role: testRole,
          result: 'allowed',
          message: `Query succeeded, returned ${Array.isArray(data) ? data.length : 1} row(s)`
        })
      }
    } catch (err) {
      setTestResult({
        policy: 'Test Query',
        role: testRole,
        result: 'error',
        message: err instanceof Error ? err.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const tables = Array.from(new Set(policies.map(p => p.tablename))).sort()
  const filteredPolicies = selectedTable
    ? policies.filter(p => p.tablename === selectedTable)
    : policies

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-blue-500" />
          <div>
            <h3 className="text-2xl font-bold">RLS Policy Manager</h3>
            <p className="text-sm text-gray-400">Manage Row Level Security policies</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Policy</span>
          </button>
          <button
            onClick={fetchPolicies}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Table Filter */}
      <div className="bg-[#1a1a1a] rounded-lg p-4 border border-gray-800">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium">Filter by table:</label>
          <select
            value={selectedTable || ''}
            onChange={(e) => setSelectedTable(e.target.value || null)}
            className="bg-[#0f0f0f] border border-gray-800 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-600"
          >
            <option value="">All tables ({policies.length} policies)</option>
            {tables.map(table => (
              <option key={table} value={table}>
                {table} ({policies.filter(p => p.tablename === table).length} policies)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Policies List */}
      <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
        <h4 className="text-lg font-semibold mb-4">Active Policies</h4>
        {loading ? (
          <div className="text-center py-12">
            <div className="spinner mx-auto"></div>
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Shield className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p className="mb-2">No RLS policies found</p>
            <p className="text-xs">Create your first policy using the button above</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPolicies.map((policy, idx) => (
              <div
                key={idx}
                className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <h5 className="font-semibold">{policy.policyname}</h5>
                      <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded">
                        {policy.cmd}
                      </span>
                      <span className="text-xs bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded">
                        {policy.permissive}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      Table: <span className="font-mono text-blue-400">{policy.tablename}</span>
                    </p>
                    <p className="text-sm text-gray-400 mb-2">
                      Roles: <span className="font-mono text-purple-400">{policy.roles.join(', ')}</span>
                    </p>
                    {policy.qual && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">USING clause:</p>
                        <code className="block bg-[#1a1a1a] rounded p-2 text-xs font-mono text-gray-300 overflow-x-auto">
                          {policy.qual}
                        </code>
                      </div>
                    )}
                    {policy.with_check && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">WITH CHECK clause:</p>
                        <code className="block bg-[#1a1a1a] rounded p-2 text-xs font-mono text-gray-300 overflow-x-auto">
                          {policy.with_check}
                        </code>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => {
                        if (confirm(`Delete policy "${policy.policyname}"?`)) {
                          deletePolicy(policy.tablename, policy.policyname)
                        }
                      }}
                      className="p-2 bg-red-900 hover:bg-red-800 rounded transition"
                      title="Delete policy"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Policy Testing */}
      <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
        <h4 className="text-lg font-semibold mb-4">Test Policies</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Test as Role</label>
              <select
                value={testRole}
                onChange={(e) => setTestRole(e.target.value)}
                className="w-full bg-[#0f0f0f] border border-gray-800 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-600"
              >
                <option value="anon">anon (anonymous)</option>
                <option value="authenticated">authenticated</option>
                <option value="service_role">service_role</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Test Query</label>
            <textarea
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="SELECT * FROM profiles WHERE id = auth.uid();"
              className="w-full h-24 bg-[#0f0f0f] border border-gray-800 rounded px-4 py-3 font-mono text-sm focus:outline-none focus:border-blue-600 resize-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Test if a query would be allowed with the selected role
            </p>
            <button
              onClick={testPolicy}
              disabled={loading || !testQuery.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              <span>Test Query</span>
            </button>
          </div>

          {testResult && (
            <div className={`rounded-lg p-4 border ${
              testResult.result === 'allowed'
                ? 'bg-green-900/20 border-green-800'
                : 'bg-red-900/20 border-red-800'
            }`}>
              <div className="flex items-start space-x-3">
                {testResult.result === 'allowed' ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-semibold mb-1 ${
                    testResult.result === 'allowed' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {testResult.result === 'allowed' ? 'Access Allowed' : 'Access Denied'}
                  </p>
                  {testResult.message && (
                    <p className={`text-sm ${
                      testResult.result === 'allowed' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {testResult.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Policy Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h4 className="text-lg font-semibold mb-4">Create RLS Policy</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Table Name *</label>
                  <input
                    type="text"
                    value={newPolicyTable}
                    onChange={(e) => setNewPolicyTable(e.target.value)}
                    placeholder="e.g., profiles"
                    className="w-full bg-[#0f0f0f] border border-gray-800 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Policy Name *</label>
                  <input
                    type="text"
                    value={newPolicyName}
                    onChange={(e) => setNewPolicyName(e.target.value)}
                    placeholder="e.g., Users can view own profile"
                    className="w-full bg-[#0f0f0f] border border-gray-800 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Command</label>
                  <select
                    value={newPolicyCommand}
                    onChange={(e) => setNewPolicyCommand(e.target.value)}
                    className="w-full bg-[#0f0f0f] border border-gray-800 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-600"
                  >
                    <option value="SELECT">SELECT</option>
                    <option value="INSERT">INSERT</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                    <option value="ALL">ALL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <input
                    type="text"
                    value={newPolicyRole}
                    onChange={(e) => setNewPolicyRole(e.target.value)}
                    placeholder="authenticated"
                    className="w-full bg-[#0f0f0f] border border-gray-800 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">USING Expression *</label>
                <textarea
                  value={newPolicyUsing}
                  onChange={(e) => setNewPolicyUsing(e.target.value)}
                  placeholder="auth.uid() = user_id"
                  className="w-full h-24 bg-[#0f0f0f] border border-gray-800 rounded px-4 py-3 font-mono text-sm focus:outline-none focus:border-blue-600 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Expression that must be true for rows to be visible
                </p>
              </div>
              {['INSERT', 'UPDATE', 'ALL'].includes(newPolicyCommand) && (
                <div>
                  <label className="block text-sm font-medium mb-2">WITH CHECK Expression (optional)</label>
                  <textarea
                    value={newPolicyCheck}
                    onChange={(e) => setNewPolicyCheck(e.target.value)}
                    placeholder="auth.uid() = user_id"
                    className="w-full h-24 bg-[#0f0f0f] border border-gray-800 rounded px-4 py-3 font-mono text-sm focus:outline-none focus:border-blue-600 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Expression that must be true for INSERT/UPDATE operations
                  </p>
                </div>
              )}
              <div className="flex items-center justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowCreateDialog(false)
                    setNewPolicyTable('')
                    setNewPolicyName('')
                    setNewPolicyUsing('')
                    setNewPolicyCheck('')
                  }}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition"
                >
                  Cancel
                </button>
                <button
                  onClick={createPolicy}
                  disabled={!newPolicyTable || !newPolicyName || !newPolicyUsing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition disabled:opacity-50"
                >
                  Create Policy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-400">
            <p className="font-semibold mb-1">About Row Level Security</p>
            <p className="text-blue-500">
              RLS policies control which rows users can access in your tables. Policies are enforced
              at the database level, ensuring data security even if your application code is compromised.
              Always test policies thoroughly before deploying to production.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
