'use client'

import { useState } from 'react'
import { TrainerDashboard } from './TrainerDashboard'
import { ManagerDashboard } from './ManagerDashboard'
import { AdminDashboard } from './AdminDashboard'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Eye, ChevronDown } from 'lucide-react'

interface DashboardWrapperProps {
  userId: string
  userName: string
  actualRole: string
  locationId: string | null
}

export function DashboardWrapper({ userId, userName, actualRole, locationId }: DashboardWrapperProps) {
  // For development, allow switching between views
  const [viewRole, setViewRole] = useState(actualRole)
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false)

  const isDevelopment = process.env.NODE_ENV === 'development'

  const renderDashboard = () => {
    switch (viewRole) {
      case 'TRAINER':
        return <TrainerDashboard userId={userId} userName={userName} />
      
      case 'CLUB_MANAGER':
        return (
          <ManagerDashboard 
            userId={userId} 
            userName={userName}
            userRole="CLUB_MANAGER"
            locationId={locationId}
          />
        )
      
      case 'PT_MANAGER':
        return (
          <ManagerDashboard 
            userId={userId} 
            userName={userName}
            userRole="PT_MANAGER"
            locationId={null}
          />
        )
      
      case 'ADMIN':
        return (
          <AdminDashboard 
            userId={userId} 
            userName={userName}
          />
        )
      
      default:
        return <TrainerDashboard userId={userId} userName={userName} />
    }
  }

  return (
    <div>
      {/* Development Role Switcher - Fixed position in dev mode */}
      {isDevelopment && (
        <div className="fixed top-20 right-4 z-50">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="flex items-center space-x-2 bg-surface border-warning-500 text-warning-600"
            >
              <Eye className="w-4 h-4" />
              <span>View as: {viewRole}</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
            
            {showRoleSwitcher && (
              <div className="absolute right-0 mt-2 w-64 rounded-lg border border-border bg-surface shadow-lg">
                <div className="p-2">
                  <div className="text-xs text-warning-600 font-semibold px-2 py-1 mb-1">
                    DEVELOPMENT MODE - Role Switcher
                  </div>
                  <div className="text-xs text-text-secondary px-2 py-1 mb-2">
                    Your actual role: <Badge variant="default" size="xs">{actualRole}</Badge>
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setViewRole('TRAINER')
                        setShowRoleSwitcher(false)
                      }}
                      className={`w-full text-left px-3 py-2 rounded hover:bg-background-secondary transition-colors ${
                        viewRole === 'TRAINER' ? 'bg-primary-50 text-primary-600' : 'text-text-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Trainer</span>
                        {viewRole === 'TRAINER' && (
                          <Badge variant="primary" size="xs">Current</Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-1">
                        View personal performance, clients, and pending validations
                      </p>
                    </button>
                    
                    <button
                      onClick={() => {
                        setViewRole('CLUB_MANAGER')
                        setShowRoleSwitcher(false)
                      }}
                      className={`w-full text-left px-3 py-2 rounded hover:bg-background-secondary transition-colors ${
                        viewRole === 'CLUB_MANAGER' ? 'bg-primary-50 text-primary-600' : 'text-text-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Club Manager</span>
                        {viewRole === 'CLUB_MANAGER' && (
                          <Badge variant="primary" size="xs">Current</Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-1">
                        View club-wide statistics and trainer performance
                      </p>
                    </button>
                    
                    <button
                      onClick={() => {
                        setViewRole('PT_MANAGER')
                        setShowRoleSwitcher(false)
                      }}
                      className={`w-full text-left px-3 py-2 rounded hover:bg-background-secondary transition-colors ${
                        viewRole === 'PT_MANAGER' ? 'bg-primary-50 text-primary-600' : 'text-text-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">PT Manager</span>
                        {viewRole === 'PT_MANAGER' && (
                          <Badge variant="primary" size="xs">Current</Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-1">
                        View multi-location statistics and performance
                      </p>
                    </button>
                    
                    <button
                      onClick={() => {
                        setViewRole('ADMIN')
                        setShowRoleSwitcher(false)
                      }}
                      className={`w-full text-left px-3 py-2 rounded hover:bg-background-secondary transition-colors ${
                        viewRole === 'ADMIN' ? 'bg-primary-50 text-primary-600' : 'text-text-primary'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Admin</span>
                        {viewRole === 'ADMIN' && (
                          <Badge variant="primary" size="xs">Current</Badge>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary mt-1">
                        Full system overview with trainer summaries and exports
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dashboard Content - No margin needed since switcher is fixed */}
      <div>
        {renderDashboard()}
      </div>
    </div>
  )
}