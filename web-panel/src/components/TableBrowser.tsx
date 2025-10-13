'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Table, Eye, Search, Download, ChevronLeft, ChevronRight, Info, X, FileJson, FileSpreadsheet } from 'lucide-react'

interface TableColumn {
  name: string
  type: string
  nullable: boolean
  defaultValue: string | null
}

interface TableBrowserProps {
  tableName: string
  onClose: () => void
}

export default function TableBrowser({ tableName, onClose }: TableBrowserProps) {
  const [columns, setColumns] = useState<TableColumn[]>([])
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [showSchema, setShowSchema] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const rowsPerPage = 50

  useEffect(() => {
    fetchTableData()
  }, [tableName, page])

  async function fetchTableData() {
    try {
      setLoading(true)
      setError(null)

      // Fetch schema information
      const { data: schemaData, error: schemaError } = await supabase
        .rpc('get_table_schema', { table_name: tableName })

      if (schemaError) {
        // Fallback: Just get the data and infer columns
        console.warn('Could not fetch schema, inferring from data')
      }

      // Fetch data with pagination
      const start = page * rowsPerPage
      const end = start + rowsPerPage - 1

      const { data, error: dataError, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .range(start, end)

      if (dataError) throw dataError

      setRows(data || [])
      setTotalCount(count || 0)

      // Infer columns from first row if we don't have schema
      if (data && data.length > 0) {
        const inferredColumns: TableColumn[] = Object.keys(data[0]).map(key => ({
          name: key,
          type: typeof data[0][key],
          nullable: true,
          defaultValue: null
        }))
        setColumns(schemaData || inferredColumns)
      } else if (schemaData) {
        setColumns(schemaData)
      }

    } catch (err) {
      console.error('Error fetching table data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch table data')
    } finally {
      setLoading(false)
    }
  }

  function exportToJSON() {
    const dataStr = JSON.stringify(rows, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${tableName}_${new Date().toISOString()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function exportToCSV() {
    if (rows.length === 0) return

    const headers = Object.keys(rows[0])
    const csvRows = [
      headers.join(','),
      ...rows.map(row =>
        headers.map(header => {
          const value = row[header]
          const stringValue = value === null ? '' : String(value)
          // Escape quotes and wrap in quotes if contains comma
          return stringValue.includes(',') || stringValue.includes('"')
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue
        }).join(',')
      )
    ]

    const csvStr = csvRows.join('\n')
    const dataBlob = new Blob([csvStr], { type: 'text/csv' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${tableName}_${new Date().toISOString()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const filteredRows = searchTerm
    ? rows.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : rows

  const totalPages = Math.ceil(totalCount / rowsPerPage)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <Table className="w-6 h-6 text-green-500" />
            <div>
              <h2 className="text-xl font-bold">{tableName}</h2>
              <p className="text-sm text-gray-400">{totalCount.toLocaleString()} total records</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 space-x-4">
          {/* Search */}
          <div className="flex-1 flex items-center space-x-2 bg-[#0f0f0f] rounded-lg px-3 py-2 border border-gray-800">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search in current page..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSchema(!showSchema)}
              className={`flex items-center space-x-2 px-3 py-2 rounded transition ${
                showSchema ? 'bg-green-600' : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <Info className="w-4 h-4" />
              <span className="text-sm">Schema</span>
            </button>

            <button
              onClick={exportToJSON}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded transition"
              title="Export to JSON"
            >
              <FileJson className="w-4 h-4" />
            </button>

            <button
              onClick={exportToCSV}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded transition"
              title="Export to CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Schema View */}
        {showSchema && (
          <div className="p-4 bg-[#0f0f0f] border-b border-gray-800">
            <h3 className="text-sm font-semibold mb-3">Table Schema</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {columns.map((col) => (
                <div key={col.name} className="bg-[#1a1a1a] rounded p-3 border border-gray-800">
                  <div className="font-mono text-sm font-semibold text-green-400">{col.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{col.type}</div>
                  {!col.nullable && (
                    <span className="text-xs text-orange-400">NOT NULL</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="spinner"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-red-500">{error}</p>
              </div>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">No data found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#1a1a1a] border-b border-gray-800">
                  <tr>
                    {columns.map((col) => (
                      <th key={col.name} className="text-left py-3 px-4 font-medium text-gray-400 whitespace-nowrap">
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-800 hover:bg-[#0f0f0f] transition">
                      {columns.map((col) => (
                        <td key={col.name} className="py-2 px-4 font-mono text-xs max-w-xs truncate">
                          {row[col.name] === null ? (
                            <span className="text-gray-600 italic">null</span>
                          ) : typeof row[col.name] === 'object' ? (
                            <span className="text-blue-400">{JSON.stringify(row[col.name])}</span>
                          ) : typeof row[col.name] === 'boolean' ? (
                            <span className={row[col.name] ? 'text-green-400' : 'text-red-400'}>
                              {String(row[col.name])}
                            </span>
                          ) : (
                            <span>{String(row[col.name])}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-gray-800">
          <div className="text-sm text-gray-400">
            Page {page + 1} of {totalPages} ({totalCount.toLocaleString()} total records)
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="flex items-center space-x-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Previous</span>
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center space-x-1 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-sm">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
