import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CommissionSettings } from '@/components/settings/CommissionSettings'
import { ensureCommissionTiers } from '@/lib/commission/ensure-tiers'

export default async function CommissionSettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }
  
  // Only allow ADMIN, PT_MANAGER, and CLUB_MANAGER roles
  const userRole = session.user.role?.toUpperCase()
  if (userRole !== 'ADMIN' && userRole !== 'PT_MANAGER' && userRole !== 'CLUB_MANAGER') {
    redirect('/dashboard')
  }
  
  // Ensure default commission tiers exist for this organization
  if (session.user.organizationId) {
    await ensureCommissionTiers(session.user.organizationId)
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Commission Configuration</h1>
        <p className="text-sm text-text-secondary mt-1">
          Configure calculation method and commission tiers
        </p>
      </div>
      
      <CommissionSettings />
    </div>
  )
}