'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Play,
  History,
  Code,
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  Trash2,
  FileText
} from 'lucide-react'

interface QueryResult {
  data: Array<Record<string, unknown>> | null
  error: string | null
  executionTime: number
  rowCount: number
}

interface QueryHistory {
  query: string
  timestamp: Date
  success: boolean
  rowCount?: number
  executionTime?: number
}

const QUERY_TEMPLATES = [
  {
    name: 'SELECT All',
    query: 'SELECT * FROM table_name LIMIT 100;',
    description: 'Get all columns from a table'
  },
  {
    name: 'SELECT with WHERE',
    query: 'SELECT * FROM table_name WHERE column_name = \'value\' LIMIT 100;',
    description: 'Filter rows by condition'
  },
  {
    name: 'COUNT Records',
    query: 'SELECT COUNT(*) as total FROM table_name;',
    description: 'Count total records'
  },
  {
    name: 'INSERT Record',
    query: 'INSERT INTO table_name (column1, column2) VALUES (\'value1\', \'value2\');',
    description: 'Insert new record'
  },
  {
    name: 'UPDATE Record',
    query: 'UPDATE table_name SET column1 = \'new_value\' WHERE id = 1;',
    description: 'Update existing record'
  },
  {
    name: 'DELETE Record',
    query: 'DELETE FROM table_name WHERE id = 1;',
    description: 'Delete record by ID'
  },
  {
    name: 'JOIN Tables',
    query: 'SELECT t1.*, t2.column FROM table1 t1 LEFT JOIN table2 t2 ON t1.id = t2.foreign_id LIMIT 100;',
    description: 'Join two tables'
  },
  {
    name: 'GROUP BY',
    query: 'SELECT column_name, COUNT(*) as count FROM table_name GROUP BY column_name ORDER BY count DESC;',
    description: 'Group and count records'
  }
]

export default function QueryExecutor() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<QueryHistory[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showTemplates, setShowTemplates] = useState(true)

  async function executeQuery() {
    if (!query.trim()) {
      setResult({
        data: null,
        error: 'Please enter a query',
        executionTime: 0,
        rowCount: 0
      })
      return
    }

    setLoading(true)
    const startTime = performance.now()

    try {
      // Use Supabase's RPC to execute raw SQL
      const { data, error } = await supabase.rpc('execute_sql', {
        query_text: query
      })

      const executionTime = Math.round(performance.now() - startTime)

      if (error) {
        const queryResult = {
          data: null,
          error: error.message,
          executionTime,
          rowCount: 0
        }
        setResult(queryResult)

        // Add to history
        setHistory(prev => [{
          query,
          timestamp: new Date(),
          success: false,
          executionTime
        }, ...prev.slice(0, 49)]) // Keep last 50

      } else {
        const queryResult = {
          data: Array.isArray(data) ? data : (data ? [data] : []),
          error: null,
          executionTime,
          rowCount: Array.isArray(data) ? data.length : (data ? 1 : 0)
        }
        setResult(queryResult)

        // Add to history
        setHistory(prev => [{
          query,
          timestamp: new Date(),
          success: true,
          rowCount: queryResult.rowCount,
          executionTime
        }, ...prev.slice(0, 49)])
      }

    } catch (err) {
      const executionTime = Math.round(performance.now() - startTime)
      setResult({
        data: null,
        error: err instanceof Error ? err.message : 'Unknown error occurred',
        executionTime,
        rowCount: 0
      })

      setHistory(prev => [{
        query,
        timestamp: new Date(),
        success: false,
        executionTime
      }, ...prev.slice(0, 49)])

    } finally {
      setLoading(false)
    }
  }

  function loadTemplate(template: string) {
    setQuery(template)
    setShowTemplates(false)
  }

  function loadFromHistory(historyQuery: string) {
    setQuery(historyQuery)
    setShowHistory(false)
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  function clearHistory() {
    setHistory([])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Code className="w-8 h-8 text-blue-500" />
          <div>
            <h3 className="text-2xl font-bold">Query Executor</h3>
            <p className="text-sm text-gray-400">Execute SQL queries against your database</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className={`flex items-center space-x-2 px-4 py-2 rounded transition ${
              showTemplates ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Templates</span>
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center space-x-2 px-4 py-2 rounded transition ${
              showHistory ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History ({history.length})</span>
          </button>
        </div>
      </div>

      {/* Query Templates */}
      {showTemplates && (
        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <h4 className="text-lg font-semibold mb-4">Query Templates</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {QUERY_TEMPLATES.map((template, idx) => (
              <button
                key={idx}
                onClick={() => loadTemplate(template.query)}
                className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800 hover:border-blue-600 transition text-left"
              >
                <div className="font-semibold text-sm text-blue-400 mb-1">{template.name}</div>
                <div className="text-xs text-gray-500">{template.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Query History */}
      {showHistory && (
        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold">Query History</h4>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded transition"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-gray-500 text-sm">No query history yet</p>
            ) : (
              history.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => loadFromHistory(item.query)}
                  className="bg-[#0f0f0f] rounded p-3 border border-gray-800 hover:border-gray-700 cursor-pointer transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {item.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                      <span className="text-xs text-gray-400">
                        {item.timestamp.toLocaleString()}
                      </span>
                    </div>
                    {item.executionTime && (
                      <span className="text-xs text-gray-500">{item.executionTime}ms</span>
                    )}
                  </div>
                  <code className="text-xs font-mono text-gray-300 line-clamp-2">
                    {item.query}
                  </code>
                  {item.success && item.rowCount !== undefined && (
                    <div className="text-xs text-green-400 mt-1">
                      {item.rowCount} row(s) affected
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Query Input */}
      <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">SQL Query</label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your SQL query here... (e.g., SELECT * FROM profiles LIMIT 10;)"
            className="w-full h-32 bg-[#0f0f0f] border border-gray-800 rounded px-4 py-3 font-mono text-sm focus:outline-none focus:border-blue-600 resize-none"
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                executeQuery()
              }
            }}
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              Press Ctrl+Enter to execute
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => copyToClipboard(query)}
                disabled={!query}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 rounded transition disabled:opacity-50"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
              <button
                onClick={executeQuery}
                disabled={loading || !query.trim()}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition disabled:opacity-50"
              >
                <Play className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Executing...' : 'Execute Query'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Query Results */}
      {result && (
        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold">Results</h4>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">{result.executionTime}ms</span>
              </div>
              {result.error ? (
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-red-500">Error</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">{result.rowCount} row(s)</span>
                </div>
              )}
            </div>
          </div>

          {result.error ? (
            <div className="bg-red-900/20 border border-red-800 rounded p-4">
              <p className="text-red-400 text-sm font-mono">{result.error}</p>
            </div>
          ) : result.data && result.data.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#0f0f0f] border-b border-gray-800">
                  <tr>
                    {Object.keys(result.data[0]).map((key) => (
                      <th key={key} className="text-left py-3 px-4 font-medium text-gray-400 whitespace-nowrap">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-800 hover:bg-[#0f0f0f] transition">
                      {Object.values(row).map((value, colIdx) => (
                        <td key={colIdx} className="py-2 px-4 font-mono text-xs max-w-xs truncate">
                          {value === null ? (
                            <span className="text-gray-600 italic">null</span>
                          ) : typeof value === 'object' ? (
                            <span className="text-blue-400">{JSON.stringify(value)}</span>
                          ) : typeof value === 'boolean' ? (
                            <span className={value ? 'text-green-400' : 'text-red-400'}>
                              {String(value)}
                            </span>
                          ) : (
                            <span>{String(value)}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Query executed successfully but returned no data</p>
            </div>
          )}
        </div>
      )}

      {/* Warning Message */}
      <div className="bg-orange-900/20 border border-orange-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange-400">
            <p className="font-semibold mb-1">Warning: Direct SQL Access</p>
            <p className="text-orange-500">
              Be careful when executing queries. This interface has direct database access.
              Always test queries carefully and avoid running destructive operations on production data.
              Row Level Security (RLS) policies still apply.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
