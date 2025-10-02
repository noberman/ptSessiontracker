'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Clock, User, MapPin, Package, DollarSign, AlertCircle, CheckCircle, Trash2, XCircle } from 'lucide-react'
import { DeleteSessionDialog } from '@/components/sessions/DeleteSessionDialog'

interface SessionDetailsClientProps {
  session: {
    id: string
    sessionDate: Date
    sessionValue: number
    notes: string | null
    validated: boolean
    validatedAt: Date | null
    validationToken: string | null
    validationExpiry: Date | null
    cancelled?: boolean
    cancelledAt?: Date | null
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
}

export function SessionDetailsClient({ session, canEdit, canDelete }: SessionDetailsClientProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [markingNoShow, setMarkingNoShow] = useState(false)
  const router = useRouter()

  // Check if this is a substitute session
  const isSubstitute = session.client.primaryTrainer?.id !== session.trainerId

  const handleMarkNoShow = async () => {
    if (!confirm('Mark this session as a no-show? This cannot be undone.')) {
      return
    }
    
    setMarkingNoShow(true)
    
    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancelled: true,
          notes: session.notes ? `${session.notes}\n\nMarked as no-show` : 'Marked as no-show'
        })
      })
      
      if (response.ok) {
        alert('Session marked as no-show')
        router.refresh()
      } else {
        const data = await response.json()
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Failed to mark session as no-show')
    } finally {
      setMarkingNoShow(false)
    }
  }

  // Determine validation status
  const getValidationStatus = () => {
    if (session.cancelled) {
      return { label: 'No-Show', variant: 'error' as const, icon: XCircle }
    }
    if (session.validated) {
      return { label: 'Validated', variant: 'success' as const, icon: CheckCircle }
    }
    if (session.validationExpiry && new Date(session.validationExpiry) < new Date()) {
      return { label: 'Expired', variant: 'warning' as const, icon: AlertCircle }
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
              {new Date(session.sessionDate).toLocaleDateString('en-US', {
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
            {canEdit && !session.cancelled && (
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
                      // DEBUG: Log all the timezone data for investigation
                      const dateStr = session.sessionDate.toString()
                      const originalDate = session.sessionDate
                      
                      console.log('🕐 TIMEZONE DEBUG - Session Details:', {
                        originalSessionDate: originalDate,
                        dateStrToString: dateStr,
                        typeOfOriginal: typeof originalDate,
                        rawSessionDate: session.sessionDate,
                        newDateFromOriginal: new Date(originalDate),
                        newDateFromString: new Date(dateStr),
                        newDateUTCHours: new Date(originalDate).getUTCHours(),
                        newDateLocalHours: new Date(originalDate).getHours(),
                        currentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        currentTimezoneOffset: new Date().getTimezoneOffset()
                      })
                      
                      // Extract time components directly from ISO string to avoid timezone conversion
                      let hours: number, minutes: number
                      
                      if (dateStr.includes('T')) {
                        // Parse ISO format: 2024-01-01T19:22:00.000Z
                        const timePart = dateStr.split('T')[1].split('.')[0] // Gets "19:22:00"
                        const [h, m] = timePart.split(':').map(Number)
                        hours = h
                        minutes = m
                        console.log('🕐 TIMEZONE DEBUG - ISO Parsing:', {
                          timePart,
                          extractedHours: h,
                          extractedMinutes: m
                        })
                      } else {
                        // Fallback for other formats
                        const date = new Date(dateStr)
                        hours = date.getHours()
                        minutes = date.getMinutes()
                        console.log('🕐 TIMEZONE DEBUG - Fallback Parsing:', {
                          dateStr,
                          fallbackHours: hours,
                          fallbackMinutes: minutes
                        })
                      }
                      
                      const ampm = hours >= 12 ? 'PM' : 'AM'
                      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
                      const finalDisplay = `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`
                      
                      console.log('🕐 TIMEZONE DEBUG - Final Display:', {
                        hours,
                        minutes,
                        ampm,
                        displayHours,
                        finalDisplay
                      })
                      
                      return finalDisplay
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
                    Validated on {new Date(session.validatedAt).toLocaleDateString('en-US', {
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
              <CardTitle>Session Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-text-secondary">Created</p>
                <p className="text-sm text-text-primary">
                  {new Date(session.createdAt).toLocaleDateString('en-US', {
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
                  {new Date(session.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              {session.validationToken && !session.validated && (
                <div>
                  <p className="text-sm text-text-secondary">Validation Expires</p>
                  <p className="text-sm text-text-primary">
                    {session.validationExpiry ? 
                      new Date(session.validationExpiry).toLocaleDateString('en-US', {
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