'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Table,
  Plus,
  Edit,
  Trash2,
  Download,
  Key,
  Link as LinkIcon,
  Database,
  Search,
  Copy,
  AlertCircle,
  CheckCircle,
  Code
} from 'lucide-react'

interface TableSchema {
  tableName: string
  columns: Array<{
    name: string
    type: string
    nullable: boolean
    defaultValue: string | null
    isPrimaryKey: boolean
    isForeignKey: boolean
    foreignKeyTable?: string
    foreignKeyColumn?: string
  }>
  indexes: Array<{
    name: string
    columns: string[]
    isUnique: boolean
  }>
  constraints: Array<{
    name: string
    type: string
    definition: string
  }>
}

export default function SchemaManager() {
  const [tables, setTables] = useState<string[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [schema, setSchema] = useState<TableSchema | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateTable, setShowCreateTable] = useState(false)
  const [createTableSQL, setCreateTableSQL] = useState('')

  useEffect(() => {
    fetchTables()
  }, [])

  useEffect(() => {
    if (selectedTable) {
      fetchTableSchema(selectedTable)
    }
  }, [selectedTable])

  async function fetchTables() {
    try {
      setLoading(true)

      // Get list of all tables in public schema
      const { data, error } = await supabase.rpc('get_public_tables')

      if (error) {
        // Fallback to known tables
        setTables(['profiles', 'api_endpoints', 'api_metrics', 'error_logs', 'reported_issues', 'device_status', 'jobs'])
      } else {
        setTables(data || [])
      }
    } catch (err) {
      console.error('Error fetching tables:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTableSchema(tableName: string) {
    try {
      setLoading(true)

      // Get table schema information
      const { data: schemaData, error: schemaError } = await supabase.rpc('get_detailed_schema', {
        table_name: tableName
      })

      if (schemaError) {
        console.error('Schema error:', schemaError)
        // Fallback: basic info from querying the table
        const { data: sampleData } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        if (sampleData && sampleData.length > 0) {
          const columns = Object.keys(sampleData[0]).map(key => ({
            name: key,
            type: typeof sampleData[0][key],
            nullable: true,
            defaultValue: null,
            isPrimaryKey: key === 'id',
            isForeignKey: false
          }))

          setSchema({
            tableName,
            columns,
            indexes: [],
            constraints: []
          })
        }
      } else {
        setSchema(schemaData)
      }

    } catch (err) {
      console.error('Error fetching schema:', err)
    } finally {
      setLoading(false)
    }
  }

  function generateCreateTableSQL(tableName: string, columns: TableSchema['columns']) {
    let sql = `CREATE TABLE ${tableName} (\n`

    const columnDefs = columns.map(col => {
      let def = `  ${col.name} ${col.type}`
      if (col.isPrimaryKey) def += ' PRIMARY KEY'
      if (!col.nullable) def += ' NOT NULL'
      if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`
      return def
    })

    sql += columnDefs.join(',\n')
    sql += '\n);'

    return sql
  }

  function generateAlterTableSQL(tableName: string) {
    return `-- Add a new column
ALTER TABLE ${tableName} ADD COLUMN new_column VARCHAR(255);

-- Modify column type
ALTER TABLE ${tableName} ALTER COLUMN column_name TYPE INTEGER;

-- Drop column
ALTER TABLE ${tableName} DROP COLUMN column_name;

-- Add constraint
ALTER TABLE ${tableName} ADD CONSTRAINT constraint_name UNIQUE (column_name);`
  }

  function exportSchema() {
    if (!schema) return

    const sql = generateCreateTableSQL(schema.tableName, schema.columns)
    const blob = new Blob([sql], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${schema.tableName}_schema.sql`
    link.click()
    URL.revokeObjectURL(url)
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  const filteredTables = tables.filter(table =>
    table.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Database className="w-8 h-8 text-purple-500" />
          <div>
            <h3 className="text-2xl font-bold">Schema Manager</h3>
            <p className="text-sm text-gray-400">View and manage database schema</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateTable(!showCreateTable)}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create Table</span>
        </button>
      </div>

      {/* Create Table Section */}
      {showCreateTable && (
        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <h4 className="text-lg font-semibold mb-4">Create New Table</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">SQL Statement</label>
              <textarea
                value={createTableSQL}
                onChange={(e) => setCreateTableSQL(e.target.value)}
                placeholder="CREATE TABLE table_name (&#10;  id SERIAL PRIMARY KEY,&#10;  name VARCHAR(255) NOT NULL,&#10;  created_at TIMESTAMP DEFAULT NOW()&#10;);"
                className="w-full h-48 bg-[#0f0f0f] border border-gray-800 rounded px-4 py-3 font-mono text-sm focus:outline-none focus:border-purple-600 resize-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Use the Query Executor to run your CREATE TABLE statement
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => copyToClipboard(createTableSQL)}
                  disabled={!createTableSQL}
                  className="flex items-center space-x-1 px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded transition disabled:opacity-50"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
                <button
                  onClick={() => setShowCreateTable(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tables List */}
        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="mb-4">
            <div className="flex items-center space-x-2 bg-[#0f0f0f] rounded-lg px-3 py-2 border border-gray-800">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="spinner mx-auto"></div>
              </div>
            ) : filteredTables.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No tables found</p>
            ) : (
              filteredTables.map((table) => (
                <button
                  key={table}
                  onClick={() => setSelectedTable(table)}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded transition text-left ${
                    selectedTable === table
                      ? 'bg-purple-600 text-white'
                      : 'bg-[#0f0f0f] hover:bg-gray-800'
                  }`}
                >
                  <Table className="w-4 h-4" />
                  <span className="font-mono text-sm">{table}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Schema Details */}
        <div className="lg:col-span-2">
          {!selectedTable ? (
            <div className="bg-[#1a1a1a] rounded-lg p-12 border border-gray-800 text-center">
              <Table className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Select a table to view its schema</p>
            </div>
          ) : loading ? (
            <div className="bg-[#1a1a1a] rounded-lg p-12 border border-gray-800 text-center">
              <div className="spinner mx-auto mb-4"></div>
              <p className="text-gray-400">Loading schema...</p>
            </div>
          ) : schema ? (
            <div className="space-y-6">
              {/* Table Header */}
              <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xl font-bold mb-1">{schema.tableName}</h4>
                    <p className="text-sm text-gray-400">
                      {schema.columns.length} columns, {schema.indexes.length} indexes
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={exportSchema}
                      className="flex items-center space-x-1 px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded transition"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export SQL</span>
                    </button>
                    <button
                      onClick={() => copyToClipboard(generateCreateTableSQL(schema.tableName, schema.columns))}
                      className="flex items-center space-x-1 px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded transition"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy CREATE</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Columns */}
              <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
                <h5 className="text-lg font-semibold mb-4">Columns</h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-800">
                      <tr>
                        <th className="text-left py-2 px-3 font-medium text-gray-400">Name</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-400">Type</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-400">Nullable</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-400">Default</th>
                        <th className="text-center py-2 px-3 font-medium text-gray-400">Constraints</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schema.columns.map((column, idx) => (
                        <tr key={idx} className="border-b border-gray-800 hover:bg-[#0f0f0f]">
                          <td className="py-2 px-3">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono">{column.name}</span>
                              {column.isPrimaryKey && (
                                <span title="Primary Key">
                                  <Key className="w-3 h-3 text-yellow-500" />
                                </span>
                              )}
                              {column.isForeignKey && (
                                <span title="Foreign Key">
                                  <LinkIcon className="w-3 h-3 text-blue-500" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-purple-400 font-mono text-xs">{column.type}</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {column.nullable ? (
                              <span className="text-gray-500">✓</span>
                            ) : (
                              <span className="text-orange-500">NOT NULL</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {column.defaultValue ? (
                              <span className="text-gray-400 font-mono text-xs">{column.defaultValue}</span>
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              {column.isPrimaryKey && (
                                <span className="text-xs bg-yellow-900/30 text-yellow-400 px-2 py-0.5 rounded">
                                  PK
                                </span>
                              )}
                              {column.isForeignKey && (
                                <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded">
                                  FK
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Indexes */}
              {schema.indexes.length > 0 && (
                <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
                  <h5 className="text-lg font-semibold mb-4">Indexes</h5>
                  <div className="space-y-2">
                    {schema.indexes.map((index, idx) => (
                      <div key={idx} className="bg-[#0f0f0f] rounded p-3 border border-gray-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-sm">{index.name}</span>
                            {index.isUnique && (
                              <span className="ml-2 text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded">
                                UNIQUE
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {index.columns.join(', ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ALTER TABLE Examples */}
              <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-lg font-semibold">Modify Table</h5>
                  <button
                    onClick={() => copyToClipboard(generateAlterTableSQL(schema.tableName))}
                    className="flex items-center space-x-1 px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 rounded transition"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Examples</span>
                  </button>
                </div>
                <pre className="bg-[#0f0f0f] rounded p-4 border border-gray-800 text-xs font-mono text-gray-300 overflow-x-auto">
                  {generateAlterTableSQL(schema.tableName)}
                </pre>
                <p className="text-xs text-gray-500 mt-2">
                  Copy these examples and use the Query Executor to modify the table
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#1a1a1a] rounded-lg p-12 border border-gray-800 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <p className="text-gray-400">Failed to load schema</p>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-400">
            <p className="font-semibold mb-1">Schema Modification</p>
            <p className="text-blue-500">
              To create or modify tables, copy the SQL statements and execute them in the Query Executor.
              Schema changes require appropriate database permissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
