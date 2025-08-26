import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SessionFilters } from '@/components/sessions/SessionFilters'

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    page?: string
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
  const limit = 20
  const skip = (page - 1) * limit

  const where: any = {}

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
  } else if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
    // Club managers can only see sessions at their location
    where.locationId = session.user.locationId
  }

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
    // Admins and PT Managers see everything
    const [clients, trainers, locations] = await Promise.all([
      prisma.client.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: {
          role: 'TRAINER',
          active: true,
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.location.findMany({
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
      include: {
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

        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-background-secondary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Date/Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Trainer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Package
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-border">
                {sessions.map((session: any) => {
                  const sessionDate = new Date(session.sessionDate)
                  const isExpired = session.validationExpiry && new Date(session.validationExpiry) < new Date()
                  
                  return (
                    <tr key={session.id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-text-primary">
                            {sessionDate.toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-text-primary">
                            {session.client.name}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {session.client.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-text-primary">
                            {session.trainer.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {session.package ? (
                          <div>
                            <div className="text-sm text-text-primary">
                              {session.package.name}
                            </div>
                            <Badge variant="gray" size="xs" className="mt-1">
                              {session.package.packageType}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-sm text-text-secondary">No package</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text-primary">
                          {session.location?.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-text-primary">
                          ${session.sessionValue?.toFixed(2) || '0.00'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {session.validated ? (
                          <div className="flex flex-col space-y-1">
                            <Badge variant="success" size="sm">
                              ✅ Validated
                            </Badge>
                            {session.validatedAt && (
                              <span className="text-xs text-text-secondary">
                                {new Date(session.validatedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ) : isExpired ? (
                          <Badge variant="error" size="sm">
                            ❌ Expired
                          </Badge>
                        ) : (
                          <div className="flex flex-col space-y-1">
                            <Badge variant="warning" size="sm">
                              ⏳ Pending
                            </Badge>
                            {session.validationExpiry && (
                              <span className="text-xs text-text-secondary">
                                {Math.ceil((new Date(session.validationExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}d left
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <Link href={`/sessions/${session.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {sessions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-text-secondary">
                      No sessions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-3 flex items-center justify-between border-t border-border bg-background-secondary">
            <div className="text-sm text-text-secondary">
              Showing {sessions.length > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} results
            </div>
            <div className="flex space-x-2">
              {pagination.page > 1 ? (
                <Link href={`/sessions?${new URLSearchParams({
                  ...params,
                  page: String(pagination.page - 1)
                }).toString()}`}>
                  <Button variant="outline" size="sm">
                    Previous
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
              )}
              {pagination.page < pagination.totalPages ? (
                <Link href={`/sessions?${new URLSearchParams({
                  ...params,
                  page: String(pagination.page + 1)
                }).toString()}`}>
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              )}
            </div>
          </div>
        </Card>
    </div>
  )
}