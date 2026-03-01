'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AvailabilityEditor } from './AvailabilityEditor'
import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react'

interface Trainer {
  id: string
  name: string
  email: string
}

interface DayAvailability {
  isAvailable: boolean
  blocks: { startTime: string; endTime: string }[]
}

interface CalendarViewProps {
  trainers: Trainer[]
  currentUserId: string
  isManager: boolean
  canEdit: boolean
}

function getWeekDates(baseDate: Date): Date[] {
  const start = new Date(baseDate)
  const day = start.getDay()
  // Adjust to Monday
  start.setDate(start.getDate() - ((day + 6) % 7))
  const dates: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(d)
  }
  return dates
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CalendarView({ trainers, currentUserId, isManager, canEdit }: CalendarViewProps) {
  const [selectedTrainerId, setSelectedTrainerId] = useState(
    isManager ? (trainers[0]?.id ?? '') : currentUserId
  )
  const [weekOffset, setWeekOffset] = useState(0)
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>({})
  const [loading, setLoading] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)

  const today = new Date()
  const baseDate = new Date(today)
  baseDate.setDate(baseDate.getDate() + weekOffset * 7)
  const weekDates = getWeekDates(baseDate)
  const startDate = formatDateKey(weekDates[0])
  const endDate = formatDateKey(weekDates[6])

  const selectedTrainer = trainers.find((t) => t.id === selectedTrainerId)

  const fetchAvailability = useCallback(async () => {
    if (!selectedTrainerId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/availability/resolve?trainerId=${selectedTrainerId}&startDate=${startDate}&endDate=${endDate}`
      )
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setAvailability(data)
    } catch (error) {
      console.error('Failed to fetch availability:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedTrainerId, startDate, endDate])

  useEffect(() => {
    fetchAvailability()
  }, [fetchAvailability])

  const weekLabel = `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {isManager && trainers.length > 1 && (
            <select
              value={selectedTrainerId}
              onChange={(e) => setSelectedTrainerId(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary text-sm"
            >
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.email}
                </option>
              ))}
            </select>
          )}

          {/* Week navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset((o) => o - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-text-primary min-w-[180px] text-center">
              {weekLabel}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset((o) => o + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {weekOffset !== 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWeekOffset(0)}
                className="text-xs"
              >
                Today
              </Button>
            )}
          </div>
        </div>

        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1.5" />
            Set Availability
          </Button>
        )}
      </div>

      {/* Weekly availability grid */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-text-secondary">Loading availability...</div>
        ) : (
          <div className="grid grid-cols-7 divide-x divide-border">
            {weekDates.map((date, i) => {
              const key = formatDateKey(date)
              const day = availability[key]
              const isToday = formatDateKey(today) === key

              return (
                <div key={key} className="min-h-[180px]">
                  {/* Day header */}
                  <div
                    className={`px-3 py-2 border-b border-border text-center ${
                      isToday ? 'bg-primary/10' : 'bg-background-secondary'
                    }`}
                  >
                    <div className="text-xs text-text-secondary">{DAY_NAMES[i]}</div>
                    <div
                      className={`text-sm font-medium ${
                        isToday ? 'text-primary' : 'text-text-primary'
                      }`}
                    >
                      {date.getDate()}
                    </div>
                  </div>

                  {/* Availability blocks */}
                  <div className="p-2 space-y-1">
                    {day?.isAvailable && day.blocks.length > 0 ? (
                      day.blocks.map((block, bi) => (
                        <div
                          key={bi}
                          className="bg-green-50 border border-green-200 text-green-700 rounded px-2 py-1 text-xs"
                        >
                          {block.startTime} - {block.endTime}
                        </div>
                      ))
                    ) : day && !day.isAvailable ? (
                      <div className="text-xs text-text-tertiary text-center pt-4">
                        Not available
                      </div>
                    ) : (
                      <div className="text-xs text-text-tertiary text-center pt-4">
                        No schedule
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Availability Editor Modal */}
      {canEdit && (
        <AvailabilityEditor
          isOpen={editorOpen}
          onClose={() => setEditorOpen(false)}
          trainerId={selectedTrainerId}
          trainerName={selectedTrainer?.name || selectedTrainer?.email || 'Trainer'}
          onSaved={fetchAvailability}
        />
      )}
    </div>
  )
}
