'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, AlertTriangle, CheckCircle, XCircle, Eye, Calendar, Truck, User, Image as ImageIcon, Filter, Search } from 'lucide-react'

interface Dvir {
  id: string
  dvir_number: string
  driver_id: string
  driver_name?: string
  job_id: number | null
  vehicle_number: string
  vehicle_make: string
  vehicle_model: string
  vehicle_year: number
  inspection_type: 'pre-trip' | 'post-trip'
  inspection_date: string
  defects_found: boolean
  defects_description: string
  odometer_reading: number
  inspection_location: string
  driver_signature_url: string
  defect_photos: any[]
  status: 'submitted' | 'reviewed' | 'requires_repair' | 'repaired'
  safe_to_operate: boolean | null
  reviewed_by: string | null
  reviewed_at: string | null
  admin_notes: string | null
  repair_notes: string | null
  repaired_at: string | null
  created_at: string

  // Inspection items
  brakes_ok: boolean
  brakes_notes: string
  lights_ok: boolean
  lights_notes: string
  tires_ok: boolean
  tires_notes: string
  mirrors_ok: boolean
  mirrors_notes: string
  horn_ok: boolean
  horn_notes: string
  wipers_ok: boolean
  wipers_notes: string
  seatbelt_ok: boolean
  seatbelt_notes: string
  engine_ok: boolean
  engine_notes: string
  transmission_ok: boolean
  transmission_notes: string
  steering_ok: boolean
  steering_notes: string
  suspension_ok: boolean
  suspension_notes: string
  exhaust_ok: boolean
  exhaust_notes: string
  fuel_system_ok: boolean
  fuel_system_notes: string
  coupling_devices_ok: boolean
  coupling_devices_notes: string
}

export default function DvirManagement() {
  const [dvirs, setDvirs] = useState<Dvir[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [defectsFilter, setDefectsFilter] = useState<string>('all')
  const [selectedDvir, setSelectedDvir] = useState<Dvir | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)

  useEffect(() => {
    fetchDvirs()
  }, [statusFilter, defectsFilter])

  const fetchDvirs = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('dvirs')
        .select(`
          *,
          profiles:driver_id (
            full_name
          )
        `)
        .order('inspection_date', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (defectsFilter === 'with_defects') {
        query = query.eq('defects_found', true)
      } else if (defectsFilter === 'no_defects') {
        query = query.eq('defects_found', false)
      }

      const { data, error } = await query

      if (error) throw error

      const formattedData = data?.map(dvir => ({
        ...dvir,
        driver_name: dvir.profiles?.full_name || 'Unknown Driver'
      })) || []

      setDvirs(formattedData)
    } catch (error: any) {
      console.error('Error fetching DVIRs:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'text-blue-500 bg-blue-500/10'
      case 'reviewed': return 'text-green-500 bg-green-500/10'
      case 'requires_repair': return 'text-red-500 bg-red-500/10'
      case 'repaired': return 'text-purple-500 bg-purple-500/10'
      default: return 'text-gray-500 bg-gray-500/10'
    }
  }

  const filteredDvirs = dvirs.filter(dvir => {
    const searchLower = searchTerm.toLowerCase()
    return (
      dvir.dvir_number?.toLowerCase().includes(searchLower) ||
      dvir.vehicle_number?.toLowerCase().includes(searchLower) ||
      dvir.driver_name?.toLowerCase().includes(searchLower) ||
      dvir.vehicle_make?.toLowerCase().includes(searchLower) ||
      dvir.vehicle_model?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">DVIR Management</h1>
            <p className="text-gray-400">Driver Vehicle Inspection Reports</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by DVIR number, vehicle, or driver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
              <option value="requires_repair">Requires Repair</option>
              <option value="repaired">Repaired</option>
            </select>
          </div>

          {/* Defects Filter */}
          <select
            value={defectsFilter}
            onChange={(e) => setDefectsFilter(e.target.value)}
            className="px-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
          >
            <option value="all">All DVIRs</option>
            <option value="with_defects">With Defects</option>
            <option value="no_defects">No Defects</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total DVIRs</p>
              <p className="text-2xl font-bold mt-1">{dvirs.length}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">With Defects</p>
              <p className="text-2xl font-bold mt-1 text-red-500">
                {dvirs.filter(d => d.defects_found).length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Pending Review</p>
              <p className="text-2xl font-bold mt-1 text-yellow-500">
                {dvirs.filter(d => d.status === 'submitted').length}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Needs Repair</p>
              <p className="text-2xl font-bold mt-1 text-orange-500">
                {dvirs.filter(d => d.status === 'requires_repair').length}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* DVIRs Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : filteredDvirs.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No DVIRs found</p>
          <p className="text-gray-600 text-sm mt-2">DVIRs will appear here when drivers submit inspections</p>
        </div>
      ) : (
        <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0f0f0f] border-b border-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">DVIR #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Vehicle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Defects</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredDvirs.map((dvir) => (
                  <tr key={dvir.id} className="hover:bg-[#0f0f0f] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-medium">{dvir.dvir_number}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        dvir.inspection_type === 'pre-trip' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'
                      }`}>
                        {dvir.inspection_type === 'pre-trip' ? 'PRE-TRIP' : 'POST-TRIP'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{dvir.driver_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium">{dvir.vehicle_number}</div>
                        <div className="text-gray-400 text-xs">
                          {dvir.vehicle_year} {dvir.vehicle_make} {dvir.vehicle_model}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {new Date(dvir.inspection_date).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(dvir.inspection_date).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {dvir.defects_found ? (
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-red-500 font-medium">Yes</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-500 font-medium">No</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(dvir.status)}`}>
                        {dvir.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedDvir(dvir)
                            setShowDetailModal(true)
                          }}
                          className="text-blue-500 hover:text-blue-400 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {dvir.status === 'submitted' && (
                          <button
                            onClick={() => {
                              setSelectedDvir(dvir)
                              setShowReviewModal(true)
                            }}
                            className="text-green-500 hover:text-green-400 transition-colors"
                            title="Review DVIR"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedDvir && (
        <DvirDetailModal
          dvir={selectedDvir}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedDvir(null)
          }}
        />
      )}

      {/* Review Modal */}
      {showReviewModal && selectedDvir && (
        <DvirReviewModal
          dvir={selectedDvir}
          onClose={() => {
            setShowReviewModal(false)
            setSelectedDvir(null)
          }}
          onSuccess={() => {
            setShowReviewModal(false)
            setSelectedDvir(null)
            fetchDvirs()
          }}
        />
      )}
    </div>
  )
}

// DVIR Detail Modal
function DvirDetailModal({ dvir, onClose }: { dvir: Dvir; onClose: () => void }) {
  const inspectionItems = [
    { label: 'Brakes', ok: dvir.brakes_ok, notes: dvir.brakes_notes },
    { label: 'Lights', ok: dvir.lights_ok, notes: dvir.lights_notes },
    { label: 'Tires', ok: dvir.tires_ok, notes: dvir.tires_notes },
    { label: 'Mirrors', ok: dvir.mirrors_ok, notes: dvir.mirrors_notes },
    { label: 'Horn', ok: dvir.horn_ok, notes: dvir.horn_notes },
    { label: 'Wipers', ok: dvir.wipers_ok, notes: dvir.wipers_notes },
    { label: 'Seatbelt', ok: dvir.seatbelt_ok, notes: dvir.seatbelt_notes },
    { label: 'Engine', ok: dvir.engine_ok, notes: dvir.engine_notes },
    { label: 'Transmission', ok: dvir.transmission_ok, notes: dvir.transmission_notes },
    { label: 'Steering', ok: dvir.steering_ok, notes: dvir.steering_notes },
    { label: 'Suspension', ok: dvir.suspension_ok, notes: dvir.suspension_notes },
    { label: 'Exhaust', ok: dvir.exhaust_ok, notes: dvir.exhaust_notes },
    { label: 'Fuel System', ok: dvir.fuel_system_ok, notes: dvir.fuel_system_notes },
    { label: 'Coupling Devices', ok: dvir.coupling_devices_ok, notes: dvir.coupling_devices_notes },
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 max-w-4xl w-full my-8">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">DVIR Details</h2>
            <p className="text-gray-400 text-sm mt-1">{dvir.dvir_number}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Vehicle & Driver Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Truck className="w-5 h-5" />
                <span>Vehicle Information</span>
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Vehicle Number:</span>
                  <span className="font-medium">{dvir.vehicle_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Make/Model:</span>
                  <span className="font-medium">{dvir.vehicle_year} {dvir.vehicle_make} {dvir.vehicle_model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Odometer:</span>
                  <span className="font-medium">{dvir.odometer_reading?.toLocaleString()} mi</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <User className="w-5 h-5" />
                <span>Inspection Information</span>
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Driver:</span>
                  <span className="font-medium">{dvir.driver_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span className="font-medium">{dvir.inspection_type === 'pre-trip' ? 'Pre-Trip' : 'Post-Trip'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Date:</span>
                  <span className="font-medium">{new Date(dvir.inspection_date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Location:</span>
                  <span className="font-medium">{dvir.inspection_location || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Defects Summary */}
          {dvir.defects_found && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-semibold text-red-500">Defects Found</h3>
              </div>
              <p className="text-sm text-gray-300">{dvir.defects_description || 'No description provided'}</p>
            </div>
          )}

          {/* Inspection Checklist */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Inspection Checklist</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inspectionItems.map((item, index) => (
                <div key={index} className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{item.label}</span>
                    {item.ok ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-sm text-gray-400 mt-2">{item.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Photos */}
          {dvir.defect_photos && dvir.defect_photos.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <ImageIcon className="w-5 h-5" />
                <span>Defect Photos</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {dvir.defect_photos.map((photo: any, index: number) => (
                  <div key={index} className="relative aspect-square bg-[#0f0f0f] rounded-lg overflow-hidden border border-gray-800">
                    <img
                      src={photo.url || photo}
                      alt={`Defect photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signature */}
          {dvir.driver_signature_url && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Driver Signature</h3>
              <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
                <img
                  src={dvir.driver_signature_url}
                  alt="Driver signature"
                  className="max-w-xs h-24 object-contain"
                />
              </div>
            </div>
          )}

          {/* Admin Notes */}
          {dvir.admin_notes && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Admin Notes</h3>
              <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
                <p className="text-sm text-gray-300">{dvir.admin_notes}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// DVIR Review Modal
function DvirReviewModal({
  dvir,
  onClose,
  onSuccess
}: {
  dvir: Dvir
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    status: 'reviewed' as 'reviewed' | 'requires_repair',
    safe_to_operate: true,
    admin_notes: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('dvirs')
        .update({
          ...formData,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', dvir.id)

      if (error) throw error

      alert('DVIR reviewed successfully')
      onSuccess()
    } catch (error: any) {
      alert('Error reviewing DVIR: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 max-w-2xl w-full">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold">Review DVIR</h2>
          <p className="text-gray-400 text-sm mt-1">{dvir.dvir_number}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Review Status *</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
              required
            >
              <option value="reviewed">Reviewed - Approved</option>
              <option value="requires_repair">Requires Repair</option>
            </select>
          </div>

          {/* Safe to Operate */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Safe to Operate? *</label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.safe_to_operate === true}
                  onChange={() => setFormData({ ...formData, safe_to_operate: true })}
                  className="w-4 h-4 text-green-600"
                />
                <span>Yes</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.safe_to_operate === false}
                  onChange={() => setFormData({ ...formData, safe_to_operate: false })}
                  className="w-4 h-4 text-red-600"
                />
                <span>No</span>
              </label>
            </div>
          </div>

          {/* Admin Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Admin Notes</label>
            <textarea
              value={formData.admin_notes}
              onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
              placeholder="Add any notes or instructions..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
