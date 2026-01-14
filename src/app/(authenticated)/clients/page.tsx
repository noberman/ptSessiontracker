import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ClientTable } from '@/components/clients/ClientTable'
import { ClientSearch } from '@/components/clients/ClientSearch'
import { Button } from '@/components/ui/Button'
import { getClientState, getClientStateFilterWhereClause, type ClientState } from '@/lib/package-status'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    limit?: string
    search?: string
    locationId?: string // Keep for backwards compatibility
    locationIds?: string // New multi-select
    primaryTrainerId?: string // Keep for backwards compatibility
    trainerIds?: string // New multi-select
    clientStates?: string // New: filter by client state
    active?: string
  }>
}) {
  const params = await searchParams
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const page = parseInt(params.page || '1')
  const limit = parseInt(params.limit || '10')
  const search = params.search || ''

  // Handle both old single and new multi-select parameters
  const locationIds = params.locationIds
    ? params.locationIds.split(',').filter(Boolean)
    : params.locationId
    ? [params.locationId]
    : []

  const trainerIds = params.trainerIds
    ? params.trainerIds.split(',').filter(Boolean)
    : params.primaryTrainerId
    ? [params.primaryTrainerId]
    : []

  // Parse client states filter
  const clientStates = params.clientStates
    ? (params.clientStates.split(',').filter(Boolean) as ClientState[])
    : []

  const active = params.active !== 'false'

  const skip = (page - 1) * limit

  const where: any = {
    // CRITICAL: Filter by organization to prevent data leaks
    organizationId: session.user.organizationId
  }

  // Default to active clients unless explicitly requested
  if (params.active !== undefined) {
    where.active = active
  } else {
    where.active = true
  }

  // Build search conditions separately
  const searchConditions = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ]
  } : {}

  // Handle multi-select locations
  const locationConditions = locationIds.length > 0 ? {
    locationId: { in: locationIds }
  } : {}

  // Combine all conditions properly
  if (search && locationIds.length > 0) {
    // When both search and location filters are present, use AND
    where.AND = [searchConditions, locationConditions]
  } else if (search) {
    Object.assign(where, searchConditions)
  } else if (locationIds.length > 0) {
    Object.assign(where, locationConditions)
  }

  console.log('Server: Final where clause:', JSON.stringify(where, null, 2))

  // Handle multi-select trainers (including unassigned)
  if (trainerIds.length > 0) {
    if (trainerIds.includes('unassigned')) {
      // If unassigned is selected along with other trainers
      if (trainerIds.length > 1) {
        const actualTrainerIds = trainerIds.filter(id => id !== 'unassigned')
        const orConditions = [
          { primaryTrainerId: null },
          { primaryTrainerId: { in: actualTrainerIds } }
        ]
        // Combine with existing OR if present
        if (where.OR) {
          where.AND = [
            { OR: where.OR },
            { OR: orConditions }
          ]
          delete where.OR
        } else {
          where.OR = orConditions
        }
      } else {
        // Only unassigned is selected
        where.primaryTrainerId = null
      }
    } else {
      // Regular trainer IDs
      where.primaryTrainerId = { in: trainerIds }
    }
  }

  // Handle client state filter
  if (clientStates.length > 0) {
    const stateFilter = getClientStateFilterWhereClause(clientStates)
    if (stateFilter.OR) {
      // Multiple states - need to combine with existing conditions
      if (where.AND) {
        where.AND.push(stateFilter)
      } else {
        where.AND = [stateFilter]
      }
    } else if (Object.keys(stateFilter).length > 0) {
      // Single state condition
      if (where.AND) {
        where.AND.push(stateFilter)
      } else {
        Object.assign(where, stateFilter)
      }
    }
  }

  // Get user's accessible locations for filtering
  const accessibleLocationIds: string[] = []
  
  // Restrict based on user role
  if (session.user.role === 'TRAINER' || session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
    // Get user's accessible locations (both old locationId and new UserLocation records)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        locations: {
          select: { locationId: true }
        }
      }
    })
    
    // Collect all accessible location IDs from UserLocation table
    if (user?.locations) {
      accessibleLocationIds.push(...user.locations.map(l => l.locationId))
    }
    
    // Filter clients by accessible locations
    if (accessibleLocationIds.length > 0) {
      where.locationId = { in: accessibleLocationIds }
    } else {
      // If no locations, show only directly assigned clients as fallback (for trainers)
      if (session.user.role === 'TRAINER') {
        where.primaryTrainerId = session.user.id
      } else {
        // PT Managers and Club Managers with no locations see nothing
        where.id = 'no-access' // This will return no results
      }
    }
  }
  // Only ADMIN role gets organization-wide access without location restrictions

  const [clientsRaw, total, locations, trainers] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        active: true,
        locationId: true,
        primaryTrainerId: true,
        location: {
          select: {
            name: true,
          },
        },
        primaryTrainer: {
          select: {
            name: true,
            email: true,
          },
        },
        // Include packages for state derivation
        packages: {
          select: {
            id: true,
            remainingSessions: true,
            expiresAt: true,
            _count: {
              select: {
                sessions: true,
              },
            },
          },
        },
        _count: {
          select: {
            packages: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.client.count({ where }),
    // Get locations for filter
    session.user.role === 'CLUB_MANAGER' && accessibleLocationIds.length > 0
      ? prisma.location.findMany({
          where: { 
            id: { in: accessibleLocationIds },
            active: true
          },
          select: { id: true, name: true },
        })
      : prisma.location.findMany({
          where: { 
            organizationId: session.user.organizationId,
            active: true
          },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
    // Get trainers for filter (including PT Managers who can also train)
    prisma.user.findMany({
      where: {
        role: { in: ['TRAINER', 'PT_MANAGER'] },
        active: true,
        organizationId: session.user.organizationId,
        ...(session.user.role === 'CLUB_MANAGER' && accessibleLocationIds.length > 0
          ? { 
              locations: {
                some: {
                  locationId: { in: accessibleLocationIds }
                }
              }
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    }),
  ])

  // Calculate client state for each client
  const clients = clientsRaw.map(client => {
    const clientState = getClientState({ packages: client.packages })
    // Remove packages array from response to keep it lean
    const { packages, ...clientWithoutPackages } = client
    return {
      ...clientWithoutPackages,
      clientState,
    }
  })

  const pagination = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }

  const canEdit = ['CLUB_MANAGER', 'PT_MANAGER', 'ADMIN'].includes(session.user.role)
  const canDelete = session.user.role === 'ADMIN'
  const canCreate = session.user.role !== 'TRAINER'

  return (
    <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Clients</h1>
            <p className="text-sm text-text-secondary mt-1">
              Manage client profiles and assignments
            </p>
          </div>
          <div className="flex space-x-3">
            {canCreate && (
              <>
                <Link href="/clients/import">
                  <Button variant="outline">Import CSV</Button>
                </Link>
                <Link href="/clients/new">
                  <Button>Add New Client</Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="mb-6">
          <ClientSearch 
            locations={locations}
            trainers={trainers}
            showInactive={session.user.role === 'ADMIN'}
          />
        </div>

        <ClientTable
          initialClients={clients}
          pagination={pagination}
          canEdit={canEdit}
          canDelete={canDelete}
        />
    </div>
  )
}