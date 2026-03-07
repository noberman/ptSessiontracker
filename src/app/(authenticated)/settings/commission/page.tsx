import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CommissionProfileList } from '@/components/commission/CommissionProfileList'
import { NoShowCommissionToggle } from '@/components/commission/NoShowCommissionToggle'

export default async function CommissionSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Only allow ADMIN and PT_MANAGER roles for v2
  const userRole = session.user.role?.toUpperCase()
  if (userRole !== 'ADMIN' && userRole !== 'PT_MANAGER') {
    redirect('/dashboard')
  }

  const organizationId = session.user.organizationId
  let commissionIncludesNoShows = false

  if (organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { commissionIncludesNoShows: true }
    })
    commissionIncludesNoShows = org?.commissionIncludesNoShows ?? false
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Commission Profiles</h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage commission structures for different trainer levels and specializations
        </p>
      </div>

      {organizationId && (
        <NoShowCommissionToggle
          organizationId={organizationId}
          initialValue={commissionIncludesNoShows}
        />
      )}

      <CommissionProfileList userRole={userRole} />
    </div>
  )
}
