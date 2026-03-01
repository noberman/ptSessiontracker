'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { toast } from 'react-hot-toast'
import { Trash2, Plus } from 'lucide-react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const TIME_SLOTS = generateTimeSlots()

function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}

interface AvailabilityEntry {
  id: string
  trainerId: string
  dayOfWeek: number | null
  startTime: string
  endTime: string
  specificDate: string | null
  isAvailable: boolean
}

interface AvailabilityEditorProps {
  isOpen: boolean
  onClose: () => void
  trainerId: string
  trainerName: string
  onSaved: () => void
}

export function AvailabilityEditor({
  isOpen,
  onClose,
  trainerId,
  trainerName,
  onSaved,
}: AvailabilityEditorProps) {
  const [entries, setEntries] = useState<AvailabilityEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'recurring' | 'overrides'>('recurring')

  // New recurring entry form
  const [newDayOfWeek, setNewDayOfWeek] = useState(1) // Monday
  const [newStartTime, setNewStartTime] = useState('09:00')
  const [newEndTime, setNewEndTime] = useState('17:00')

  // New override form
  const [overrideDate, setOverrideDate] = useState('')
  const [overrideStartTime, setOverrideStartTime] = useState('09:00')
  const [overrideEndTime, setOverrideEndTime] = useState('17:00')
  const [overrideIsAvailable, setOverrideIsAvailable] = useState(true)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/availability?trainerId=${trainerId}`)
      if (!response.ok) throw new Error('Failed to fetch availability')
      const data = await response.json()
      setEntries(data)
    } catch (error) {
      console.error('Failed to fetch availability:', error)
      toast.error('Failed to load availability')
    } finally {
      setLoading(false)
    }
  }, [trainerId])

  useEffect(() => {
    if (isOpen && trainerId) {
      fetchEntries()
    }
  }, [isOpen, trainerId, fetchEntries])

  const recurringEntries = entries.filter((e) => e.dayOfWeek !== null && !e.specificDate)
  const overrideEntries = entries.filter((e) => e.specificDate !== null)

  const handleAddRecurring = async () => {
    if (newStartTime >= newEndTime) {
      toast.error('Start time must be before end time')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerId,
          dayOfWeek: newDayOfWeek,
          startTime: newStartTime,
          endTime: newEndTime,
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to add availability')
      }
      toast.success('Availability added')
      await fetchEntries()
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add availability')
    } finally {
      setSaving(false)
    }
  }

  const handleAddOverride = async () => {
    if (!overrideDate) {
      toast.error('Please select a date')
      return
    }
    if (overrideIsAvailable && overrideStartTime >= overrideEndTime) {
      toast.error('Start time must be before end time')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerId,
          specificDate: overrideDate,
          startTime: overrideIsAvailable ? overrideStartTime : '00:00',
          endTime: overrideIsAvailable ? overrideEndTime : '00:15',
          isAvailable: overrideIsAvailable,
        }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to add override')
      }
      toast.success('Override added')
      setOverrideDate('')
      await fetchEntries()
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add override')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/availability/${id}`, { method: 'DELETE' })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to delete')
      }
      toast.success('Entry deleted')
      await fetchEntries()
      onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete entry')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Set Availability — ${trainerName}`} size="lg">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'recurring'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => setActiveTab('recurring')}
          >
            Weekly Schedule
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overrides'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
            onClick={() => setActiveTab('overrides')}
          >
            Date Overrides
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-text-secondary">Loading...</div>
        ) : activeTab === 'recurring' ? (
          <div className="space-y-4">
            {/* Existing recurring entries */}
            {recurringEntries.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-text-primary">Current Schedule</h3>
                {DAYS.map((dayName, dayIndex) => {
                  const dayEntries = recurringEntries
                    .filter((e) => e.dayOfWeek === dayIndex)
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  if (dayEntries.length === 0) return null
                  return (
                    <div key={dayIndex} className="flex items-start gap-3 py-1.5">
                      <span className="text-sm font-medium text-text-primary w-24 shrink-0 pt-0.5">
                        {dayName}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {dayEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center gap-1.5 bg-primary/10 text-primary text-sm px-2.5 py-1 rounded-md"
                          >
                            <span>
                              {entry.startTime} - {entry.endTime}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDelete(entry.id)}
                              className="text-primary/60 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-text-secondary py-2">
                No recurring schedule set. Add working hours below.
              </p>
            )}

            {/* Add recurring entry */}
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-medium text-text-primary mb-3">Add Working Hours</h3>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Day</label>
                  <select
                    value={newDayOfWeek}
                    onChange={(e) => setNewDayOfWeek(Number(e.target.value))}
                    className="px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary text-sm"
                  >
                    {DAYS.map((day, i) => (
                      <option key={i} value={i}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Start</label>
                  <select
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary text-sm"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">End</label>
                  <select
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary text-sm"
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddRecurring}
                  disabled={saving}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {saving ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Existing overrides */}
            {overrideEntries.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-text-primary">Existing Overrides</h3>
                {overrideEntries
                  .sort((a, b) => (a.specificDate ?? '').localeCompare(b.specificDate ?? ''))
                  .map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between py-2 px-3 rounded-md bg-background-secondary"
                    >
                      <div className="text-sm">
                        <span className="font-medium text-text-primary">
                          {entry.specificDate
                            ? new Date(entry.specificDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </span>
                        {entry.isAvailable ? (
                          <span className="text-text-secondary ml-2">
                            {entry.startTime} - {entry.endTime}
                          </span>
                        ) : (
                          <span className="text-red-500 ml-2">Day off</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="text-text-tertiary hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary py-2">
                No date overrides set. Add one below to override the weekly schedule for a specific date.
              </p>
            )}

            {/* Add override */}
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-medium text-text-primary mb-3">Add Date Override</h3>
              <div className="space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Date</label>
                    <input
                      type="date"
                      value={overrideDate}
                      onChange={(e) => setOverrideDate(e.target.value)}
                      className="px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Type</label>
                    <select
                      value={overrideIsAvailable ? 'available' : 'dayoff'}
                      onChange={(e) => setOverrideIsAvailable(e.target.value === 'available')}
                      className="px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary text-sm"
                    >
                      <option value="available">Custom hours</option>
                      <option value="dayoff">Day off</option>
                    </select>
                  </div>
                  {overrideIsAvailable && (
                    <>
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">Start</label>
                        <select
                          value={overrideStartTime}
                          onChange={(e) => setOverrideStartTime(e.target.value)}
                          className="px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary text-sm"
                        >
                          {TIME_SLOTS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">End</label>
                        <select
                          value={overrideEndTime}
                          onChange={(e) => setOverrideEndTime(e.target.value)}
                          className="px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary text-sm"
                        >
                          {TIME_SLOTS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddOverride}
                  disabled={saving}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {saving ? 'Adding...' : 'Add Override'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
