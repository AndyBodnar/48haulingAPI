'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Truck, MapPin, Calendar, User, Edit, Trash2, Plus, Search, Filter, ExternalLink } from 'lucide-react'

interface Load {
  id: number
  load_number: string
  status: string
  driver_id: string | null
  driver_name?: string
  pickup_location: string
  pickup_address: string
  pickup_datetime: string
  delivery_location: string
  delivery_address: string
  delivery_datetime: string
  weight: number
  weight_unit: string
  cargo_type: string
  cargo_description: string
  special_instructions: string
  rate: number
  distance_miles: number
  priority: string
  created_at: string
}

interface Driver {
  id: string
  full_name: string
  email: string
  phone: string
}

export default function LoadsManagement() {
  const [loads, setLoads] = useState<Load[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null)

  useEffect(() => {
    fetchLoads()
    fetchDrivers()
  }, [statusFilter])

  const fetchLoads = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          profiles:driver_id (
            full_name
          )
        `)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error

      const formattedData = data?.map(job => ({
        ...job,
        driver_name: job.profiles?.full_name || 'Unassigned'
      })) || []

      setLoads(formattedData)
    } catch (error: any) {
      console.error('Error fetching loads:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .eq('role', 'driver')
        .order('full_name')

      if (error) throw error
      setDrivers(data || [])
    } catch (error: any) {
      console.error('Error fetching drivers:', error.message)
    }
  }

  const deleteLoad = async (id: number) => {
    if (!confirm('Are you sure you want to delete this load?')) return

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id)

      if (error) throw error

      alert('Load deleted successfully')
      fetchLoads()
    } catch (error: any) {
      alert('Error deleting load: ' + error.message)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-500 bg-red-500/10'
      case 'high': return 'text-orange-500 bg-orange-500/10'
      case 'normal': return 'text-blue-500 bg-blue-500/10'
      case 'low': return 'text-gray-500 bg-gray-500/10'
      default: return 'text-gray-500 bg-gray-500/10'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500 bg-green-500/10'
      case 'in_progress': return 'text-blue-500 bg-blue-500/10'
      case 'assigned': return 'text-purple-500 bg-purple-500/10'
      case 'pending': return 'text-yellow-500 bg-yellow-500/10'
      case 'cancelled': return 'text-red-500 bg-red-500/10'
      default: return 'text-gray-500 bg-gray-500/10'
    }
  }

  const filteredLoads = loads.filter(load => {
    const searchLower = searchTerm.toLowerCase()
    return (
      load.load_number?.toLowerCase().includes(searchLower) ||
      load.pickup_location?.toLowerCase().includes(searchLower) ||
      load.delivery_location?.toLowerCase().includes(searchLower) ||
      load.driver_name?.toLowerCase().includes(searchLower) ||
      load.cargo_type?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Loads Management</h1>
            <p className="text-gray-400">Manage and track all loads</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Load</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search loads by number, location, driver, or cargo..."
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
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Loads</p>
              <p className="text-2xl font-bold mt-1">{loads.length}</p>
            </div>
            <Truck className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">In Progress</p>
              <p className="text-2xl font-bold mt-1">
                {loads.filter(l => l.status === 'in_progress').length}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Completed Today</p>
              <p className="text-2xl font-bold mt-1">
                {loads.filter(l => l.status === 'completed' && new Date(l.created_at).toDateString() === new Date().toDateString()).length}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Unassigned</p>
              <p className="text-2xl font-bold mt-1">
                {loads.filter(l => !l.driver_id).length}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Loads Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : filteredLoads.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 p-12 text-center">
          <Truck className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No loads found</p>
          <p className="text-gray-600 text-sm mt-2">Create your first load to get started</p>
        </div>
      ) : (
        <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0f0f0f] border-b border-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Load #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Driver</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Pickup</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Delivery</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Cargo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredLoads.map((load) => (
                  <tr key={load.id} className="hover:bg-[#0f0f0f] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="font-mono text-sm font-medium">{load.load_number || `LD-${load.id}`}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(load.status)}`}>
                        {load.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(load.priority)}`}>
                        {load.priority?.toUpperCase() || 'NORMAL'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{load.driver_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium">{load.pickup_location || 'N/A'}</div>
                        <div className="text-gray-400 text-xs">
                          {load.pickup_datetime ? new Date(load.pickup_datetime).toLocaleDateString() : 'Not set'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium">{load.delivery_location || 'N/A'}</div>
                        <div className="text-gray-400 text-xs">
                          {load.delivery_datetime ? new Date(load.delivery_datetime).toLocaleDateString() : 'Not set'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium">{load.cargo_type || 'N/A'}</div>
                        <div className="text-gray-400 text-xs">
                          {load.weight ? `${load.weight} ${load.weight_unit || 'lbs'}` : 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium">${load.rate?.toFixed(2) || '0.00'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedLoad(load)
                            setShowEditModal(true)
                          }}
                          className="text-blue-500 hover:text-blue-400 transition-colors"
                          title="Edit load"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteLoad(load.id)}
                          className="text-red-500 hover:text-red-400 transition-colors"
                          title="Delete load"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLoad(load)
                            // Would open detail modal
                          }}
                          className="text-gray-400 hover:text-white transition-colors"
                          title="View details"
                        >
                          <ExternalLink className="w-4 h-4" />
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

      {/* Create/Edit Modal would go here */}
      {showCreateModal && (
        <LoadFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchLoads()
          }}
          drivers={drivers}
        />
      )}

      {showEditModal && selectedLoad && (
        <LoadFormModal
          load={selectedLoad}
          onClose={() => {
            setShowEditModal(false)
            setSelectedLoad(null)
          }}
          onSuccess={() => {
            setShowEditModal(false)
            setSelectedLoad(null)
            fetchLoads()
          }}
          drivers={drivers}
        />
      )}
    </div>
  )
}

// Load Form Modal Component
function LoadFormModal({
  load,
  onClose,
  onSuccess,
  drivers
}: {
  load?: Load | null
  onClose: () => void
  onSuccess: () => void
  drivers: Driver[]
}) {
  const [formData, setFormData] = useState({
    driver_id: load?.driver_id || '',
    pickup_location: load?.pickup_location || '',
    pickup_address: load?.pickup_address || '',
    pickup_datetime: load?.pickup_datetime || '',
    delivery_location: load?.delivery_location || '',
    delivery_address: load?.delivery_address || '',
    delivery_datetime: load?.delivery_datetime || '',
    weight: load?.weight || 0,
    weight_unit: load?.weight_unit || 'lbs',
    cargo_type: load?.cargo_type || '',
    cargo_description: load?.cargo_description || '',
    special_instructions: load?.special_instructions || '',
    rate: load?.rate || 0,
    distance_miles: load?.distance_miles || 0,
    priority: load?.priority || 'normal',
    status: load?.status || 'pending'
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (load) {
        // Update existing load
        const { error } = await supabase
          .from('jobs')
          .update(formData)
          .eq('id', load.id)

        if (error) throw error
        alert('Load updated successfully')
      } else {
        // Create new load
        const { error } = await supabase
          .from('jobs')
          .insert([formData])

        if (error) throw error
        alert('Load created successfully')
      }

      onSuccess()
    } catch (error: any) {
      alert('Error saving load: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 max-w-4xl w-full my-8">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold">{load ? 'Edit Load' : 'Create New Load'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Driver Assignment */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Assign Driver</label>
              <select
                value={formData.driver_id}
                onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
              >
                <option value="">Unassigned</option>
                {drivers.map(driver => (
                  <option key={driver.id} value={driver.id}>{driver.full_name}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Pickup Location */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Pickup Location *</label>
              <input
                type="text"
                required
                value={formData.pickup_location}
                onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
                placeholder="City, State"
              />
            </div>

            {/* Pickup Address */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Pickup Address *</label>
              <input
                type="text"
                required
                value={formData.pickup_address}
                onChange={(e) => setFormData({ ...formData, pickup_address: e.target.value })}
                className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
                placeholder="Full street address"
              />
            </div>

            {/* Pickup DateTime */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Pickup Date/Time</label>
              <input
                type="datetime-local"
                value={formData.pickup_datetime ? new Date(formData.pickup_datetime).toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, pickup_datetime: e.target.value })}
                className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
              />
            </div>

            {/* Delivery Location */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Delivery Location *</label>
              <input
                type="text"
                required
                value={formData.delivery_location}
                onChange={(e) => setFormData({ ...formData, delivery_location: e.target.value })}
                className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
                placeholder="City, State"
              />
            </div>

            {/* Delivery Address */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Delivery Address *</label>
              <input
                type="text"
                required
                value={formData.delivery_address}
                onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
                placeholder="Full street address"
              />
            </div>

            {/* Delivery DateTime */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Delivery Date/Time</label>
              <input
                type="datetime-local"
                value={formData.delivery_datetime ? new Date(formData.delivery_datetime).toISOString().slice(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, delivery_datetime: e.target.value })}
                className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
              />
            </div>

            {/* Cargo Type */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Cargo Type</label>
              <input
                type="text"
                value={formData.cargo_type}
                onChange={(e) => setFormData({ ...formData, cargo_type: e.target.value })}
                className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
                placeholder="e.g., Dry Goods, Refrigerated"
              />
            </div>

            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Weight</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                  className="flex-1 px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
                  placeholder="0"
                />
                <select
                  value={formData.weight_unit}
                  onChange={(e) => setFormData({ ...formData, weight_unit: e.target.value })}
                  className="px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
                >
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                  <option value="tons">tons</option>
                </select>
              </div>
            </div>

            {/* Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Rate ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
                placeholder="0.00"
              />
            </div>

            {/* Distance */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Distance (miles)</label>
              <input
                type="number"
                step="0.1"
                value={formData.distance_miles}
                onChange={(e) => setFormData({ ...formData, distance_miles: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
                placeholder="0"
              />
            </div>
          </div>

          {/* Cargo Description */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Cargo Description</label>
            <textarea
              value={formData.cargo_description}
              onChange={(e) => setFormData({ ...formData, cargo_description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
              placeholder="Detailed description of cargo..."
            />
          </div>

          {/* Special Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Special Instructions</label>
            <textarea
              value={formData.special_instructions}
              onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
              placeholder="Any special handling requirements..."
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
              {submitting ? 'Saving...' : load ? 'Update Load' : 'Create Load'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
