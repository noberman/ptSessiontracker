import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { checkInvitationLimit } from '@/lib/invitation-service'
import { getUserAccessibleLocations } from '@/lib/user-locations'
import UsersPageClient from './UsersPageClient'

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string; search?: string; role?: string; locationId?: string }>
}) {
  const params = await searchParams
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Only managers and admins can view user list
  if (!['CLUB_MANAGER', 'PT_MANAGER', 'ADMIN'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  // Get user with organization
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      organizationId: true,
    },
  })

  if (!currentUser?.organizationId) {
    redirect('/dashboard')
  }

  const page = parseInt(params.page || '1')
  const limit = parseInt(params.limit || '10')
  const search = params.search || ''
  const role = params.role || ''
  const locationId = params.locationId || ''
  
  const skip = (page - 1) * limit

  const where: any = {
    active: true,
    organizationId: currentUser.organizationId,
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (role) {
    where.role = role
  }

  if (locationId) {
    where.locationId = locationId
  }

  // Restrict club managers and PT managers to their accessible locations
  if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
    const accessibleLocations = await getUserAccessibleLocations(session.user.id, session.user.role)
    if (accessibleLocations && accessibleLocations.length > 0) {
      // Show users with access to those locations through UserLocation junction table
      where.locations = {
        some: {
          locationId: { in: accessibleLocations }
        }
      }
    } else {
      // No accessible locations
      where.id = 'no-access'
    }
  }
  // ADMIN sees all (no additional filter)

  // Get accessible locations for filtering the dropdown
  const locationFilter: any = { organizationId: currentUser.organizationId }
  
  if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
    const accessibleLocations = await getUserAccessibleLocations(session.user.id, session.user.role)
    if (accessibleLocations && accessibleLocations.length > 0) {
      locationFilter.id = { in: accessibleLocations }
    } else {
      locationFilter.id = 'no-access' // No locations
    }
  }
  
  const [users, total, locations] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        locations: {
          select: {
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.user.count({ where }),
    prisma.location.findMany({
      where: {
        ...locationFilter,
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ])

  const pagination = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }

  const canEdit = ['PT_MANAGER', 'ADMIN'].includes(session.user.role) || 
                  session.user.role === 'CLUB_MANAGER'
  const canDelete = session.user.role === 'ADMIN'

  // Check invitation limits
  const usageLimits = await checkInvitationLimit(currentUser.organizationId)

  return (
    <UsersPageClient
      initialUsers={users}
      pagination={pagination}
      locations={locations}
      currentUserRole={session.user.role}
      currentUserLocationId={currentUser.locationId}
      canEdit={canEdit}
      canDelete={canDelete}
      organizationId={currentUser.organizationId}
      usageLimits={usageLimits}
    />
  )
}