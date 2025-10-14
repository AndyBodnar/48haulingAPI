'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, Download, Eye, Search, Filter, Calendar, Truck, Package, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { audit } from '@/lib/audit'

interface BolDocument {
  id: string
  job_id: string
  load_number?: string
  truck_number?: string
  uploaded_by: string
  uploader_name?: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  attachment_type: string
  description: string | null
  created_at: string
}

export default function BolViewer() {
  const [documents, setDocuments] = useState<BolDocument[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<BolDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDocument, setSelectedDocument] = useState<BolDocument | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLoadNumber, setFilterLoadNumber] = useState('')
  const [filterTruckNumber, setFilterTruckNumber] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')

  useEffect(() => {
    fetchDocuments()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [documents, searchTerm, filterLoadNumber, filterTruckNumber, filterDateFrom, filterDateTo])

  const fetchDocuments = async () => {
    try {
      setLoading(true)

      // Fetch all BOL attachments with job and user info
      const { data, error } = await supabase
        .from('job_attachments')
        .select(`
          *,
          jobs:job_id (
            load_number,
            truck_number
          ),
          profiles:uploaded_by (
            full_name
          )
        `)
        .in('attachment_type', ['document', 'pod', 'photo'])
        .order('created_at', { ascending: false })

      if (error) throw error

      // Transform data to include job details
      const transformedData = (data || []).map((doc: any) => ({
        id: doc.id,
        job_id: doc.job_id,
        load_number: doc.jobs?.load_number,
        truck_number: doc.jobs?.truck_number,
        uploaded_by: doc.uploaded_by,
        uploader_name: doc.profiles?.full_name,
        file_name: doc.file_name,
        file_url: doc.file_url,
        file_type: doc.file_type,
        file_size: doc.file_size,
        attachment_type: doc.attachment_type,
        description: doc.description,
        created_at: doc.created_at,
      }))

      setDocuments(transformedData)
    } catch (error: any) {
      console.error('Error fetching documents:', error.message)
      toast.error('Failed to fetch documents')
      audit.error('view', 'document', error.message)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...documents]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.load_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.truck_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.uploader_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Load number filter
    if (filterLoadNumber) {
      filtered = filtered.filter(doc =>
        doc.load_number?.toLowerCase().includes(filterLoadNumber.toLowerCase())
      )
    }

    // Truck number filter
    if (filterTruckNumber) {
      filtered = filtered.filter(doc =>
        doc.truck_number?.toLowerCase().includes(filterTruckNumber.toLowerCase())
      )
    }

    // Date range filter
    if (filterDateFrom) {
      filtered = filtered.filter(doc =>
        new Date(doc.created_at) >= new Date(filterDateFrom)
      )
    }
    if (filterDateTo) {
      const toDate = new Date(filterDateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(doc =>
        new Date(doc.created_at) <= toDate
      )
    }

    setFilteredDocuments(filtered)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilterLoadNumber('')
    setFilterTruckNumber('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('image')) return '🖼️'
    return '📎'
  }

  const downloadDocument = async (doc: BolDocument) => {
    const toastId = toast.loading('Preparing download...')

    try {
      // Get signed URL from Supabase Storage
      const { data, error } = await supabase.storage
        .from('job-attachments')
        .createSignedUrl(doc.file_url, 3600) // 1 hour expiry

      if (error) throw error

      // Download file
      window.open(data.signedUrl, '_blank')
      toast.success('Document downloaded', { id: toastId })
      await audit.downloadDocument(doc.id, doc.file_name, doc.load_number)
    } catch (error: any) {
      console.error('Error downloading document:', error.message)
      toast.error('Failed to download document', { id: toastId })
      audit.error('download', 'document', error.message, { doc_id: doc.id, file_name: doc.file_name })
    }
  }

  const previewDocument = async (doc: BolDocument) => {
    setSelectedDocument(doc)
    setShowPreview(true)
    await audit.viewDocument(doc.id, doc.file_name, doc.load_number)
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Bill of Lading Documents</h1>
            <p className="text-gray-400">View and manage uploaded BOL documents, photos, and PDFs</p>
          </div>
          <button
            onClick={fetchDocuments}
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
              <p className="text-gray-400 text-sm">Total Documents</p>
              <p className="text-2xl font-bold mt-1">{documents.length}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">PDFs</p>
              <p className="text-2xl font-bold mt-1">
                {documents.filter(d => d.file_type.includes('pdf')).length}
              </p>
            </div>
            <FileText className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Images</p>
              <p className="text-2xl font-bold mt-1">
                {documents.filter(d => d.file_type.includes('image')).length}
              </p>
            </div>
            <FileText className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">This Week</p>
              <p className="text-2xl font-bold mt-1">
                {documents.filter(d => {
                  const weekAgo = new Date()
                  weekAgo.setDate(weekAgo.getDate() - 7)
                  return new Date(d.created_at) >= weekAgo
                }).length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="File name, load, truck..."
                className="w-full bg-[#0f0f0f] border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-green-600"
              />
            </div>
          </div>

          {/* Load Number */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Load Number</label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={filterLoadNumber}
                onChange={(e) => setFilterLoadNumber(e.target.value)}
                placeholder="e.g. LOAD-1001"
                className="w-full bg-[#0f0f0f] border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-green-600"
              />
            </div>
          </div>

          {/* Truck Number */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Truck Number</label>
            <div className="relative">
              <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={filterTruckNumber}
                onChange={(e) => setFilterTruckNumber(e.target.value)}
                placeholder="e.g. TRK-001"
                className="w-full bg-[#0f0f0f] border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-green-600"
              />
            </div>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">From Date</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full bg-[#0f0f0f] border border-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-green-600"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">To Date</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full bg-[#0f0f0f] border border-gray-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-green-600"
            />
          </div>
        </div>
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No documents found</p>
          <p className="text-gray-600 text-sm mt-2">
            {documents.length === 0
              ? 'Documents will appear here when drivers upload BOLs'
              : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0f0f0f] border-b border-gray-800">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400">File</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400">Load Number</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400">Truck</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400">Uploaded By</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400">Size</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400">Date</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-800 hover:bg-[#0f0f0f] transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getFileTypeIcon(doc.file_type)}</span>
                        <div>
                          <p className="font-medium">{doc.file_name}</p>
                          <p className="text-xs text-gray-500">{doc.file_type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-sm">{doc.load_number || 'N/A'}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-mono text-sm">{doc.truck_number || 'N/A'}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm">{doc.uploader_name || 'Unknown'}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-400">{formatFileSize(doc.file_size)}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-400">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => previewDocument(doc)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadDocument(doc)}
                          className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedDocument && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 w-full max-w-5xl max-h-[90vh] overflow-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <div>
                <h3 className="text-xl font-bold">{selectedDocument.file_name}</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Load: {selectedDocument.load_number} | Truck: {selectedDocument.truck_number}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => downloadDocument(selectedDocument)}
                  className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="p-6">
              {selectedDocument.file_type.includes('image') ? (
                <img
                  src={selectedDocument.file_url}
                  alt={selectedDocument.file_name}
                  className="w-full h-auto rounded-lg"
                />
              ) : selectedDocument.file_type.includes('pdf') ? (
                <iframe
                  src={selectedDocument.file_url}
                  className="w-full h-[600px] rounded-lg"
                  title={selectedDocument.file_name}
                />
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Preview not available for this file type</p>
                  <button
                    onClick={() => downloadDocument(selectedDocument)}
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Download to View
                  </button>
                </div>
              )}

              {/* Document Details */}
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Uploaded By</p>
                  <p className="font-medium">{selectedDocument.uploader_name}</p>
                </div>
                <div>
                  <p className="text-gray-400">Upload Date</p>
                  <p className="font-medium">{new Date(selectedDocument.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400">File Size</p>
                  <p className="font-medium">{formatFileSize(selectedDocument.file_size)}</p>
                </div>
                <div>
                  <p className="text-gray-400">File Type</p>
                  <p className="font-medium">{selectedDocument.file_type}</p>
                </div>
                {selectedDocument.description && (
                  <div className="col-span-2">
                    <p className="text-gray-400">Description</p>
                    <p className="font-medium">{selectedDocument.description}</p>
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
