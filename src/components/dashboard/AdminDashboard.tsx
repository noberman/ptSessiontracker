'use client'

import { ManagerDashboard } from './ManagerDashboard'
import { SetupChecklist } from './SetupChecklist'

interface AdminDashboardProps {
  userId: string
  userName: string
  orgTimezone?: string
}

export function AdminDashboard({ userId, userName, orgTimezone = 'Asia/Singapore' }: AdminDashboardProps) {
  return (
    <div className="space-y-6">
        {/* Admin Header */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">System-wide overview and controls</p>
        </div>

        {/* Setup Checklist for new users */}
        <SetupChecklist />

        {/* Admin Dashboard Content - reuse ManagerDashboard with ADMIN role */}
        <ManagerDashboard 
          userId={userId}
          userName={userName}
          userRole="ADMIN"
          locationIds={[]}  // Empty array for admin means "all locations"
          orgTimezone={orgTimezone}
        />
    </div>
  )
}