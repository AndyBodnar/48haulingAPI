'use client'

import { useState } from 'react'
import LiveStatusTab from '@/components/LiveStatusTab'
import ErrorLogsTab from '@/components/ErrorLogsTab'
import UserIssuesTab from '@/components/UserIssuesTab'
import APIObservabilityDashboard from '@/components/APIObservabilityDashboard'
import DatabaseTab from '@/components/DatabaseTab'
import Sidebar from '@/components/Sidebar'
import LoadsManagement from '@/components/LoadsManagement'
import DvirManagement from '@/components/DvirManagement'
import MessagingSystem from '@/components/MessagingSystem'
import DriverManagement from '@/components/DriverManagement'
import GpsTracking from '@/components/GpsTracking'

type Tab = 'dashboard' | 'loads' | 'drivers' | 'dvirs' | 'messages' | 'gps' | 'observability' | 'live' | 'errors' | 'issues' | 'database'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as Tab)} />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 overflow-auto">
        {activeTab === 'dashboard' && <DashboardHome />}
        {activeTab === 'loads' && <LoadsManagement />}
        {activeTab === 'drivers' && <DriverManagement />}
        {activeTab === 'dvirs' && <DvirManagement />}
        {activeTab === 'messages' && <MessagingSystem />}
        {activeTab === 'gps' && <GpsTracking />}
        {activeTab === 'observability' && <APIObservabilityDashboard />}
        {activeTab === 'live' && <TabWrapper><LiveStatusTab /></TabWrapper>}
        {activeTab === 'errors' && <TabWrapper><ErrorLogsTab /></TabWrapper>}
        {activeTab === 'issues' && <TabWrapper><UserIssuesTab /></TabWrapper>}
        {activeTab === 'database' && <TabWrapper><DatabaseTab /></TabWrapper>}
      </div>
    </div>
  )
}

// Wrapper for old tabs to give them proper styling
function TabWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100">
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}

// Simple dashboard home
function DashboardHome() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-100">
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome to 48 Hauling Dashboard</h1>
          <p className="text-gray-400">Complete logistics and fleet management system</p>
        </div>

        {/* Business Features */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Business Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800 hover:border-green-600 transition-colors">
              <h3 className="text-lg font-semibold mb-2 flex items-center space-x-2">
                <span className="text-2xl">🚚</span>
                <span>Loads Management</span>
              </h3>
              <p className="text-sm text-gray-400 mt-2">Create, assign, and track loads with full pickup/delivery details</p>
            </div>

            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800 hover:border-green-600 transition-colors">
              <h3 className="text-lg font-semibold mb-2 flex items-center space-x-2">
                <span className="text-2xl">👥</span>
                <span>Driver Management</span>
              </h3>
              <p className="text-sm text-gray-400 mt-2">Manage drivers, view performance, and track availability</p>
            </div>

            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800 hover:border-green-600 transition-colors">
              <h3 className="text-lg font-semibold mb-2 flex items-center space-x-2">
                <span className="text-2xl">📋</span>
                <span>DVIR Reports</span>
              </h3>
              <p className="text-sm text-gray-400 mt-2">Review vehicle inspections and manage defects/repairs</p>
            </div>

            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800 hover:border-green-600 transition-colors">
              <h3 className="text-lg font-semibold mb-2 flex items-center space-x-2">
                <span className="text-2xl">💬</span>
                <span>Messaging</span>
              </h3>
              <p className="text-sm text-gray-400 mt-2">Chat with drivers in real-time about loads and logistics</p>
            </div>

            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800 hover:border-green-600 transition-colors">
              <h3 className="text-lg font-semibold mb-2 flex items-center space-x-2">
                <span className="text-2xl">📍</span>
                <span>GPS Tracking</span>
              </h3>
              <p className="text-sm text-gray-400 mt-2">Real-time location tracking and route history</p>
            </div>

            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800 border-dashed opacity-50">
              <h3 className="text-lg font-semibold mb-2 flex items-center space-x-2">
                <span className="text-2xl">📊</span>
                <span>Analytics</span>
              </h3>
              <p className="text-sm text-gray-400 mt-2">Coming soon - Performance metrics and insights</p>
            </div>
          </div>
        </div>

        {/* Technical Features */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Technical & Monitoring</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
              <h3 className="text-lg font-semibold mb-2">API Endpoints</h3>
              <p className="text-3xl font-bold text-green-500">24</p>
              <p className="text-sm text-gray-400 mt-2">Active Edge Functions</p>
            </div>

            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
              <h3 className="text-lg font-semibold mb-2">API Observability</h3>
              <p className="text-3xl font-bold text-blue-500">Live</p>
              <p className="text-sm text-gray-400 mt-2">Real-time monitoring</p>
            </div>

            <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
              <h3 className="text-lg font-semibold mb-2">System Status</h3>
              <p className="text-3xl font-bold text-green-500">✓</p>
              <p className="text-sm text-gray-400 mt-2">All systems operational</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}