import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PaymentsPageClient } from '@/components/payments/PaymentsPageClient'
import { getUserAccessibleLocations } from '@/lib/user-locations'

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  const orgId = session.user.organizationId

  // Fetch filter options based on role
  const accessibleLocations = await getUserAccessibleLocations(
    session.user.id,
    session.user.role
  )

  // Get locations for filter dropdown
  const locationWhere: Record<string, unknown> = {
    organizationId: orgId,
    active: true,
  }
  if (accessibleLocations && accessibleLocations.length > 0) {
    locationWhere.id = { in: accessibleLocations }
  }

  const [locations, trainers, clients] = await Promise.all([
    prisma.location.findMany({
      where: locationWhere,
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: {
        organizationId: orgId,
        active: true,
        role: { in: ['TRAINER', 'PT_MANAGER', 'CLUB_MANAGER'] },
        ...(accessibleLocations && accessibleLocations.length > 0
          ? { locations: { some: { locationId: { in: accessibleLocations } } } }
          : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.client.findMany({
      where: {
        organizationId: orgId,
        active: true,
        ...(accessibleLocations && accessibleLocations.length > 0
          ? { locationId: { in: accessibleLocations } }
          : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <PaymentsPageClient
      locations={locations}
      trainers={trainers}
      clients={clients}
      currentUserRole={session.user.role}
    />
  )
}
