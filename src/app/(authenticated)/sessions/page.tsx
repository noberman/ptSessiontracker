// Rebuilt: 2025-09-16 - Regenerate Prisma client with cancelled fields
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SessionFilters } from '@/components/sessions/SessionFilters'
import { SessionTable } from '@/components/sessions/SessionTable'

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    page?: string
    limit?: string
    clientIds?: string  // comma-separated IDs
    trainerIds?: string  // comma-separated IDs
    locationIds?: string  // comma-separated IDs
    validatedStatuses?: string  // comma-separated values
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

  // Filter by trainers (multi-select)
  if (params.trainerIds) {
    const trainerIds = params.trainerIds.split(',').filter(Boolean)
    if (trainerIds.length > 0) {
      where.trainerId = { in: trainerIds }
    }
  } else if (session.user.role === 'TRAINER') {
    // Trainers can only see their own sessions
    where.trainerId = session.user.id
  }

  // Filter by locations (multi-select)
  if (params.locationIds) {
    const locationIds = params.locationIds.split(',').filter(Boolean)
    if (locationIds.length > 0) {
      where.locationId = { in: locationIds }
    }
  } else if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
    // Club managers and PT managers see sessions at all their accessible locations
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        locations: {
          select: { locationId: true }
        }
      }
    })
    
    // Collect all accessible location IDs from UserLocation table
    const accessibleLocationIds: string[] = []
    if (user?.locations) {
      accessibleLocationIds.push(...user.locations.map(l => l.locationId))
    }
    
    // Filter sessions by accessible locations
    if (accessibleLocationIds.length > 0) {
      where.locationId = { in: accessibleLocationIds }
    }
  }
  // Only ADMIN sees all sessions without location filter

  // Filter by validation status (multi-select)
  if (params.validatedStatuses) {
    const statuses = params.validatedStatuses.split(',').filter(Boolean)
    if (statuses.length === 1) {
      where.validated = statuses[0] === 'true'
    } else if (statuses.length > 1) {
      // If both are selected, no filter needed (show all)
      // But we'll keep this logic explicit
      where.OR = statuses.map(status => ({ validated: status === 'true' }))
    }
  }

  // Date range filter
  if (params.startDate || params.endDate) {
    where.sessionDate = {}
    if (params.startDate) {
      where.sessionDate.gte = new Date(params.startDate)
    }
    if (params.endDate) {
      const endDate = new Date(params.endDate)
      endDate.setHours(23, 59, 59, 999) // Include the entire end date
      where.sessionDate.lte = endDate
    }
  }

  // Fetch filter options based on user role
  let filterClients: any[] = []
  let filterTrainers: any[] = []
  let filterLocations: any[] = []

  if (session.user.role === 'TRAINER') {
    // Trainers see clients at their location
    if (session.user.locationId) {
      filterClients = await prisma.client.findMany({
        where: {
          locationId: session.user.locationId,
          active: true,
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    }
    // Trainers don't need trainer filter (they only see their own)
    filterTrainers = []
    // Single location for trainers
    if (session.user.locationId) {
      const location = await prisma.location.findUnique({
        where: { id: session.user.locationId },
        select: { id: true, name: true },
      })
      filterLocations = location ? [location] : []
    }
  } else if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
    // Club managers see their location's data
    filterClients = await prisma.client.findMany({
      where: {
        locationId: session.user.locationId,
        active: true,
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    filterTrainers = await prisma.user.findMany({
      where: {
        locationId: session.user.locationId,
        role: 'TRAINER',
        active: true,
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    const location = await prisma.location.findUnique({
      where: { id: session.user.locationId },
      select: { id: true, name: true },
    })
    filterLocations = location ? [location] : []
  } else {
    // Admins and PT Managers see everything in their organization
    // Now using direct organizationId - no JOINs needed!
    const [clients, trainers, locations] = await Promise.all([
      prisma.client.findMany({
        where: { 
          active: true,
          organizationId: session.user.organizationId // Direct filter!
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: {
          role: { in: ['TRAINER', 'PT_MANAGER'] },
          active: true,
          organizationId: session.user.organizationId,
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.location.findMany({
        where: { 
          organizationId: session.user.organizationId,
          active: true
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ])
    filterClients = clients
    filterTrainers = trainers
    filterLocations = locations
  }

  const [sessions, total] = await Promise.all([
    prisma.session.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        sessionDate: true,
        sessionValue: true,
        validated: true,
        validatedAt: true,
        cancelled: true,
        cancelledAt: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        location: {
          select: {
            id: true,
            name: true,
          }
        },
        package: {
          select: {
            id: true,
            name: true,
            packageType: true,
          }
        }
      },
      orderBy: {
        sessionDate: 'desc'
      }
    }),
    prisma.session.count({ where })
  ])

  const pagination = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }

  const canCreate = true // All authenticated users can create sessions
  const canValidate = session.user.role === 'PT_MANAGER' || session.user.role === 'ADMIN'
  const canDelete = session.user.role === 'PT_MANAGER' || session.user.role === 'ADMIN'
  // Allow trainers to see actions column for resend functionality
  const canSeeActions = true // All users can see actions (view, resend for their sessions)

  return (
    <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Sessions</h1>
            <p className="text-sm text-text-secondary mt-1">
              Manage training sessions
            </p>
          </div>
          {canCreate && (
            <Link href="/sessions/new">
              <Button>Log New Session</Button>
            </Link>
          )}
        </div>

        {/* Filters */}
        <SessionFilters 
          clients={filterClients}
          trainers={filterTrainers}
          locations={filterLocations}
        />

        <SessionTable 
          initialSessions={sessions}
          pagination={pagination}
          canEdit={canSeeActions}
          userRole={session.user.role}
          currentUserId={session.user.id}
        />
    </div>
  )
}