import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardWrapper } from '@/components/dashboard/DashboardWrapper'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Get user's accessible locations and organization info
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      locations: {
        select: { locationId: true }
      },
      organizationId: true,
      organization: {
        select: {
          id: true,
          subscriptionTier: true,
          lastIssue: true,
          lastIssueDate: true
        }
      }
    }
  })
  
  const locationIds = user?.locations.map(l => l.locationId) || []

  // The middleware handles onboarding redirect, so if we're here, user can see dashboard
  
  return (
    <DashboardWrapper 
      userId={session.user.id}
      userName={session.user.name || ''}
      actualRole={session.user.role}
      locationIds={locationIds}
      organizationId={user?.organizationId || ''}
      subscriptionTier={user?.organization?.subscriptionTier || 'FREE'}
      lastIssue={user?.organization?.lastIssue}
      lastIssueDate={user?.organization?.lastIssueDate}
    />
  )
}