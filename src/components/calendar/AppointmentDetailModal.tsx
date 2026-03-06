'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'
import { Clock, MapPin, User, Package, FileText, CalendarDays, ShoppingBag, X } from 'lucide-react'

interface Appointment {
  id: string
  type: 'SESSION' | 'FITNESS_ASSESSMENT'
  status: 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED'
  scheduledAt: string
  duration: number
  notes: string | null
  prospectName: string | null
  prospectEmail: string | null
  saleOutcome: string | null
  trainer: { id: string; name: string; email: string }
  client: { id: string; name: string; email: string; status?: string } | null
  location: { id: string; name: string }
  package: { id: string; name: string } | null
  bookedBy: { id: string; name: string; email: string } | null
}

interface AppointmentDetailModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: Appointment | null
  orgTimezone: string
  onUpdated: () => void
}

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  NO_SHOW: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

const TYPE_LABELS: Record<string, string> = {
  SESSION: 'Session',
  FITNESS_ASSESSMENT: 'Fitness Assessment',
}

export function AppointmentDetailModal({
  isOpen,
  onClose,
  appointment,
  orgTimezone,
  onUpdated,
}: AppointmentDetailModalProps) {
  const router = useRouter()
  const [cancelling, setCancelling] = useState(false)
  const [loggingSession, setLoggingSession] = useState(false)
  const [showSaleOutcome, setShowSaleOutcome] = useState(false)
  const [savingOutcome, setSavingOutcome] = useState(false)

  if (!appointment) return null

  const isSessionType = appointment.type === 'SESSION'
  const isAssessmentType = appointment.type === 'FITNESS_ASSESSMENT'
  const isScheduled = appointment.status === 'SCHEDULED'
  const isCompleted = appointment.status === 'COMPLETED'
  const hasClient = !!appointment.client
  const hasProspect = !appointment.client && !!appointment.prospectName

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return

    setCancelling(true)
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to cancel')
      }
      toast.success('Appointment cancelled')
      onUpdated()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel appointment')
    } finally {
      setCancelling(false)
    }
  }

  const handleMarkNoShow = async () => {
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'NO_SHOW' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update')
      }
      toast.success('Marked as no-show')
      onUpdated()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update')
    }
  }

  const handleMarkCompleted = async () => {
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update')
      }
      toast.success('Marked as completed')
      onUpdated()

      // For fitness assessments, show sale outcome step instead of closing
      if (isAssessmentType) {
        setShowSaleOutcome(true)
      } else {
        onClose()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update')
    }
  }

  const handleSaleOutcome = async (outcome: 'SALE' | 'NO_SALE') => {
    setSavingOutcome(true)
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleOutcome: outcome }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save outcome')
      }
      onUpdated()

      if (outcome === 'SALE') {
        const clientId = appointment.client?.id
        onClose()
        router.push(clientId ? `/packages/new?clientId=${clientId}` : '/packages/new')
      } else {
        toast.success('Outcome recorded')
        onClose()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save outcome')
    } finally {
      setSavingOutcome(false)
    }
  }

  const handleLogSession = async () => {
    if (!appointment.client || !appointment.package) return

    setLoggingSession(true)
    try {
      const scheduled = new Date(appointment.scheduledAt)
      const sessionDate = scheduled.toLocaleDateString('en-CA', { timeZone: orgTimezone })
      const sessionTime = scheduled.toLocaleTimeString('en-GB', {
        timeZone: orgTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: appointment.client.id,
          trainerId: appointment.trainer.id,
          packageId: appointment.package.id,
          sessionDate,
          sessionTime,
          notes: appointment.notes || '',
          isNoShow: false,
          appointmentId: appointment.id,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to log session')
      }

      toast.success('Session logged and appointment completed')
      onUpdated()
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to log session')
    } finally {
      setLoggingSession(false)
    }
  }

  // Format scheduled time in org timezone
  const scheduledDate = new Date(appointment.scheduledAt)
  const formattedDate = scheduledDate.toLocaleDateString('en-US', {
    timeZone: orgTimezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const formattedTime = scheduledDate.toLocaleTimeString('en-US', {
    timeZone: orgTimezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  const endTime = new Date(scheduledDate.getTime() + appointment.duration * 60 * 1000)
  const formattedEndTime = endTime.toLocaleTimeString('en-US', {
    timeZone: orgTimezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  const clientName = appointment.client?.name || appointment.prospectName || 'Unknown'
  const clientEmail = appointment.client?.email || appointment.prospectEmail || ''

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Appointment Details" size="md">
      <div className="space-y-4">
        {/* Status & Type badges */}
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[appointment.status]}`}>
            {appointment.status.replace('_', ' ')}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            appointment.type === 'SESSION' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
          }`}>
            {TYPE_LABELS[appointment.type]}
          </span>
          {!appointment.client && appointment.prospectName && (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
              Prospect
            </span>
          )}
        </div>

        {/* Details */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CalendarDays className="h-4 w-4 text-text-tertiary mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium text-text-primary">{formattedDate}</div>
              <div className="text-sm text-text-secondary">
                {formattedTime} — {formattedEndTime} ({appointment.duration} min)
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="h-4 w-4 text-text-tertiary mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium text-text-primary">{clientName}</div>
              {clientEmail && (
                <div className="text-sm text-text-secondary">{clientEmail}</div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-text-tertiary mt-0.5 shrink-0" />
            <div className="text-sm text-text-primary">{appointment.location.name}</div>
          </div>

          {appointment.package && (
            <div className="flex items-start gap-3">
              <Package className="h-4 w-4 text-text-tertiary mt-0.5 shrink-0" />
              <div className="text-sm text-text-primary">{appointment.package.name}</div>
            </div>
          )}

          {appointment.notes && (
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-text-tertiary mt-0.5 shrink-0" />
              <div className="text-sm text-text-secondary">{appointment.notes}</div>
            </div>
          )}

          {appointment.bookedBy && (
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-text-tertiary mt-0.5 shrink-0" />
              <div className="text-sm text-text-secondary">
                Booked by {appointment.bookedBy.name || appointment.bookedBy.email}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {isScheduled && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            {isSessionType && hasClient ? (
              <Button
                size="sm"
                onClick={handleLogSession}
                disabled={loggingSession}
              >
                {loggingSession ? 'Logging...' : 'Log Session'}
              </Button>
            ) : (
              <Button size="sm" onClick={handleMarkCompleted}>
                Mark Completed
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={handleMarkNoShow} className="text-gray-700 hover:text-gray-900 border-gray-300 hover:border-gray-400">
              No-Show
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={cancelling}
              className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Appointment'}
            </Button>
          </div>
        )}

        {/* Sale outcome step for fitness assessments */}
        {showSaleOutcome && isAssessmentType && (
          <div className="pt-3 border-t border-border">
            <p className="text-sm font-medium text-text-primary mb-3">Did this assessment result in a sale?</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleSaleOutcome('SALE')}
                disabled={savingOutcome}
                className="flex-1"
              >
                <ShoppingBag className="w-4 h-4 mr-1.5" />
                {savingOutcome ? 'Saving...' : 'Sale'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSaleOutcome('NO_SALE')}
                disabled={savingOutcome}
                className="flex-1 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              >
                <X className="w-4 h-4 mr-1.5" />
                {savingOutcome ? 'Saving...' : 'No Sale'}
              </Button>
            </div>
          </div>
        )}

        {/* Show recorded outcome for completed fitness assessments */}
        {isCompleted && isAssessmentType && !showSaleOutcome && appointment.saleOutcome && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>
                Outcome: <span className="font-medium text-text-primary">
                  {appointment.saleOutcome === 'SALE' ? 'Sale' : 'No Sale'}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
