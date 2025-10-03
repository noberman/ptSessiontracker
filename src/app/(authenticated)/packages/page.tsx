import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PackagesPageClient } from '@/components/packages/PackagesPageClient'
import { getOrganizationId } from '@/lib/organization-context'

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    page?: string
    limit?: string
    clientIds?: string  // comma-separated IDs
    locationIds?: string  // comma-separated IDs
    activeStatuses?: string  // comma-separated values
    expirationStatus?: string
    startDate?: string
    endDate?: string
  }>
}) {
  const params = await searchParams
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const page = parseInt(params.page || '1')
  const limit = parseInt(params.limit || '10')
  const skip = (page - 1) * limit

  const where: any = {
    // CRITICAL: Filter by organization to prevent data leaks
    organizationId: session.user.organizationId
  }

  // Filter by clients (multi-select)
  if (params.clientIds) {
    const clientIds = params.clientIds.split(',').filter(Boolean)
    if (clientIds.length > 0) {
      where.clientId = { in: clientIds }
    }
  }

  // Filter by locations (multi-select)
  if (params.locationIds) {
    const locationIds = params.locationIds.split(',').filter(Boolean)
    if (locationIds.length > 0) {
      where.client = {
        ...where.client,
        locationId: { in: locationIds }
      }
    }
  }


  // Filter by active status (multi-select)
  if (params.activeStatuses) {
    const statuses = params.activeStatuses.split(',').filter(Boolean)
    if (statuses.length === 1) {
      where.active = statuses[0] === 'true'
    } else if (statuses.length > 1) {
      // If both are selected, show all (no filter needed)
      // This is effectively the same as no filter
    }
  } else {
    // Default to showing only active packages
    where.active = true
  }

  // Filter by expiration status
  if (params.expirationStatus) {
    const now = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    switch (params.expirationStatus) {
      case 'expired':
        where.expiresAt = { lt: now }
        break
      case 'expiring_soon':
        where.expiresAt = { gte: now, lte: thirtyDaysFromNow }
        break
      case 'not_expired':
        where.expiresAt = { gt: now }
        break
      case 'no_expiry':
        where.expiresAt = null
        break
    }
  }

  // Date range filter
  if (params.startDate || params.endDate) {
    where.createdAt = {}
    if (params.startDate) {
      where.createdAt.gte = new Date(params.startDate)
    }
    if (params.endDate) {
      const endDateTime = new Date(params.endDate)
      endDateTime.setHours(23, 59, 59, 999)
      where.createdAt.lte = endDateTime
    }
  }

  // Get organization context
  const organizationId = await getOrganizationId()

  // Restrict based on user role
  if (session.user.role === 'TRAINER') {
    where.client = {
      primaryTrainerId: session.user.id,
    }
  } else if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
    where.client = {
      locationId: session.user.locationId,
    }
  }

  // Get available clients for filter
  let availableClients: any[] = []
  let availableLocations: any[] = []
  
  if (session.user.role === 'TRAINER') {
    availableClients = await prisma.client.findMany({
      where: {
        organizationId: session.user.organizationId,
        primaryTrainerId: session.user.id,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    })
  } else if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
    availableClients = await prisma.client.findMany({
      where: {
        organizationId: session.user.organizationId,
        locationId: session.user.locationId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    })
  } else {
    // Admin and PT Manager can see all in their organization
    availableClients = await prisma.client.findMany({
      where: {
        active: true,
        organizationId: session.user.organizationId // Direct filter!
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    })
    
    // Also get locations for admins/PT managers in their organization
    availableLocations = await prisma.location.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    })
  }

  const [packages, total] = await Promise.all([
    prisma.package.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        packageType: true,
        name: true,
        totalValue: true,
        totalSessions: true,
        remainingSessions: true,
        sessionValue: true,
        startDate: true,
        expiresAt: true,
        active: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            sessions: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.package.count({ where }),
  ])

  const pagination = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }

  const canCreate = session.user.role !== 'TRAINER'
  const canEdit = session.user.role !== 'TRAINER'
  const canDelete = session.user.role === 'ADMIN'
  const canManageTypes = ['PT_MANAGER', 'ADMIN'].includes(session.user.role)

  return (
    <PackagesPageClient
      packages={packages}
      pagination={pagination}
      availableClients={availableClients}
      availableLocations={availableLocations}
      currentUserRole={session.user.role}
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
      canManageTypes={canManageTypes}
      searchParams={params}
    />
  )
}