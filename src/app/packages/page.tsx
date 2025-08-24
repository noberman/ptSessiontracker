import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    page?: string
    clientId?: string
    active?: string 
  }>
}) {
  const params = await searchParams
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const page = parseInt(params.page || '1')
  const limit = 10
  const clientId = params.clientId || ''
  const active = params.active !== 'false'
  
  const skip = (page - 1) * limit

  const where: any = {}

  if (params.active !== undefined) {
    where.active = active
  } else {
    where.active = true
  }

  if (clientId) {
    where.clientId = clientId
  }

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

  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Packages</h1>
            <p className="text-sm text-text-secondary mt-1">
              Manage client training packages
            </p>
          </div>
          {canCreate && (
            <Link href="/packages/new">
              <Button>Add New Package</Button>
            </Link>
          )}
        </div>

        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-background-secondary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Package
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Sessions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Expiration
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
                {packages.map((pkg: any) => {
                  const usedSessions = pkg._count.sessions
                  const percentUsed = pkg.totalSessions > 0 
                    ? Math.round((usedSessions / pkg.totalSessions) * 100)
                    : 0
                  const isExpired = pkg.expiresAt && new Date(pkg.expiresAt) < new Date()
                  
                  return (
                    <tr key={pkg.id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-text-primary">
                            {pkg.client.name}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {pkg.client.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-text-primary">
                            {pkg.name}
                          </div>
                          <Badge variant="gray" size="xs" className="mt-1">
                            {pkg.packageType}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-text-primary">
                            ${pkg.totalValue.toFixed(2)}
                          </div>
                          <div className="text-xs text-text-secondary">
                            ${pkg.sessionValue.toFixed(2)}/session
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-text-primary">
                            {pkg.remainingSessions} / {pkg.totalSessions}
                          </div>
                          <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className={`h-2 rounded-full ${
                                percentUsed > 75 ? 'bg-error-500' : 
                                percentUsed > 50 ? 'bg-warning-500' : 
                                'bg-success-500'
                              }`}
                              style={{ width: `${percentUsed}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {pkg.expiresAt ? (
                          <div>
                            <div className="text-sm text-text-primary">
                              {new Date(pkg.expiresAt).toLocaleDateString()}
                            </div>
                            {isExpired && (
                              <Badge variant="error" size="xs" className="mt-1">
                                Expired
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-text-secondary">No expiry</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={pkg.active ? 'success' : 'gray'} size="sm">
                          {pkg.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <Link href={`/packages/${pkg.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                          {canEdit && (
                            <Link href={`/packages/${pkg.id}/edit`}>
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {packages.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-text-secondary">
                      No packages found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-3 flex items-center justify-between border-t border-border bg-background-secondary">
            <div className="text-sm text-text-secondary">
              Showing {packages.length > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} results
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}