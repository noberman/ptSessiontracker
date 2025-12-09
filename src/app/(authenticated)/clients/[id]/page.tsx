import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ClientActions } from '@/components/clients/ClientActions'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      location: true,
      primaryTrainer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      packages: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      sessions: {
        take: 10,
        orderBy: {
          sessionDate: 'desc',
        },
        include: {
          trainer: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          sessions: true,
          packages: true,
        },
      },
    },
  })

  if (!client) {
    redirect('/clients')
  }

  // Check permissions
  if (session.user.role === 'TRAINER') {
    if (client.primaryTrainerId !== session.user.id) {
      redirect('/clients')
    }
  } else if (session.user.role === 'CLUB_MANAGER') {
    // Check if club manager has access to the client's location
    const managerLocations = await prisma.userLocation.findMany({
      where: { userId: session.user.id },
      select: { locationId: true }
    })
    const hasAccess = managerLocations.some(ul => ul.locationId === client.locationId)
    if (!hasAccess) {
      redirect('/clients')
    }
  }

  const canEdit = session.user.role !== 'TRAINER'

  // Calculate statistics
  const totalSessions = client._count.sessions
  const activePackages = client.packages.filter(p => p.remainingSessions > 0).length
  const totalPackages = client._count.packages
  const validatedSessions = client.sessions.filter(s => s.validated).length

  const canManage = ['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)

  // Helper function to determine package status
  const getPackageStatus = (pkg: any): { label: string; variant: 'success' | 'error' | 'gray' | 'warning' } => {
    const now = new Date()
    const isExpired = pkg.expiresAt && new Date(pkg.expiresAt) < now

    if (!pkg.active) {
      return { label: 'Inactive', variant: 'gray' }
    }
    if (isExpired) {
      return { label: 'Expired', variant: 'error' }
    }
    if (pkg.remainingSessions === 0) {
      return { label: 'Completed', variant: 'gray' }
    }
    return { label: 'Active', variant: 'success' }
  }

  // Sort packages: Active first, then by createdAt desc
  const sortedPackages = [...client.packages].sort((a: any, b: any) => {
    const statusA = getPackageStatus(a)
    const statusB = getPackageStatus(b)

    // Active packages first
    if (statusA.label === 'Active' && statusB.label !== 'Active') return -1
    if (statusA.label !== 'Active' && statusB.label === 'Active') return 1

    // Then by createdAt desc
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-text-primary">{client.name}</h1>
              {!client.active && (
                <Badge variant="error" size="sm">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="text-sm text-text-secondary mt-1">{client.email}</p>
          </div>
          <div className="flex space-x-3">
            <ClientActions
              clientId={client.id}
              clientName={client.name}
              isActive={client.active}
              canManage={canManage}
            />
            {canEdit && client.active && (
              <Link href={`/clients/${client.id}/edit`}>
                <Button variant="outline">Edit Client</Button>
              </Link>
            )}
            <Link href="/clients">
              <Button variant="ghost">Back to Clients</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary">Status</p>
                    <Badge 
                      variant={client.active ? 'success' : 'gray'} 
                      size="md"
                      className="mt-1"
                    >
                      {client.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Phone</p>
                    <p className="text-base font-medium text-text-primary mt-1">
                      {client.phone || 'Not provided'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary">Location</p>
                    <p className="text-base font-medium text-text-primary mt-1">
                      {client.location?.name || 'No location assigned'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Primary Trainer</p>
                    {client.primaryTrainer ? (
                      <div className="mt-1">
                        <p className="text-base font-medium text-text-primary">
                          {client.primaryTrainer.name}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {client.primaryTrainer.email}
                        </p>
                      </div>
                    ) : (
                      <Badge variant="warning" size="sm" className="mt-1">
                        Unassigned
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-secondary">Member Since</p>
                    <p className="text-base text-text-primary mt-1">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Last Updated</p>
                    <p className="text-base text-text-primary mt-1">
                      {new Date(client.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Sessions</CardTitle>
                  {totalSessions > 0 && (
                    <Link href={`/sessions?clientIds=${client.id}`}>
                      <Button variant="ghost" size="sm">View All</Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {client.sessions.length > 0 ? (
                  <div className="space-y-3">
                    {client.sessions.map((session: any) => (
                      <div key={session.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {new Date(session.sessionDate).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-text-secondary">
                            with {session.trainer.name}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={session.validated ? 'success' : 'warning'} 
                            size="xs"
                          >
                            {session.validated ? 'Validated' : 'Pending'}
                          </Badge>
                          <Badge variant="gray" size="xs">
                            {session.sessionType}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary">No sessions recorded yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Statistics & Packages */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-bold text-text-primary">
                    {totalSessions}
                  </p>
                  <p className="text-sm text-text-secondary">Total Sessions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">
                    {activePackages}
                  </p>
                  <p className="text-sm text-text-secondary">Active Packages</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">
                    {totalPackages}
                  </p>
                  <p className="text-sm text-text-secondary">Total Packages Purchased</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary">
                    {totalSessions > 0 ? Math.round((validatedSessions / totalSessions) * 100) : 0}%
                  </p>
                  <p className="text-sm text-text-secondary">Validation Rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Package History</CardTitle>
                  {totalPackages > 0 && (
                    <Link href={`/packages?clientId=${client.id}`}>
                      <Button variant="ghost" size="sm">View All</Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {sortedPackages.length > 0 ? (
                  <div className="space-y-2 max-h-[320px] overflow-y-auto">
                    {sortedPackages.map((pkg: any) => {
                      const status = getPackageStatus(pkg)
                      return (
                        <Link key={pkg.id} href={`/packages/${pkg.id}`}>
                          <div className="p-2 border border-border rounded-lg hover:bg-background-secondary transition-colors cursor-pointer">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-text-primary">
                                {pkg.name}
                              </p>
                              <Badge variant={status.variant} size="xs">
                                {status.label}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-text-secondary">
                                {pkg.remainingSessions}/{pkg.totalSessions} sessions
                              </p>
                              {pkg.expiresAt && (
                                <p className="text-xs text-text-secondary">
                                  Expires: {new Date(pkg.expiresAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-text-secondary">No packages yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}