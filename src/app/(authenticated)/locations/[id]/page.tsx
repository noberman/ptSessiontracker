import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  ChevronLeft, 
  Edit, 
  Users, 
  UserCheck, 
  Activity, 
  Calendar,
  Mail
} from 'lucide-react'

export default async function LocationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Fetch location with details
  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      clients: {
        where: {
          active: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          primaryTrainer: {
            select: {
              id: true,
              name: true
            }
          },
          packages: {
            where: {
              active: true
            },
            select: {
              remainingSessions: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        },
        take: 10 // Show only first 10 clients
      },
      _count: {
        select: {
          clients: {
            where: {
              active: true
            }
          },
          sessions: {
            where: {
              sessionDate: {
                gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              }
            }
          }
        }
      }
    }
  })

  if (!location) {
    redirect('/locations')
  }

  // Fetch trainers and PT managers separately through the UserLocation junction table
  const staffAtLocation = await prisma.userLocation.findMany({
    where: {
      locationId: id,
      user: {
        role: {
          in: ['TRAINER', 'PT_MANAGER']
        },
        active: true
      }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          _count: {
            select: {
              sessions: {
                where: {
                  sessionDate: {
                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                  }
                }
              }
            }
          }
        }
      }
    },
    orderBy: {
      user: {
        name: 'asc'
      }
    }
  })

  // Extract the user data and separate by role
  const allStaff = staffAtLocation.map(sl => sl.user)
  const trainers = allStaff.filter(user => user.role === 'TRAINER')
  const ptManagers = allStaff.filter(user => user.role === 'PT_MANAGER')
  const trainerCount = trainers.length
  const ptManagerCount = ptManagers.length

  // Check permissions
  if (session.user.role === 'TRAINER' || session.user.role === 'CLUB_MANAGER') {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { locations: true }
    })
    
    const hasAccess = user?.locations.some(l => l.locationId === id)
    if (!hasAccess) {
      redirect('/locations')
    }
  }

  const canEdit = session.user.role === 'ADMIN' || session.user.role === 'PT_MANAGER'

  // Calculate statistics
  const totalSessionsValue = await prisma.session.aggregate({
    where: {
      locationId: id,
      sessionDate: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      }
    },
    _sum: {
      sessionValue: true
    }
  })

  return (
    <div>
      <div className="mb-6">
        <Link href="/locations">
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Locations
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              {location.name}
              <Badge variant={location.active ? 'success' : 'warning'}>
                {location.active ? 'Active' : 'Inactive'}
              </Badge>
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Location details and statistics
            </p>
          </div>
          {canEdit && (
            <Link href={`/locations/${id}/edit`}>
              <Button className="flex items-center space-x-2">
                <Edit className="h-4 w-4" />
                <span>Edit Location</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Trainers & PT Managers</p>
                <p className="text-2xl font-bold text-text-primary">
                  {trainerCount + ptManagerCount}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  {trainerCount} Trainers{ptManagerCount > 0 && `, ${ptManagerCount} PT Mgrs`}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-primary-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Active Clients</p>
                <p className="text-2xl font-bold text-text-primary">
                  {location._count.clients}
                </p>
              </div>
              <Users className="h-8 w-8 text-primary-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Sessions (Month)</p>
                <p className="text-2xl font-bold text-text-primary">
                  {location._count.sessions}
                </p>
              </div>
              <Activity className="h-8 w-8 text-success-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Revenue (Month)</p>
                <p className="text-2xl font-bold text-text-primary">
                  ${(totalSessionsValue._sum.sessionValue || 0).toFixed(0)}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-success-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Staff List (Trainers and PT Managers) */}
        <Card>
          <CardHeader>
            <CardTitle>Staff at This Location</CardTitle>
          </CardHeader>
          <CardContent>
            {allStaff.length === 0 ? (
              <p className="text-text-secondary text-center py-4">
                No staff assigned to this location
              </p>
            ) : (
              <div className="space-y-3">
                {/* Show PT Managers first */}
                {ptManagers.map((manager) => (
                  <div key={manager.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary hover:bg-surface-hover transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/users/${manager.id}`}
                          className="font-medium text-text-primary hover:text-primary-600 transition-colors"
                        >
                          {manager.name}
                        </Link>
                        <Badge variant="secondary" className="text-xs">
                          PT Manager
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Mail className="h-3 w-3 text-text-secondary" />
                        <p className="text-sm text-text-secondary">{manager.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-text-primary">
                        {manager._count.sessions}
                      </p>
                      <p className="text-xs text-text-secondary">sessions</p>
                    </div>
                  </div>
                ))}
                {/* Then show Trainers */}
                {trainers.map((trainer) => (
                  <div key={trainer.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary hover:bg-surface-hover transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/users/${trainer.id}`}
                          className="font-medium text-text-primary hover:text-primary-600 transition-colors"
                        >
                          {trainer.name}
                        </Link>
                        <Badge variant="default" className="text-xs">
                          Trainer
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <Mail className="h-3 w-3 text-text-secondary" />
                        <p className="text-sm text-text-secondary">{trainer.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-text-primary">
                        {trainer._count.sessions}
                      </p>
                      <p className="text-xs text-text-secondary">sessions</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Clients</CardTitle>
              {location._count.clients > 10 && (
                <Link href={`/clients?location=${id}`}>
                  <Button variant="ghost" size="sm">
                    View All ({location._count.clients})
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {location.clients.length === 0 ? (
              <p className="text-text-secondary text-center py-4">
                No clients at this location
              </p>
            ) : (
              <div className="space-y-3">
                {location.clients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary hover:bg-surface-hover transition-colors">
                    <div className="flex-1">
                      <Link 
                        href={`/clients/${client.id}`}
                        className="font-medium text-text-primary hover:text-primary-600 transition-colors"
                      >
                        {client.name}
                      </Link>
                      <p className="text-sm text-text-secondary">
                        {client.primaryTrainer ? (
                          <>Trainer: {client.primaryTrainer.name}</>
                        ) : (
                          <span className="text-warning-600">No trainer assigned</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-text-primary">
                        {client.packages.reduce((sum, pkg) => sum + pkg.remainingSessions, 0)}
                      </p>
                      <p className="text-xs text-text-secondary">sessions left</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Location Metadata */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Location Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-text-secondary">Created</p>
              <p className="text-sm text-text-primary">
                {new Date(location.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Last Updated</p>
              <p className="text-sm text-text-primary">
                {new Date(location.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}