'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Clock, User, MapPin, Package, DollarSign, AlertCircle, CheckCircle, Trash2 } from 'lucide-react'
import { DeleteSessionDialog } from '@/components/sessions/DeleteSessionDialog'
import { format, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { displaySessionTime } from '@/utils/timezone'

interface SessionDetailsClientProps {
  session: {
    id: string
    sessionDate: Date
    sessionValue: number
    notes: string | null
    validated: boolean
    validatedAt: Date | null
    cancelled: boolean
    cancelledAt: Date | null
    validationToken: string | null
    validationExpiry: Date | null
    createdAt: Date
    updatedAt: Date
    client: {
      id: string
      name: string
      email: string
      phone: string | null
      primaryTrainer?: {
        id: string
        name: string | null
      } | null
    }
    trainer: {
      id: string
      name: string | null
      email: string
    }
    trainerId: string
    location: {
      id: string
      name: string
    } | null
    package: {
      id: string
      name: string
      packageType: string
      totalSessions: number
      remainingSessions: number
    } | null
  }
  canEdit: boolean
  canDelete: boolean
  orgTimezone: string
}

export function SessionDetailsClient({ session, canEdit, canDelete, orgTimezone }: SessionDetailsClientProps) {
  console.log('🕐 SessionDetailsClient - Received props:', { 
    sessionId: session.id,
    orgTimezone,
    sessionDate: session.sessionDate,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    validatedAt: session.validatedAt,
    validationExpiry: session.validationExpiry
  })
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Check if this is a substitute session
  const isSubstitute = session.client.primaryTrainer?.id !== session.trainerId

  // Determine validation status
  const getValidationStatus = () => {
    // Check cancelled first
    if (session.cancelled) {
      return { label: 'Cancelled', variant: 'gray' as const, icon: AlertCircle }
    }
    if (session.validated) {
      return { label: 'Validated', variant: 'success' as const, icon: CheckCircle }
    }
    if (session.validationExpiry) {
      const expiryDate = typeof session.validationExpiry === 'string' 
        ? parseISO(session.validationExpiry)
        : session.validationExpiry
      const now = new Date()
      console.log('🕐 Validation expiry check:', { 
        expiry: expiryDate, 
        now, 
        isExpired: expiryDate < now 
      })
      if (expiryDate < now) {
        return { label: 'Expired', variant: 'warning' as const, icon: AlertCircle }
      }
    }
    return { label: 'Pending', variant: 'warning' as const, icon: Clock }
  }

  const validationStatus = getValidationStatus()

  return (
    <>
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Session Details</h1>
            <p className="text-sm text-text-secondary mt-1">
              {(() => {
                console.log('🕐 Session Date Header - Input:', session.sessionDate)
                const sessionDate = typeof session.sessionDate === 'string' 
                  ? parseISO(session.sessionDate)
                  : session.sessionDate
                const zonedDate = toZonedTime(sessionDate, orgTimezone)
                console.log('🕐 Session Date Header - After toZonedTime:', zonedDate)
                const formatted = format(zonedDate, 'EEEE, MMMM d, yyyy')
                console.log('🕐 Session Date Header - Formatted:', formatted)
                return formatted
              })()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/sessions">
              <Button variant="outline">Back to Sessions</Button>
            </Link>
            {canEdit && (
              <Link href={`/sessions/${session.id}/edit`}>
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
                    ${session.sessionValue.toFixed(2)}
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
                    {(() => {
                      console.log('🕐 Session Time Card - Input:', {
                        sessionDate: session.sessionDate,
                        createdAt: session.createdAt,
                        orgTimezone
                      })
                      const displayDate = displaySessionTime(
                        session.sessionDate, 
                        session.createdAt, 
                        orgTimezone
                      )
                      console.log('🕐 Session Time Card - After displaySessionTime:', displayDate)
                      const formatted = format(displayDate, 'hh:mm a')
                      console.log('🕐 Session Time Card - Formatted:', formatted)
                      return formatted
                    })()}
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
                    href={`/clients/${session.client.id}`}
                    className="text-primary-600 hover:underline"
                  >
                    {session.client.name}
                  </Link>
                  <p className="text-sm text-text-secondary">{session.client.email}</p>
                  {session.client.phone && (
                    <p className="text-sm text-text-secondary">{session.client.phone}</p>
                  )}
                </div>
              </div>

              {/* Trainer */}
              <div className="flex items-start space-x-3">
                <User className="w-5 h-5 text-text-secondary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-secondary">Trainer</p>
                  <p className="text-text-primary">{session.trainer.name || 'Unknown'}</p>
                  <p className="text-sm text-text-secondary">{session.trainer.email}</p>
                  {isSubstitute && session.client.primaryTrainer && (
                    <div className="mt-1">
                      <Badge variant="warning" size="sm">
                        Substitute for {session.client.primaryTrainer.name || 'Unknown'}
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
                  <p className="text-text-primary">{session.location?.name || 'N/A'}</p>
                </div>
              </div>

              {/* Package */}
              {session.package && (
                <div className="flex items-start space-x-3">
                  <Package className="w-5 h-5 text-text-secondary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-secondary">Package</p>
                    <Link 
                      href={`/packages/${session.package.id}`}
                      className="text-primary-600 hover:underline"
                    >
                      {session.package.name}
                    </Link>
                    <p className="text-sm text-text-secondary">
                      {session.package.packageType} - {session.package.remainingSessions}/{session.package.totalSessions} sessions remaining
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {session.notes && (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-medium text-text-secondary mb-2">Notes</p>
                  <p className="text-text-primary whitespace-pre-wrap">{session.notes}</p>
                </div>
              )}

              {/* Validation Details */}
              {session.validated && session.validatedAt && (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm font-medium text-text-secondary mb-2">Validation</p>
                  <p className="text-sm text-text-primary">
                    Validated on {(() => {
                      console.log('🕐 Validated At - Input:', session.validatedAt)
                      const validatedDate = typeof session.validatedAt === 'string' 
                        ? parseISO(session.validatedAt)
                        : session.validatedAt
                      const zonedDate = toZonedTime(validatedDate, orgTimezone)
                      console.log('🕐 Validated At - After toZonedTime:', zonedDate)
                      const formatted = format(zonedDate, 'EEEE, MMMM d, yyyy, hh:mm a')
                      console.log('🕐 Validated At - Formatted:', formatted)
                      return formatted
                    })()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Session Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-text-secondary">Created</p>
                <p className="text-sm text-text-primary">
                  {(() => {
                    console.log('🕐 Created At - Input:', session.createdAt)
                    const createdDate = typeof session.createdAt === 'string' 
                      ? parseISO(session.createdAt)
                      : session.createdAt
                    const zonedDate = toZonedTime(createdDate, orgTimezone)
                    console.log('🕐 Created At - After toZonedTime:', zonedDate)
                    const formatted = format(zonedDate, 'MMMM d, yyyy, hh:mm a')
                    console.log('🕐 Created At - Formatted:', formatted)
                    return formatted
                  })()}
                </p>
              </div>
              <div>
                <p className="text-sm text-text-secondary">Last Updated</p>
                <p className="text-sm text-text-primary">
                  {(() => {
                    console.log('🕐 Updated At - Input:', session.updatedAt)
                    const updatedDate = typeof session.updatedAt === 'string' 
                      ? parseISO(session.updatedAt)
                      : session.updatedAt
                    const zonedDate = toZonedTime(updatedDate, orgTimezone)
                    console.log('🕐 Updated At - After toZonedTime:', zonedDate)
                    const formatted = format(zonedDate, 'MMMM d, yyyy, hh:mm a')
                    console.log('🕐 Updated At - Formatted:', formatted)
                    return formatted
                  })()}
                </p>
              </div>
              {session.validationToken && !session.validated && (
                <div>
                  <p className="text-sm text-text-secondary">Validation Expires</p>
                  <p className="text-sm text-text-primary">
                    {session.validationExpiry ? (() => {
                      console.log('🕐 Validation Expiry - Input:', session.validationExpiry)
                      const expiryDate = typeof session.validationExpiry === 'string' 
                        ? parseISO(session.validationExpiry)
                        : session.validationExpiry
                      const zonedDate = toZonedTime(expiryDate, orgTimezone)
                      console.log('🕐 Validation Expiry - After toZonedTime:', zonedDate)
                      const formatted = format(zonedDate, 'MMMM d, yyyy')
                      console.log('🕐 Validation Expiry - Formatted:', formatted)
                      return formatted
                    })() : 'No expiry'}
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
                {!session.validated && ' The session will be restored to the package.'}
              </p>
              <Button 
                variant="danger"
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Session</span>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <DeleteSessionDialog
          sessionId={session.id}
          clientName={session.client.name}
          sessionDate={session.sessionDate}
          validated={session.validated}
          onClose={() => setShowDeleteDialog(false)}
        />
      )}
    </>
  )
}