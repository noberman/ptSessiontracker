import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PackageActions } from '@/components/packages/PackageActions'
import { PaymentSection } from '@/components/packages/PaymentSection'

export default async function ViewPackagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Fetch package data
  const packageData = await prisma.package.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          locationId: true,
          location: {
            select: {
              name: true,
            },
          },
        },
      },
      sessions: {
        orderBy: {
          sessionDate: 'desc',
        },
        take: 10,
        include: {
          trainer: {
            select: {
              name: true,
              email: true,
            },
          },
          location: {
            select: {
              name: true,
            },
          },
        },
      },
      packageTypeModel: {
        select: {
          startTrigger: true,
          expiryDurationValue: true,
          expiryDurationUnit: true,
        },
      },
      _count: {
        select: {
          sessions: true,
        },
      },
    },
  })

  if (!packageData) {
    redirect('/packages')
  }

  // Check permissions
  if (session.user.role === 'TRAINER') {
    // Trainers can only view packages of their clients
    const isTheirClient = await prisma.client.findFirst({
      where: {
        id: packageData.clientId,
        primaryTrainerId: session.user.id,
      },
    })
    if (!isTheirClient) {
      redirect('/packages')
    }
  } else if (session.user.role === 'CLUB_MANAGER') {
    const manager = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { locations: true }
    })
    
    const hasAccess = manager?.locations.some(l => l.locationId === packageData.client.locationId)
    if (!hasAccess) {
      redirect('/packages')
    }
  }

  const usedSessions = packageData._count.sessions
  const percentUsed = packageData.totalSessions > 0 
    ? Math.round((usedSessions / packageData.totalSessions) * 100)
    : 0
  const isExpired = packageData.expiresAt && new Date(packageData.expiresAt) < new Date()
  const isNotStarted = packageData.packageTypeId && packageData.effectiveStartDate === null
  const isFirstSessionTrigger = packageData.packageTypeModel?.startTrigger === 'FIRST_SESSION'
  const hasDuration = packageData.packageTypeModel?.expiryDurationValue && packageData.packageTypeModel?.expiryDurationUnit

  const formatDuration = (value: number, unit: string): string => {
    const labels: Record<string, [string, string]> = {
      DAYS: ['day', 'days'],
      WEEKS: ['week', 'weeks'],
      MONTHS: ['month', 'months'],
    }
    const [singular, plural] = labels[unit] || [unit.toLowerCase(), unit.toLowerCase()]
    return `${value} ${value === 1 ? singular : plural}`
  }
  
  const canEdit = session.user.role !== 'TRAINER'
  const canDelete = session.user.role === 'ADMIN'
  const canRecordPayment = ['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)
  const canDeletePayment = ['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)
  const canEditPayment = ['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)

  // Fetch trainers for sales attribution dropdowns
  const orgTrainers = canRecordPayment || canEditPayment
    ? await prisma.user.findMany({
        where: {
          organizationId: session.user.organizationId,
          active: true,
          role: { in: ['TRAINER', 'PT_MANAGER', 'CLUB_MANAGER'] },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : []

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Package Details</h1>
          <p className="text-sm text-text-secondary mt-1">
            {packageData.name}
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href="/packages">
            <Button variant="outline">Back</Button>
          </Link>
          {canEdit && (
            <Link href={`/packages/${id}/edit`}>
              <Button>Edit Package</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Package Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Package Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-text-secondary">Package Type</dt>
                <dd className="mt-1">
                  <Badge variant="default">{packageData.packageType}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-secondary">Status</dt>
                <dd className="mt-1">
                  <div className="flex items-center space-x-2">
                    {!packageData.active ? (
                      <Badge variant="gray">Inactive</Badge>
                    ) : isNotStarted ? (
                      <Badge variant="default">Not Started</Badge>
                    ) : isExpired ? (
                      <Badge variant="error">Expired</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </div>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-secondary">Total Value</dt>
                <dd className="mt-1 text-lg font-semibold text-text-primary">
                  ${packageData.totalValue.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-secondary">Per Session Value</dt>
                <dd className="mt-1 text-lg font-semibold text-text-primary">
                  ${packageData.sessionValue.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-secondary">Purchase Date</dt>
                <dd className="mt-1 text-text-primary">
                  {new Date(packageData.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-secondary">Start Date</dt>
                <dd className="mt-1 text-text-primary">
                  {isNotStarted
                    ? <span className="text-text-tertiary italic">Pending first session</span>
                    : packageData.effectiveStartDate
                      ? new Date(packageData.effectiveStartDate).toLocaleDateString()
                      : packageData.startDate
                        ? new Date(packageData.startDate).toLocaleDateString()
                        : 'Not set'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-secondary">Expiration Date</dt>
                <dd className="mt-1 text-text-primary">
                  {isNotStarted && hasDuration
                    ? <span className="text-text-tertiary italic">
                        {formatDuration(packageData.packageTypeModel!.expiryDurationValue!, packageData.packageTypeModel!.expiryDurationUnit!)} after first session
                      </span>
                    : packageData.expiresAt
                      ? new Date(packageData.expiresAt).toLocaleDateString()
                      : 'No expiration'}
                </dd>
              </div>
            </dl>

            {/* Session Progress */}
            <div className="mt-6 pt-6 border-t border-border">
              <h4 className="text-sm font-medium text-text-secondary mb-2">Session Usage</h4>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold text-text-primary">
                  {packageData.remainingSessions} / {packageData.totalSessions}
                </span>
                <span className="text-sm text-text-secondary">
                  {usedSessions} used ({percentUsed}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all ${
                    percentUsed > 75 ? 'bg-error-500' : 
                    percentUsed > 50 ? 'bg-warning-500' : 
                    'bg-success-500'
                  }`}
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
            </div>

            {/* Actions */}
            {canDelete && (
              <div className="mt-6 pt-6 border-t border-border">
                <PackageActions 
                  packageId={id}
                  packageName={packageData.name}
                  hasSessionsLogged={usedSessions > 0}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-text-secondary">Name</dt>
                <dd className="mt-1">
                  <Link 
                    href={`/clients/${packageData.client.id}`}
                    className="text-primary-600 hover:underline"
                  >
                    {packageData.client.name}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-text-secondary">Email</dt>
                <dd className="mt-1 text-sm text-text-primary">
                  {packageData.client.email}
                </dd>
              </div>
              {packageData.client.phone && (
                <div>
                  <dt className="text-sm font-medium text-text-secondary">Phone</dt>
                  <dd className="mt-1 text-sm text-text-primary">
                    {packageData.client.phone}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-text-secondary">Location</dt>
                <dd className="mt-1 text-sm text-text-primary">
                  {packageData.client.location?.name || 'N/A'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Payment Status */}
      <div className="mb-6">
        <PaymentSection
          packageId={id}
          packageName={packageData.name}
          canRecordPayment={canRecordPayment}
          canDeletePayment={canDeletePayment}
          canEditPayment={canEditPayment}
          trainers={orgTrainers}
        />
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {packageData.sessions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-background-secondary">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Trainer
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
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border">
                  {packageData.sessions.map((session) => (
                    <tr key={session.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {new Date(session.sessionDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {session.trainer.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        {session.location?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                        ${session.sessionValue.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={session.validated ? 'success' : 'warning'} size="sm">
                          {session.validated ? 'Validated' : 'Pending'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-text-secondary text-center py-8">
              No sessions logged for this package yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}