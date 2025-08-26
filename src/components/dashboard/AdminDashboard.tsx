'use client'

import { ManagerDashboard } from './ManagerDashboard'

interface AdminDashboardProps {
  userId: string
  userName: string
}

export function AdminDashboard({ userId, userName }: AdminDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">System-wide overview and controls</p>
      </div>

      {/* Admin Dashboard Content - reuse ManagerDashboard with ADMIN role */}
      <ManagerDashboard 
        userId={userId}
        userName={userName}
        userRole="ADMIN"
        locationId={null}
      />
    </div>
  )
}