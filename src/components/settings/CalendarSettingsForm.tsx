'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'

interface CalendarSettingsFormProps {
  organizationId: string
  calendarEnabled: boolean
  availabilityEditableBy: string
}

export function CalendarSettingsForm({
  organizationId,
  calendarEnabled: initialEnabled,
  availabilityEditableBy: initialEditableBy,
}: CalendarSettingsFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [calendarEnabled, setCalendarEnabled] = useState(initialEnabled)
  const [availabilityEditableBy, setAvailabilityEditableBy] = useState(initialEditableBy)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarEnabled, availabilityEditableBy }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update calendar settings')
      }

      toast.success('Calendar settings updated')
      router.refresh()
    } catch (error) {
      console.error('Error updating calendar settings:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Calendar Enable Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <label htmlFor="calendarEnabled" className="block text-sm font-medium text-text-primary">
            Enable Calendar
          </label>
          <p className="text-sm text-text-secondary mt-0.5">
            Allow trainers and managers to view and manage availability through the calendar
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={calendarEnabled}
          onClick={() => setCalendarEnabled(!calendarEnabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            calendarEnabled ? 'bg-primary' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              calendarEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Availability Editable By */}
      <div>
        <label htmlFor="availabilityEditableBy" className="block text-sm font-medium text-text-primary mb-1">
          Who can edit trainer availability?
        </label>
        <p className="text-sm text-text-secondary mb-2">
          Controls whether trainers can set their own availability or only managers can
        </p>
        <select
          id="availabilityEditableBy"
          value={availabilityEditableBy}
          onChange={(e) => setAvailabilityEditableBy(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary"
        >
          <option value="MANAGER_ONLY">Managers only</option>
          <option value="MANAGER_AND_TRAINER">Managers and trainers</option>
        </select>
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
