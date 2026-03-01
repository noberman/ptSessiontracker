'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  orgTimezone: string
}

/**
 * Get today's date as YYYY-MM-DD in the org's timezone.
 * Uses Intl.DateTimeFormat to get the correct calendar date regardless of browser tz.
 */
function getTodayInOrgTz(orgTimezone: string): string {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: orgTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const y = parts.find((p) => p.type === 'year')!.value
  const m = parts.find((p) => p.type === 'month')!.value
  const d = parts.find((p) => p.type === 'day')!.value
  return `${y}-${m}-${d}`
}

/**
 * Get a week of YYYY-MM-DD date strings (Mon–Sun) starting from a base date string.
 */
function getWeekDateStrings(baseDateStr: string): string[] {
  const [y, m, d] = baseDateStr.split('-').map(Number)
  const base = new Date(y, m - 1, d)
  const dayOfWeek = base.getDay() // 0=Sun
  // Adjust to Monday (Mon=0 offset)
  const mondayOffset = (dayOfWeek + 6) % 7
  const monday = new Date(y, m - 1, d - mondayOffset)

  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    dates.push(formatDateStr(cur))
  }
  return dates
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Offset a YYYY-MM-DD string by N days */
function offsetDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const result = new Date(y, m - 1, d + days)
  return formatDateStr(result)
}

/** Parse YYYY-MM-DD to get display info */
function parseDateStr(dateStr: string): { year: number; month: number; day: number; dayOfWeek: number } {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return { year: y, month: m, day: d, dayOfWeek: date.getDay() }
}

/** Convert "HH:mm" to minutes since midnight */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// Display hours from 6am to 10pm
const START_HOUR = 6
const END_HOUR = 22
const TOTAL_HOURS = END_HOUR - START_HOUR
const HOUR_HEIGHT = 48 // px per hour row

const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i)

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function CalendarView({ trainers, currentUserId, isManager, canEdit, orgTimezone }: CalendarViewProps) {
  const [selectedTrainerId, setSelectedTrainerId] = useState(
    isManager ? (trainers[0]?.id ?? '') : currentUserId
  )
  const [weekOffset, setWeekOffset] = useState(0)
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>({})
  const [loading, setLoading] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)

  // Calculate today and week dates in the org's timezone
  const todayStr = useMemo(() => getTodayInOrgTz(orgTimezone), [orgTimezone])
  const baseDateStr = useMemo(() => offsetDateStr(todayStr, weekOffset * 7), [todayStr, weekOffset])
  const weekDateStrings = useMemo(() => getWeekDateStrings(baseDateStr), [baseDateStr])
  const startDate = weekDateStrings[0]
  const endDate = weekDateStrings[6]

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

  // Week label
  const startParsed = parseDateStr(startDate)
  const endParsed = parseDateStr(endDate)
  const weekLabel = `${MONTH_NAMES[startParsed.month - 1]} ${startParsed.day} — ${MONTH_NAMES[endParsed.month - 1]} ${endParsed.day}, ${endParsed.year}`

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

      {/* Weekly calendar grid with time axis */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-text-secondary">Loading availability...</div>
        ) : (
          <div className="overflow-x-auto">
            {/* Header row: time gutter + day columns */}
            <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border">
              {/* Empty corner for time gutter */}
              <div className="border-r border-border" />
              {weekDateStrings.map((dateStr, i) => {
                const parsed = parseDateStr(dateStr)
                const isToday = dateStr === todayStr
                return (
                  <div
                    key={dateStr}
                    className={`px-2 py-2 text-center border-r border-border last:border-r-0 ${
                      isToday ? 'bg-primary/10' : 'bg-background-secondary'
                    }`}
                  >
                    <div className="text-xs text-text-secondary">{DAY_NAMES[i]}</div>
                    <div
                      className={`text-sm font-medium ${
                        isToday ? 'text-primary' : 'text-text-primary'
                      }`}
                    >
                      {parsed.day}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Body: time labels + day columns with positioned blocks */}
            <div
              className="grid grid-cols-[56px_repeat(7,1fr)] relative"
              style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
            >
              {/* Time gutter */}
              <div className="border-r border-border relative">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute right-0 left-0 flex items-start justify-end pr-2"
                    style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                  >
                    <span className="text-[11px] text-text-tertiary -mt-[7px] select-none">
                      {hour === 0
                        ? '12 AM'
                        : hour < 12
                        ? `${hour} AM`
                        : hour === 12
                        ? '12 PM'
                        : `${hour - 12} PM`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDateStrings.map((dateStr) => {
                const day = availability[dateStr]

                return (
                  <div
                    key={dateStr}
                    className="relative border-r border-border last:border-r-0"
                  >
                    {/* Hour grid lines */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-t border-border/50"
                        style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                      />
                    ))}

                    {/* Availability blocks */}
                    {day?.isAvailable &&
                      day.blocks.map((block, bi) => {
                        const startMin = timeToMinutes(block.startTime)
                        const endMin = timeToMinutes(block.endTime)
                        const topPx =
                          ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT
                        const heightPx = ((endMin - startMin) / 60) * HOUR_HEIGHT

                        // Skip blocks entirely outside visible range
                        if (endMin <= START_HOUR * 60 || startMin >= END_HOUR * 60) return null

                        return (
                          <div
                            key={bi}
                            className="absolute left-1 right-1 bg-green-100 border border-green-300 rounded-md px-1.5 py-1 overflow-hidden z-10"
                            style={{
                              top: Math.max(topPx, 0),
                              height: Math.max(heightPx, 16),
                            }}
                          >
                            <div className="text-[11px] font-medium text-green-800 leading-tight">
                              {block.startTime} - {block.endTime}
                            </div>
                            {heightPx > 32 && (
                              <div className="text-[10px] text-green-600 mt-0.5">
                                Available
                              </div>
                            )}
                          </div>
                        )
                      })}

                    {/* "Not available" indicator if day is explicitly blocked */}
                    {day && !day.isAvailable && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs text-text-tertiary bg-background-secondary/80 px-2 py-1 rounded">
                          Not available
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
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
