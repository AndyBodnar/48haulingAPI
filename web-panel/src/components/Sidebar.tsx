'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  LayoutDashboard,
  Activity,
  Database,
  Zap,
  BarChart3,
  Users,
  Settings,
  FileText,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home
} from 'lucide-react'

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'observability', name: 'API Observability', icon: Activity },
    { id: 'live', name: 'Live Status', icon: Zap },
    { id: 'errors', name: 'Error Logs', icon: AlertTriangle },
    { id: 'issues', name: 'User Issues', icon: FileText },
    { id: 'analytics', name: 'Analytics', icon: BarChart3, disabled: true },
    { id: 'users', name: 'Users', icon: Users, disabled: true },
    { id: 'database', name: 'Database', icon: Database, disabled: true },
    { id: 'settings', name: 'Settings', icon: Settings, disabled: true },
  ]

  return (
    <div
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } bg-[#1a1a1a] border-r border-gray-800 flex flex-col transition-all duration-300 ease-in-out h-screen fixed left-0 top-0 z-50`}
    >
      {/* Logo / Brand */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center space-x-3">
            <img src="/logo.png" alt="48 Hauling" className="w-8 h-8 object-contain" />
            <span className="font-bold text-lg text-white">48 Hauling</span>
          </div>
        )}
        {collapsed && (
          <img src="/logo.png" alt="48 Hauling" className="w-8 h-8 object-contain mx-auto" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            const isDisabled = item.disabled

            return (
              <button
                key={item.id}
                onClick={() => !isDisabled && onTabChange(item.id)}
                disabled={isDisabled}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors
                  ${isActive
                    ? 'bg-green-600 text-white'
                    : isDisabled
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-gray-400 hover:bg-[#0f0f0f] hover:text-white'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? item.name : ''}
              >
                <Icon className={`${collapsed ? 'w-5 h-5' : 'w-5 h-5 flex-shrink-0'}`} />
                {!collapsed && <span className="text-sm font-medium">{item.name}</span>}
                {!collapsed && isDisabled && (
                  <span className="ml-auto text-xs bg-gray-800 px-2 py-0.5 rounded">Soon</span>
                )}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-gray-800 p-2 space-y-1">
        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-[#0f0f0f] hover:text-white transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 mx-auto" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-red-600 hover:text-white transition-colors"
          title={collapsed ? 'Logout' : ''}
        >
          <LogOut className={`${collapsed ? 'w-5 h-5 mx-auto' : 'w-5 h-5'}`} />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </div>
  )
}

// Missing import
import { AlertTriangle } from 'lucide-react'
