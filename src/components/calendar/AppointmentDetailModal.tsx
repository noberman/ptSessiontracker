'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'
import { Clock, MapPin, User, Package, FileText, CalendarDays } from 'lucide-react'

interface Appointment {
  id: string
  type: 'SESSION' | 'FITNESS_ASSESSMENT'
  status: 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED'
  scheduledAt: string
  duration: number
  notes: string | null
  prospectName: string | null
  prospectEmail: string | null
  trainer: { id: string; name: string; email: string }
  client: { id: string; name: string; email: string } | null
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
  const [cancelling, setCancelling] = useState(false)

  if (!appointment) return null

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
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update')
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
  const isScheduled = appointment.status === 'SCHEDULED'

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
            <Button size="sm" onClick={handleMarkCompleted}>
              Mark Completed
            </Button>
            <Button size="sm" variant="outline" onClick={handleMarkNoShow}>
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
      </div>
    </Modal>
  )
}
