'use client'

import { useState } from 'react'
import LiveStatusTab from '@/components/LiveStatusTab'
import ErrorLogsTab from '@/components/ErrorLogsTab'
import UserIssuesTab from '@/components/UserIssuesTab'
import APIObservabilityDashboard from '@/components/APIObservabilityDashboard'
import Sidebar from '@/components/Sidebar'

type Tab = 'dashboard' | 'observability' | 'live' | 'errors' | 'issues'

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('observability')

  return (
    <div className="flex h-screen bg-[#0f0f0f] overflow-hidden">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as Tab)} />

      {/* Main Content Area */}
      <div className="flex-1 ml-64 overflow-auto">
        {activeTab === 'dashboard' && <DashboardHome />}
        {activeTab === 'observability' && <APIObservabilityDashboard />}
        {activeTab === 'live' && <TabWrapper><LiveStatusTab /></TabWrapper>}
        {activeTab === 'errors' && <TabWrapper><ErrorLogsTab /></TabWrapper>}
        {activeTab === 'issues' && <TabWrapper><UserIssuesTab /></TabWrapper>}
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
          <p className="text-gray-400">Select an option from the sidebar to get started</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Stats Cards */}
          <div className="bg-[#1a1a1a] rounded-lg p-6 border border-gray-800">
            <h3 className="text-lg font-semibold mb-2">API Endpoints</h3>
            <p className="text-3xl font-bold text-green-500">13</p>
            <p className="text-sm text-gray-400 mt-2">Active endpoints</p>
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
  )
}