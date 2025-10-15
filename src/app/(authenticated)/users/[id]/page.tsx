import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      locations: {
        include: {
          location: true,
        },
      },
      assignedClients: {
        take: 10,
      },
      _count: {
        select: {
          assignedClients: true,
          sessions: true,
        },
      },
    },
  })

  if (!user) {
    redirect('/users')
  }

  // Check permissions
  if (session.user.role === 'TRAINER' && user.id !== session.user.id) {
    redirect('/dashboard')
  }

  // For club managers, check if they share locations with the user
  if (session.user.role === 'CLUB_MANAGER' && user.id !== session.user.id) {
    const currentUserLocations = await prisma.userLocation.findMany({
      where: { userId: session.user.id },
      select: { locationId: true }
    })
    const currentUserLocationIds = currentUserLocations.map(l => l.locationId)
    const targetUserLocationIds = user.locations.map(l => l.locationId)
    
    const hasSharedLocation = targetUserLocationIds.some(id => currentUserLocationIds.includes(id))
    
    if (!hasSharedLocation) {
      redirect('/dashboard')
    }
  }

  const canEdit = session.user.id === user.id || 
                  ['PT_MANAGER', 'ADMIN'].includes(session.user.role) ||
                  (session.user.role === 'CLUB_MANAGER') // Already checked access above

  const roleColors = {
    ADMIN: 'error',
    PT_MANAGER: 'warning',
    CLUB_MANAGER: 'secondary',
    TRAINER: 'default',
  } as const

  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{user.name}</h1>
            <p className="text-sm text-text-secondary mt-1">{user.email}</p>
          </div>
          <div className="flex space-x-3">
            {canEdit && (
              <Link href={`/users/${user.id}/edit`}>
                <Button variant="outline">Edit User</Button>
              </Link>
            )}
            <Link href="/users">
              <Button variant="ghost">Back to Users</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* User Information */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>User Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary">Role</p>
                    <Badge 
                      variant={roleColors[user.role as keyof typeof roleColors] || 'gray'}
                      size="md"
                      className="mt-1"
                    >
                      {user.role.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Status</p>
                    <Badge 
                      variant={user.active ? 'success' : 'gray'} 
                      size="md"
                      className="mt-1"
                    >
                      {user.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-text-secondary">Location{(() => {
                    // Count total locations
                    const locationCount = new Set(
                      user.locations?.map((l: any) => l.location.id) || []
                    ).size
                    return locationCount > 1 ? 's' : ''
                  })()}</p>
                  <div className="mt-1">
                    {user.role === 'ADMIN' ? (
                      <span className="text-base text-text-tertiary italic">All locations (organization-wide access)</span>
                    ) : (() => {
                      // Collect all unique locations
                      const locationMap = new Map()
                      
                      // Add primary location
                      // Locations are added from the locations array below
                      
                      // Add locations from junction table
                      user.locations?.forEach((loc: any) => {
                        if (loc.location) {
                          locationMap.set(loc.location.id, loc.location.name)
                        }
                      })
                      
                      const uniqueLocations = Array.from(locationMap.values())
                      
                      if (uniqueLocations.length === 0) {
                        return <span className="text-base text-text-secondary">No location assigned</span>
                      } else if (uniqueLocations.length === 1) {
                        return <span className="text-base font-medium text-text-primary">{uniqueLocations[0]}</span>
                      } else {
                        return (
                          <div className="flex flex-wrap gap-2">
                            {uniqueLocations.map((name, idx) => (
                              <Badge key={idx} variant="secondary" size="sm">
                                {name}
                              </Badge>
                            ))}
                          </div>
                        )
                      }
                    })()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary">Created</p>
                    <p className="text-base text-text-primary mt-1">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Last Updated</p>
                    <p className="text-base text-text-primary mt-1">
                      {new Date(user.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assigned Clients (for trainers) */}
            {user.role === 'TRAINER' && user.assignedClients.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Assigned Clients ({user._count.assignedClients})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {user.assignedClients.map((client: any) => (
                      <div key={client.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium text-text-primary">{client.name}</p>
                          <p className="text-xs text-text-secondary">{client.email}</p>
                        </div>
                        <Badge variant={client.active ? 'success' : 'gray'} size="xs">
                          {client.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  {user._count.assignedClients > 10 && (
                    <p className="text-sm text-text-secondary mt-4">
                      Showing 10 of {user._count.assignedClients} clients
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Statistics */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.role === 'TRAINER' && (
                  <>
                    <div>
                      <p className="text-2xl font-bold text-text-primary">
                        {user._count.assignedClients}
                      </p>
                      <p className="text-sm text-text-secondary">Total Clients</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-text-primary">
                        {user._count.sessions}
                      </p>
                      <p className="text-sm text-text-secondary">Total Sessions</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-2xl font-bold text-text-primary">
                    {Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                  </p>
                  <p className="text-sm text-text-secondary">Days Active</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}