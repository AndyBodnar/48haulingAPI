'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Plus, Edit, Trash2, Search, Phone, Mail, MapPin, TrendingUp, Clock } from 'lucide-react'

interface Driver {
  id: string
  full_name: string
  email: string
  phone: string
  role: string
  created_at: string
  // Stats
  total_loads?: number
  completed_loads?: number
  active_loads?: number
  last_active?: string
}

export default function DriverManagement() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)

  useEffect(() => {
    fetchDrivers()
  }, [])

  const fetchDrivers = async () => {
    setLoading(true)
    try {
      // Fetch drivers with stats
      const { data: driversData, error: driversError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver')
        .order('full_name')

      if (driversError) throw driversError

      // Fetch load stats for each driver
      const driversWithStats = await Promise.all(
        (driversData || []).map(async (driver) => {
          const { data: loadsData } = await supabase
            .from('jobs')
            .select('id, status')
            .eq('driver_id', driver.id)

          const totalLoads = loadsData?.length || 0
          const completedLoads = loadsData?.filter(l => l.status === 'completed').length || 0
          const activeLoads = loadsData?.filter(l => ['assigned', 'in_progress'].includes(l.status)).length || 0

          return {
            ...driver,
            total_loads: totalLoads,
            completed_loads: completedLoads,
            active_loads: activeLoads
          }
        })
      )

      setDrivers(driversWithStats)
    } catch (error: any) {
      console.error('Error fetching drivers:', error.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteDriver = async (id: string) => {
    if (!confirm('Are you sure you want to delete this driver? This action cannot be undone.')) return

    try {
      // Note: This will fail if driver has loads due to foreign key constraints
      // You may want to handle this differently in production
      const { error } = await supabase.auth.admin.deleteUser(id)

      if (error) throw error

      alert('Driver deleted successfully')
      fetchDrivers()
    } catch (error: any) {
      alert('Error deleting driver: ' + error.message)
    }
  }

  const filteredDrivers = drivers.filter(driver => {
    const searchLower = searchTerm.toLowerCase()
    return (
      driver.full_name?.toLowerCase().includes(searchLower) ||
      driver.email?.toLowerCase().includes(searchLower) ||
      driver.phone?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Driver Management</h1>
            <p className="text-gray-400">Manage drivers and view their performance</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Driver</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search drivers by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Drivers</p>
              <p className="text-2xl font-bold mt-1">{drivers.length}</p>
            </div>
            <User className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Drivers</p>
              <p className="text-2xl font-bold mt-1">
                {drivers.filter(d => d.active_loads && d.active_loads > 0).length}
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
              <p className="text-gray-400 text-sm">Total Loads</p>
              <p className="text-2xl font-bold mt-1">
                {drivers.reduce((sum, d) => sum + (d.total_loads || 0), 0)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Avg Loads/Driver</p>
              <p className="text-2xl font-bold mt-1">
                {drivers.length > 0
                  ? (drivers.reduce((sum, d) => sum + (d.total_loads || 0), 0) / drivers.length).toFixed(1)
                  : '0'}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Drivers Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 p-12 text-center">
          <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No drivers found</p>
          <p className="text-gray-600 text-sm mt-2">Add your first driver to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredDrivers.map((driver) => (
            <div key={driver.id} className="bg-[#1a1a1a] rounded-lg border border-gray-800 p-6 hover:border-gray-700 transition-colors">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                    {driver.full_name?.charAt(0).toUpperCase() || 'D'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{driver.full_name}</h3>
                    <p className="text-xs text-gray-400">Driver ID: {driver.id.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedDriver(driver)
                      setShowEditModal(true)
                    }}
                    className="text-blue-500 hover:text-blue-400 transition-colors p-1"
                    title="Edit driver"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteDriver(driver.id)}
                    className="text-red-500 hover:text-red-400 transition-colors p-1"
                    title="Delete driver"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{driver.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Phone className="w-4 h-4" />
                  <span>{driver.phone || 'No phone'}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-800">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-500">{driver.total_loads || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">Total</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500">{driver.completed_loads || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-500">{driver.active_loads || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">Active</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mt-4">
                {driver.active_loads && driver.active_loads > 0 ? (
                  <span className="inline-flex items-center space-x-2 px-3 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded-full">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span>Active</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-2 px-3 py-1 bg-gray-500/10 text-gray-500 text-xs font-medium rounded-full">
                    <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                    <span>Available</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <DriverFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchDrivers()
          }}
        />
      )}

      {showEditModal && selectedDriver && (
        <DriverFormModal
          driver={selectedDriver}
          onClose={() => {
            setShowEditModal(false)
            setSelectedDriver(null)
          }}
          onSuccess={() => {
            setShowEditModal(false)
            setSelectedDriver(null)
            fetchDrivers()
          }}
        />
      )}
    </div>
  )
}

// Driver Form Modal
function DriverFormModal({
  driver,
  onClose,
  onSuccess
}: {
  driver?: Driver | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    full_name: driver?.full_name || '',
    email: driver?.email || '',
    phone: driver?.phone || '',
    password: ''
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (driver) {
        // Update existing driver
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            phone: formData.phone
          })
          .eq('id', driver.id)

        if (error) throw error
        alert('Driver updated successfully')
      } else {
        // Create new driver
        // Note: This requires admin privileges. In production, you'd call an Edge Function
        const { data: { user }, error: signUpError } = await supabase.auth.admin.createUser({
          email: formData.email,
          password: formData.password,
          email_confirm: true,
          user_metadata: {
            full_name: formData.full_name,
            phone: formData.phone,
            role: 'driver'
          }
        })

        if (signUpError) throw signUpError

        // Update profile
        if (user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              full_name: formData.full_name,
              phone: formData.phone,
              role: 'driver'
            })
            .eq('id', user.id)

          if (profileError) throw profileError
        }

        alert('Driver created successfully')
      }

      onSuccess()
    } catch (error: any) {
      alert('Error saving driver: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 max-w-md w-full">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold">{driver ? 'Edit Driver' : 'Add New Driver'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Full Name *</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
              placeholder="John Doe"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Email *</label>
            <input
              type="email"
              required
              disabled={!!driver}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white disabled:opacity-50"
              placeholder="john@example.com"
            />
            {driver && <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Password (only for new drivers) */}
          {!driver && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Password *</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg focus:outline-none focus:border-green-600 text-white"
                placeholder="Minimum 6 characters"
                minLength={6}
              />
            </div>
          )}

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
              {submitting ? 'Saving...' : driver ? 'Update Driver' : 'Create Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
