import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Calendar, Clock, User, MapPin, Package, DollarSign, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

export default async function SessionDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Fetch session data
  const trainingSession = await prisma.session.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          primaryTrainer: {
            select: {
              id: true,
              name: true,
            }
          }
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
          totalSessions: true,
          remainingSessions: true,
        }
      }
    }
  })

  if (!trainingSession) {
    redirect('/sessions')
  }

  // Check permissions
  if (session.user.role === 'TRAINER' && trainingSession.trainerId !== session.user.id) {
    redirect('/sessions')
  }

  if (session.user.role === 'CLUB_MANAGER' && session.user.locationId !== trainingSession.locationId) {
    redirect('/sessions')
  }

  // Check if this is a substitute session
  const isSubstitute = trainingSession.client.primaryTrainer?.id !== trainingSession.trainerId

  // Determine validation status
  const getValidationStatus = () => {
    if (trainingSession.validated) {
      return { label: 'Validated', variant: 'success' as const, icon: CheckCircle }
    }
    if (trainingSession.validationExpiry && new Date(trainingSession.validationExpiry) < new Date()) {
      return { label: 'Expired', variant: 'warning' as const, icon: AlertCircle }
    }
    return { label: 'Pending', variant: 'warning' as const, icon: Clock }
  }

  const validationStatus = getValidationStatus()

  // Determine if user can edit
  const canEdit = 
    (session.user.role === 'ADMIN') ||
    (session.user.role === 'PT_MANAGER') ||
    (session.user.role === 'CLUB_MANAGER' && session.user.locationId === trainingSession.locationId) ||
    (session.user.role === 'TRAINER' && trainingSession.trainerId === session.user.id && !trainingSession.validated)

  const canDelete = session.user.role === 'ADMIN' || session.user.role === 'PT_MANAGER'

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Session Details</h1>
          <p className="text-sm text-text-secondary mt-1">
            {new Date(trainingSession.sessionDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/sessions">
            <Button variant="outline">Back to Sessions</Button>
          </Link>
          {canEdit && (
            <Link href={`/sessions/${id}/edit`}>
              <Button>Edit Session</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Session Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Status</p>
                <Badge variant={validationStatus.variant} className="mt-1">
                  <validationStatus.icon className="w-3 h-3 mr-1" />
                  {validationStatus.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Session Value</p>
                <p className="text-xl font-semibold text-text-primary">
                  ${trainingSession.sessionValue.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-5 h-5 text-text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Time</p>
                <p className="text-xl font-semibold text-text-primary">
                  {new Date(trainingSession.sessionDate).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <Clock className="w-5 h-5 text-text-secondary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Type</p>
                <Badge variant={isSubstitute ? 'warning' : 'default'} className="mt-1">
                  {isSubstitute ? 'Substitute' : 'Regular'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Session Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Session Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Client */}
            <div className="flex items-start space-x-3">
              <User className="w-5 h-5 text-text-secondary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text-secondary">Client</p>
                <Link 
                  href={`/clients/${trainingSession.client.id}`}
                  className="text-primary-600 hover:underline"
                >
                  {trainingSession.client.name}
                </Link>
                <p className="text-sm text-text-secondary">{trainingSession.client.email}</p>
                {trainingSession.client.phone && (
                  <p className="text-sm text-text-secondary">{trainingSession.client.phone}</p>
                )}
              </div>
            </div>

            {/* Trainer */}
            <div className="flex items-start space-x-3">
              <User className="w-5 h-5 text-text-secondary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text-secondary">Trainer</p>
                <p className="text-text-primary">{trainingSession.trainer.name}</p>
                <p className="text-sm text-text-secondary">{trainingSession.trainer.email}</p>
                {isSubstitute && (
                  <div className="mt-1">
                    <Badge variant="warning" size="sm">
                      Substitute for {trainingSession.client.primaryTrainer?.name}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-text-secondary mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text-secondary">Location</p>
                <p className="text-text-primary">{trainingSession.location?.name || 'N/A'}</p>
              </div>
            </div>

            {/* Package */}
            {trainingSession.package && (
              <div className="flex items-start space-x-3">
                <Package className="w-5 h-5 text-text-secondary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-secondary">Package</p>
                  <Link 
                    href={`/packages/${trainingSession.package.id}`}
                    className="text-primary-600 hover:underline"
                  >
                    {trainingSession.package.name}
                  </Link>
                  <p className="text-sm text-text-secondary">
                    {trainingSession.package.packageType} - {trainingSession.package.remainingSessions}/{trainingSession.package.totalSessions} sessions remaining
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            {trainingSession.notes && (
              <div className="pt-4 border-t border-border">
                <p className="text-sm font-medium text-text-secondary mb-2">Notes</p>
                <p className="text-text-primary whitespace-pre-wrap">{trainingSession.notes}</p>
              </div>
            )}

            {/* Validation Details */}
            {trainingSession.validated && trainingSession.validatedAt && (
              <div className="pt-4 border-t border-border">
                <p className="text-sm font-medium text-text-secondary mb-2">Validation</p>
                <p className="text-sm text-text-primary">
                  Validated on {new Date(trainingSession.validatedAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Session Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-text-secondary">Created</p>
              <p className="text-sm text-text-primary">
                {new Date(trainingSession.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Last Updated</p>
              <p className="text-sm text-text-primary">
                {new Date(trainingSession.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            {trainingSession.validationToken && !trainingSession.validated && (
              <div>
                <p className="text-sm text-text-secondary">Validation Expires</p>
                <p className="text-sm text-text-primary">
                  {trainingSession.validationExpiry ? 
                    new Date(trainingSession.validationExpiry).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }) : 'No expiry'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {canDelete && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary mb-4">
              Deleting this session will permanently remove it from the system. 
              {!trainingSession.validated && ' The session will be restored to the package.'}
            </p>
            <Button variant="danger">
              Delete Session
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}