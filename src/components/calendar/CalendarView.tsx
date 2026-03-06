'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AvailabilityEditor } from './AvailabilityEditor'
import { AppointmentCreateModal } from './AppointmentCreateModal'
import { AppointmentDetailModal } from './AppointmentDetailModal'
import { ChevronLeft, ChevronRight, Settings2, Plus, ArrowLeft } from 'lucide-react'

interface Trainer {
  id: string
  name: string
  email: string
}

interface DayAvailability {
  isAvailable: boolean
  blocks: { startTime: string; endTime: string }[]
}

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
  client: { id: string; name: string; email: string; status?: string } | null
  location: { id: string; name: string }
  package: { id: string; name: string } | null
  bookedBy: { id: string; name: string; email: string } | null
}

interface Location {
  id: string
  name: string
}

interface CalendarViewProps {
  trainers: Trainer[]
  locations?: Location[]
  currentUserId: string
  isManager: boolean
  canEdit: boolean
  orgTimezone: string
}

interface TrainerColor {
  bg: string
  border: string
  text: string
  dot: string
}

const TRAINER_PALETTE: TrainerColor[] = [
  { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800', dot: 'bg-blue-500' },
  { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800', dot: 'bg-purple-500' },
  { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800', dot: 'bg-orange-500' },
  { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-800', dot: 'bg-pink-500' },
  { bg: 'bg-cyan-100', border: 'border-cyan-400', text: 'text-cyan-800', dot: 'bg-cyan-500' },
  { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-800', dot: 'bg-amber-500' },
  { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-800', dot: 'bg-indigo-500' },
  { bg: 'bg-rose-100', border: 'border-rose-400', text: 'text-rose-800', dot: 'bg-rose-500' },
  { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-800', dot: 'bg-teal-500' },
]

/**
 * Get today's date as YYYY-MM-DD in the org's timezone.
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
 * Get a week of YYYY-MM-DD date strings (Mon-Sun) starting from a base date string.
 */
function getWeekDateStrings(baseDateStr: string): string[] {
  const [y, m, d] = baseDateStr.split('-').map(Number)
  const base = new Date(y, m - 1, d)
  const dayOfWeek = base.getDay()
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

function offsetDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const result = new Date(y, m - 1, d + days)
  return formatDateStr(result)
}

function parseDateStr(dateStr: string): { year: number; month: number; day: number; dayOfWeek: number } {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return { year: y, month: m, day: d, dayOfWeek: date.getDay() }
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  return `${h}:${m}`
}

// Display hours from 6am to 10pm
const START_HOUR = 6
const END_HOUR = 22
const TOTAL_HOURS = END_HOUR - START_HOUR
const HOUR_HEIGHT = 48

const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i)
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const APPOINTMENT_COLORS = {
  SESSION: {
    SCHEDULED: 'bg-blue-100 border-blue-300 text-blue-800',
    COMPLETED: 'bg-green-100 border-green-300 text-green-700',
    NO_SHOW: 'bg-red-100 border-red-300 text-red-700',
    CANCELLED: 'bg-gray-100 border-gray-300 text-gray-500',
  },
  FITNESS_ASSESSMENT: {
    SCHEDULED: 'bg-orange-100 border-orange-300 text-orange-800',
    COMPLETED: 'bg-green-100 border-green-300 text-green-700',
    NO_SHOW: 'bg-red-100 border-red-300 text-red-700',
    CANCELLED: 'bg-gray-100 border-gray-300 text-gray-500',
  },
}

export function CalendarView({
  trainers,
  locations,
  currentUserId,
  isManager,
  canEdit,
  orgTimezone,
}: CalendarViewProps) {
  // --- Manager multi-trainer state ---
  const hasLocations = isManager && locations && locations.length > 0
  const [selectedLocationId, setSelectedLocationId] = useState(locations?.[0]?.id ?? '')
  const [locationTrainers, setLocationTrainers] = useState<Trainer[]>([])
  const [selectedTrainerIds, setSelectedTrainerIds] = useState<Set<string>>(new Set())
  const [trainerColors, setTrainerColors] = useState<Map<string, TrainerColor>>(new Map())
  const [availTrainerPickerOpen, setAvailTrainerPickerOpen] = useState(false)

  // For single-trainer / trainer-role mode
  const [selectedTrainerId, setSelectedTrainerId] = useState(
    !hasLocations ? (trainers[0]?.id ?? currentUserId) : ''
  )

  const [weekOffset, setWeekOffset] = useState(0)
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>({})
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [allLocationAppointments, setAllLocationAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)

  // Appointment modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createDate, setCreateDate] = useState('')
  const [createTime, setCreateTime] = useState('')
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  // --- Manager overview vs detail mode ---
  const [managerViewMode, setManagerViewMode] = useState<'overview' | 'detail'>('overview')
  const [dayOffset, setDayOffset] = useState(0)
  const [detailTrainerId, setDetailTrainerId] = useState<string | null>(null)
  const [allTrainerAvailability, setAllTrainerAvailability] = useState<Record<string, Record<string, DayAvailability>>>({})
  const [createTrainerId, setCreateTrainerId] = useState('')
  const [mobileActiveTrainerId, setMobileActiveTrainerId] = useState<string | null>(null)

  // Trainer mobile day navigation (index into weekDateStrings: 0=Mon..6=Sun)
  const [trainerMobileDayIndex, setTrainerMobileDayIndex] = useState(() => {
    const today = getTodayInOrgTz(orgTimezone)
    const dow = parseDateStr(today).dayOfWeek
    return (dow + 6) % 7
  })

  // Mobile swipe navigation
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      setDayOffset(o => deltaX < 0 ? o + 1 : o - 1)
    }
  }, [])

  // Trainer mobile day navigation functions
  const trainerMobileGoNext = useCallback(() => {
    setTrainerMobileDayIndex(prev => {
      if (prev >= 6) {
        setWeekOffset(o => o + 1)
        return 0
      }
      return prev + 1
    })
  }, [])
  const trainerMobileGoPrev = useCallback(() => {
    setTrainerMobileDayIndex(prev => {
      if (prev <= 0) {
        setWeekOffset(o => o - 1)
        return 6
      }
      return prev - 1
    })
  }, [])
  const handleTrainerTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) trainerMobileGoNext()
      else trainerMobileGoPrev()
    }
  }, [trainerMobileGoNext, trainerMobileGoPrev])

  // Derived: manager view mode
  const isOverviewMode = hasLocations && managerViewMode === 'overview'
  const isMultiTrainerMode = isOverviewMode
  const singleSelectedTrainerId = hasLocations
    ? (managerViewMode === 'detail' ? (detailTrainerId || '') : '')
    : selectedTrainerId

  const todayStr = useMemo(() => getTodayInOrgTz(orgTimezone), [orgTimezone])
  const baseDateStr = useMemo(() => offsetDateStr(todayStr, weekOffset * 7), [todayStr, weekOffset])
  const weekDateStrings = useMemo(() => getWeekDateStrings(baseDateStr), [baseDateStr])
  const startDate = weekDateStrings[0]
  const endDate = weekDateStrings[6]

  // Overview mode derived values
  const overviewDateStr = useMemo(() => offsetDateStr(todayStr, dayOffset), [todayStr, dayOffset])
  const overviewDayLabel = useMemo(() => {
    const [y, m, d] = overviewDateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return `${dayNames[date.getDay()]}, ${MONTH_NAMES[m - 1]} ${d}, ${y}`
  }, [overviewDateStr])

  // Trainer mobile day view: derived values
  const todayMondayIndex = useMemo(() => {
    const dow = parseDateStr(todayStr).dayOfWeek
    return (dow + 6) % 7
  }, [todayStr])
  const trainerMobileDateStr = weekDateStrings[trainerMobileDayIndex] || todayStr
  const trainerMobileDayLabel = useMemo(() => {
    const [y, m, d] = trainerMobileDateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return `${dayNames[date.getDay()]}, ${MONTH_NAMES[m - 1]} ${d}, ${y}`
  }, [trainerMobileDateStr])

  const overviewTrainers = useMemo(
    () => locationTrainers.filter((t) => selectedTrainerIds.has(t.id)),
    [locationTrainers, selectedTrainerIds]
  )

  // Active trainer for single-trainer contexts (modals, availability editor)
  const activeTrainerList = hasLocations ? locationTrainers : trainers
  const selectedTrainer = activeTrainerList.find((t) => t.id === singleSelectedTrainerId)
  const detailTrainer = locationTrainers.find((t) => t.id === detailTrainerId)

  // Fetch trainers when location changes (manager mode)
  useEffect(() => {
    if (!hasLocations || !selectedLocationId) return
    let cancelled = false
    const fetchLocationTrainers = async () => {
      try {
        const res = await fetch(`/api/locations/${selectedLocationId}/trainers`)
        if (res.ok && !cancelled) {
          const data = await res.json()
          const fetched: Trainer[] = (data.trainers || []).map((t: Record<string, string>) => ({
            id: t.id,
            name: t.name,
            email: t.email,
          }))
          setLocationTrainers(fetched)
          // Select all by default
          const allIds = new Set(fetched.map((t) => t.id))
          setSelectedTrainerIds(allIds)
          // Assign colors
          const colors = new Map<string, TrainerColor>()
          fetched.forEach((t, i) => colors.set(t.id, TRAINER_PALETTE[i % TRAINER_PALETTE.length]))
          setTrainerColors(colors)
          // Reset to overview when location changes
          setManagerViewMode('overview')
          setDayOffset(0)
          setDetailTrainerId(null)
          setMobileActiveTrainerId(null)
        }
      } catch (error) {
        console.error('Failed to fetch location trainers:', error)
      }
    }
    fetchLocationTrainers()
    return () => { cancelled = true }
  }, [hasLocations, selectedLocationId])

  const fetchData = useCallback(async () => {
    if (hasLocations) {
      if (managerViewMode === 'overview') {
        // Overview mode: single-day fetch for all trainers at location
        if (!selectedLocationId || locationTrainers.length === 0) return
        setLoading(true)
        try {
          // Fetch week appointments at location (desktop shows week grid)
          const apptRes = await fetch(
            `/api/appointments?locationId=${selectedLocationId}&startDate=${startDate}&endDate=${endDate}`
          )
          if (apptRes.ok) {
            const appts = (await apptRes.json()).filter((a: Appointment) => a.status !== 'CANCELLED')
            setAllLocationAppointments(appts)
            setAppointments(appts)
          }

          // Fetch availability for each trainer at this location
          const availPromises = locationTrainers.map(async (t) => {
            try {
              const res = await fetch(
                `/api/availability/resolve?trainerId=${t.id}&startDate=${overviewDateStr}&endDate=${overviewDateStr}`
              )
              return [t.id, res.ok ? await res.json() : {}] as const
            } catch {
              return [t.id, {}] as const
            }
          })
          const availResults = await Promise.all(availPromises)
          const trainerAvail: Record<string, Record<string, DayAvailability>> = {}
          for (const [tid, data] of availResults) {
            trainerAvail[tid] = data as Record<string, DayAvailability>
          }
          setAllTrainerAvailability(trainerAvail)
        } catch (error) {
          console.error('Failed to fetch calendar data:', error)
        } finally {
          setLoading(false)
        }
      } else {
        // Detail mode: week fetch for single trainer
        const tid = detailTrainerId
        if (!tid || !selectedLocationId) return
        setLoading(true)
        try {
          const [availRes, apptRes] = await Promise.all([
            fetch(`/api/availability/resolve?trainerId=${tid}&startDate=${startDate}&endDate=${endDate}`),
            fetch(`/api/appointments?trainerId=${tid}&startDate=${startDate}&endDate=${endDate}`),
          ])
          if (availRes.ok) setAvailability(await availRes.json())
          else setAvailability({})
          if (apptRes.ok) {
            const appts = (await apptRes.json()).filter((a: Appointment) => a.status !== 'CANCELLED')
            setAppointments(appts)
            setAllLocationAppointments(appts)
          }
        } catch (error) {
          console.error('Failed to fetch calendar data:', error)
        } finally {
          setLoading(false)
        }
      }
    } else {
      // Trainer view (original behavior)
      if (!selectedTrainerId) return
      setLoading(true)
      try {
        const [availRes, apptRes] = await Promise.all([
          fetch(`/api/availability/resolve?trainerId=${selectedTrainerId}&startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/appointments?trainerId=${selectedTrainerId}&startDate=${startDate}&endDate=${endDate}`),
        ])
        if (availRes.ok) setAvailability(await availRes.json())
        if (apptRes.ok) setAppointments((await apptRes.json()).filter((a: Appointment) => a.status !== 'CANCELLED'))
      } catch (error) {
        console.error('Failed to fetch calendar data:', error)
      } finally {
        setLoading(false)
      }
    }
  }, [hasLocations, managerViewMode, selectedLocationId, locationTrainers, overviewDateStr, detailTrainerId, selectedTrainerId, startDate, endDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Client-side filter by selected trainers in overview mode
  const filteredAppointments = useMemo(() => {
    if (isOverviewMode) {
      return allLocationAppointments.filter((a) => selectedTrainerIds.has(a.trainer.id))
    }
    return appointments
  }, [isOverviewMode, allLocationAppointments, selectedTrainerIds, appointments])

  // Group appointments by date (in org timezone)
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    for (const appt of filteredAppointments) {
      const date = new Date(appt.scheduledAt)
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: orgTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(date)
      const dateKey = `${parts.find((p) => p.type === 'year')!.value}-${parts.find((p) => p.type === 'month')!.value}-${parts.find((p) => p.type === 'day')!.value}`
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(appt)
    }
    return map
  }, [filteredAppointments, orgTimezone])

  // Get appointment time in org timezone as minutes since midnight
  const getApptMinutes = useCallback(
    (scheduledAt: string): number => {
      const date = new Date(scheduledAt)
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: orgTimezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(date)
      const h = parseInt(parts.find((p) => p.type === 'hour')!.value)
      const m = parseInt(parts.find((p) => p.type === 'minute')!.value)
      return h * 60 + m
    },
    [orgTimezone]
  )

  // Compute overlap layout for a list of appointments on a given day
  const computeOverlapLayout = useCallback(
    (dayAppts: Appointment[]): Map<string, { left: number; width: number }> => {
      const layout = new Map<string, { left: number; width: number }>()
      if (dayAppts.length === 0) return layout

      // Sort by start time, then by duration (longer first)
      const sorted = [...dayAppts].sort((a, b) => {
        const aStart = getApptMinutes(a.scheduledAt)
        const bStart = getApptMinutes(b.scheduledAt)
        if (aStart !== bStart) return aStart - bStart
        return b.duration - a.duration
      })

      // Group overlapping appointments into columns
      const columns: Appointment[][] = []
      const endTimes: number[] = []

      for (const appt of sorted) {
        const apptStart = getApptMinutes(appt.scheduledAt)
        // Find first column where this appt doesn't overlap
        let placed = false
        for (let col = 0; col < columns.length; col++) {
          if (apptStart >= endTimes[col]) {
            columns[col].push(appt)
            endTimes[col] = apptStart + appt.duration
            placed = true
            break
          }
        }
        if (!placed) {
          columns.push([appt])
          endTimes.push(apptStart + appt.duration)
        }
      }

      const totalCols = columns.length
      columns.forEach((col, colIdx) => {
        for (const appt of col) {
          layout.set(appt.id, {
            left: (colIdx / totalCols) * 100,
            width: (1 / totalCols) * 100,
          })
        }
      })

      return layout
    },
    [getApptMinutes]
  )

  // Click on an empty available slot
  const handleSlotClick = (dateStr: string, minuteOfDay: number, trainerId?: string) => {
    // Snap to 15-min boundary
    const snapped = Math.floor(minuteOfDay / 15) * 15
    setCreateDate(dateStr)
    setCreateTime(minutesToTime(snapped))
    if (trainerId) setCreateTrainerId(trainerId)
    else setCreateTrainerId('')
    setCreateModalOpen(true)
  }

  // Click on an appointment
  const handleAppointmentClick = (appt: Appointment, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedAppointment(appt)
    setDetailModalOpen(true)
  }

  // Transition handlers for overview ↔ detail
  const handleTrainerZoomIn = (trainerId: string) => {
    setManagerViewMode('detail')
    setDetailTrainerId(trainerId)
    setSelectedTrainerIds(new Set([trainerId]))
    setWeekOffset(0)
  }

  const handleBackToOverview = () => {
    setManagerViewMode('overview')
    setDetailTrainerId(null)
    setSelectedTrainerIds(new Set(locationTrainers.map((t) => t.id)))
  }

  // Week label
  const startParsed = parseDateStr(startDate)
  const endParsed = parseDateStr(endDate)
  const weekLabel = `${MONTH_NAMES[startParsed.month - 1]} ${startParsed.day} — ${MONTH_NAMES[endParsed.month - 1]} ${endParsed.day}, ${endParsed.year}`

  // Toggle a single trainer checkbox
  const toggleTrainer = (trainerId: string) => {
    setSelectedTrainerIds((prev) => {
      const next = new Set(prev)
      if (next.has(trainerId)) {
        next.delete(trainerId)
      } else {
        next.add(trainerId)
      }
      return next
    })
  }

  const allTrainersSelected = locationTrainers.length > 0 && selectedTrainerIds.size === locationTrainers.length
  const toggleAllTrainers = () => {
    if (allTrainersSelected) {
      setSelectedTrainerIds(new Set())
    } else {
      setSelectedTrainerIds(new Set(locationTrainers.map((t) => t.id)))
    }
  }

  // Sorted appointments for mobile agenda view
  const overviewDayAppointments = useMemo(() => {
    if (!isOverviewMode) return []
    const dayAppts = appointmentsByDate[overviewDateStr] || []
    return [...dayAppts].sort((a, b) => getApptMinutes(a.scheduledAt) - getApptMinutes(b.scheduledAt))
  }, [isOverviewMode, appointmentsByDate, overviewDateStr, getApptMinutes])

  // Create modal trainer resolution
  const createModalTrainerId = isOverviewMode
    ? (createTrainerId || overviewTrainers[0]?.id || '')
    : singleSelectedTrainerId
  const createModalTrainerName = isOverviewMode
    ? (locationTrainers.find((t) => t.id === (createTrainerId || overviewTrainers[0]?.id))?.name || 'Trainer')
    : (selectedTrainer?.name || selectedTrainer?.email || 'Trainer')

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Back button in detail mode */}
          {hasLocations && managerViewMode === 'detail' && (
            <Button variant="ghost" size="sm" onClick={handleBackToOverview} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              All Trainers
            </Button>
          )}

          {/* Location selector (manager mode) */}
          {hasLocations && locations.length > 0 && (
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary text-sm"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isOverviewMode ? (
            <>
              {/* Mobile: day navigation */}
              <div className="flex items-center gap-2 md:hidden">
                <Button variant="outline" size="sm" onClick={() => setDayOffset((o) => o - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-text-primary min-w-[200px] text-center">
                  {overviewDayLabel}
                </span>
                <Button variant="outline" size="sm" onClick={() => setDayOffset((o) => o + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {dayOffset !== 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setDayOffset(0)} className="text-xs">
                    Today
                  </Button>
                )}
              </div>
              {/* Desktop: week navigation */}
              <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setWeekOffset((o) => o - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-text-primary min-w-[200px] text-center">
                  {weekLabel}
                </span>
                <Button variant="outline" size="sm" onClick={() => setWeekOffset((o) => o + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {weekOffset !== 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} className="text-xs">
                    Today
                  </Button>
                )}
              </div>
            </>
          ) : (
            /* Navigation for detail/trainer mode */
            <>
              {/* Mobile: day navigation */}
              <div className="flex items-center gap-2 md:hidden">
                <Button variant="outline" size="sm" onClick={trainerMobileGoPrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-text-primary min-w-[200px] text-center">
                  {trainerMobileDayLabel}
                </span>
                <Button variant="outline" size="sm" onClick={trainerMobileGoNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {(weekOffset !== 0 || trainerMobileDayIndex !== todayMondayIndex) && (
                  <Button variant="ghost" size="sm" onClick={() => {
                    setWeekOffset(0)
                    setTrainerMobileDayIndex(todayMondayIndex)
                  }} className="text-xs">
                    Today
                  </Button>
                )}
              </div>
              {/* Desktop: week navigation */}
              <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setWeekOffset((o) => o - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium text-text-primary min-w-[200px] text-center">
                  {weekLabel}
                </span>
                <Button variant="outline" size="sm" onClick={() => setWeekOffset((o) => o + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {weekOffset !== 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} className="text-xs">
                    Today
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            isOverviewMode ? (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAvailTrainerPickerOpen((o) => !o)}
                >
                  <Settings2 className="h-4 w-4 mr-1.5" />
                  Set Availability
                </Button>
                {availTrainerPickerOpen && (
                  <div className="absolute left-0 md:right-0 md:left-auto top-full mt-1 bg-white border border-border rounded-md shadow-lg z-30 min-w-[180px]">
                    {locationTrainers.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-background-secondary"
                        onClick={() => {
                          setAvailTrainerPickerOpen(false)
                          setSelectedTrainerId(t.id)
                          setEditorOpen(true)
                        }}
                      >
                        {t.name || t.email}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => {
                if (hasLocations && detailTrainerId) {
                  setSelectedTrainerId(detailTrainerId)
                }
                setEditorOpen(true)
              }}>
                <Settings2 className="h-4 w-4 mr-1.5" />
                Set Availability
              </Button>
            )
          )}
          <Button
            size="sm"
            onClick={() => {
              setCreateDate(isOverviewMode ? overviewDateStr : todayStr)
              setCreateTime('09:00')
              setCreateTrainerId('')
              setCreateModalOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Trainer filter checkboxes (overview mode only, desktop) */}
      {isOverviewMode && locationTrainers.length > 0 && (
        <div className="hidden md:flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={toggleAllTrainers}
            className="text-xs text-primary hover:text-primary/80 font-medium"
          >
            {allTrainersSelected ? 'Deselect all' : 'Select all'}
          </button>
          {locationTrainers.map((t) => {
            const color = trainerColors.get(t.id)
            return (
              <label key={t.id} className="flex items-center gap-1.5 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={selectedTrainerIds.has(t.id)}
                  onChange={() => toggleTrainer(t.id)}
                  className="sr-only"
                />
                <span
                  className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                    selectedTrainerIds.has(t.id)
                      ? `${color?.dot || 'bg-gray-500'} border-transparent`
                      : 'bg-white border-gray-300'
                  }`}
                />
                <span className={selectedTrainerIds.has(t.id) ? 'text-text-primary' : 'text-text-tertiary'}>
                  {t.name || t.email}
                </span>
              </label>
            )
          })}
        </div>
      )}

      {/* Detail mode: show which trainer */}
      {hasLocations && managerViewMode === 'detail' && detailTrainer && (
        <div className="text-sm text-text-secondary">
          Viewing: <span className="font-medium text-text-primary">{detailTrainer.name || detailTrainer.email}</span>
        </div>
      )}

      {/* Calendar Grid */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-text-secondary">Loading...</div>
        ) : isOverviewMode ? (
          /* ===== OVERVIEW MODE: Trainer columns for one day ===== */
          <>
            {/* Mobile: trainer chips + agenda/single-trainer view */}
            <div className="md:hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              {/* Trainer chips bar */}
              <div className="flex gap-2 px-3 py-2 border-b border-border overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setMobileActiveTrainerId(null)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    mobileActiveTrainerId === null
                      ? 'bg-primary text-white'
                      : 'bg-background-secondary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  All
                </button>
                {overviewTrainers.map((t) => {
                  const color = trainerColors.get(t.id)
                  const isActive = mobileActiveTrainerId === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setMobileActiveTrainerId(t.id)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        isActive
                          ? `${color?.bg || 'bg-gray-100'} ${color?.text || 'text-gray-800'}`
                          : 'bg-background-secondary text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${color?.dot || 'bg-gray-400'}`} />
                      {(t.name || t.email).split(' ')[0]}
                    </button>
                  )
                })}
              </div>

              {/* Mobile content */}
              {mobileActiveTrainerId === null ? (
                /* Mobile "All" — time grid with all trainers' appointments */
                (() => {
                  const allDayAppts = appointmentsByDate[overviewDateStr] || []
                  const overlapLayout = computeOverlapLayout(allDayAppts)
                  return (
                    <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
                      <div
                        className="grid grid-cols-[44px_1fr] relative"
                        style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
                      >
                        {/* Compact time gutter */}
                        <div className="border-r border-border relative">
                          {HOURS.map((hour) => (
                            <div
                              key={hour}
                              className="absolute right-0 left-0 flex items-center justify-end pr-1"
                              style={{ top: (hour - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                            >
                              <span className="text-[10px] text-text-tertiary select-none">
                                {hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Single column with all trainers overlapping */}
                        <div
                          className="relative"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            const clickY = e.clientY - rect.top
                            const minuteOfDay = START_HOUR * 60 + (clickY / (TOTAL_HOURS * HOUR_HEIGHT)) * (TOTAL_HOURS * 60)
                            handleSlotClick(overviewDateStr, minuteOfDay)
                          }}
                        >
                          {/* Hour grid lines */}
                          {HOURS.map((hour) => (
                            <div
                              key={hour}
                              className="absolute left-0 right-0 border-t border-border/50"
                              style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                            />
                          ))}

                          {/* Appointments with trainer colors */}
                          {allDayAppts.map((appt) => {
                            const apptStartMin = getApptMinutes(appt.scheduledAt)
                            const apptEndMin = apptStartMin + appt.duration
                            if (apptEndMin <= START_HOUR * 60 || apptStartMin >= END_HOUR * 60) return null
                            const topPx = ((apptStartMin - START_HOUR * 60) / 60) * HOUR_HEIGHT
                            const heightPx = (appt.duration / 60) * HOUR_HEIGHT

                            // Trainer color for scheduled; status color for completed/no-show/cancelled
                            const tColor = trainerColors.get(appt.trainer.id)
                            const colorClass = appt.status === 'SCHEDULED' && tColor
                              ? `${tColor.bg} ${tColor.border} ${tColor.text}`
                              : (APPOINTMENT_COLORS[appt.type]?.[appt.status] || 'bg-gray-100 border-gray-300 text-gray-700')

                            const clientName = appt.client?.name || appt.prospectName || ''
                            const trainerFirstName = appt.trainer.name?.split(' ')[0] || ''

                            const overlap = overlapLayout.get(appt.id)
                            const positionStyle: React.CSSProperties = overlap
                              ? {
                                  top: Math.max(topPx, 0),
                                  height: Math.max(heightPx, 20),
                                  left: `calc(${overlap.left}% + 2px)`,
                                  width: `calc(${overlap.width}% - 4px)`,
                                }
                              : {
                                  top: Math.max(topPx, 0),
                                  height: Math.max(heightPx, 20),
                                }

                            return (
                              <div
                                key={appt.id}
                                className={`absolute border rounded-md px-1.5 py-0.5 overflow-hidden cursor-pointer z-[5] ${colorClass} ${
                                  overlap ? '' : 'left-1 right-1'
                                }`}
                                style={positionStyle}
                                onClick={(e) => handleAppointmentClick(appt, e)}
                              >
                                <div className="text-[11px] font-medium leading-tight truncate">
                                  {trainerFirstName ? `${trainerFirstName} — ${clientName}` : clientName}
                                </div>
                                {heightPx > 28 && (
                                  <div className="text-[10px] opacity-75 leading-tight">
                                    {minutesToTime(apptStartMin)} - {minutesToTime(apptEndMin)}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })()
              ) : (
                /* Mobile single-trainer day view */
                (() => {
                  const trainerAvail = allTrainerAvailability[mobileActiveTrainerId]?.[overviewDateStr]
                  const trainerAppts = (appointmentsByDate[overviewDateStr] || []).filter(
                    (a) => a.trainer.id === mobileActiveTrainerId
                  )
                  return (
                    <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
                      <div
                        className="grid grid-cols-[44px_1fr] relative"
                        style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
                      >
                        {/* Compact time gutter */}
                        <div className="border-r border-border relative">
                          {HOURS.map((hour) => (
                            <div
                              key={hour}
                              className="absolute right-0 left-0 flex items-center justify-end pr-1"
                              style={{ top: (hour - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                            >
                              <span className="text-[10px] text-text-tertiary select-none">
                                {hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Single column */}
                        <div
                          className="relative"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            const clickY = e.clientY - rect.top
                            const minuteOfDay = START_HOUR * 60 + (clickY / (TOTAL_HOURS * HOUR_HEIGHT)) * (TOTAL_HOURS * 60)
                            handleSlotClick(overviewDateStr, minuteOfDay, mobileActiveTrainerId)
                          }}
                        >
                          {/* Hour grid lines */}
                          {HOURS.map((hour) => (
                            <div
                              key={hour}
                              className="absolute left-0 right-0 border-t border-border/50"
                              style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                            />
                          ))}

                          {/* Availability shading */}
                          {trainerAvail?.isAvailable &&
                            trainerAvail.blocks.map((block, bi) => {
                              const sMin = timeToMinutes(block.startTime)
                              const eMin = timeToMinutes(block.endTime)
                              if (eMin <= START_HOUR * 60 || sMin >= END_HOUR * 60) return null
                              const topPx = ((sMin - START_HOUR * 60) / 60) * HOUR_HEIGHT
                              const heightPx = ((eMin - sMin) / 60) * HOUR_HEIGHT
                              return (
                                <div
                                  key={`avail-${bi}`}
                                  className="absolute left-0 right-0 bg-green-50/70 z-[1]"
                                  style={{ top: Math.max(topPx, 0), height: Math.max(heightPx, 4) }}
                                />
                              )
                            })}

                          {/* "Off" label */}
                          {trainerAvail && !trainerAvail.isAvailable && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs text-text-tertiary bg-background-secondary/80 px-2 py-1 rounded">
                                Off
                              </span>
                            </div>
                          )}

                          {/* Appointments */}
                          {trainerAppts.map((appt) => {
                            const apptStartMin = getApptMinutes(appt.scheduledAt)
                            const apptEndMin = apptStartMin + appt.duration
                            if (apptEndMin <= START_HOUR * 60 || apptStartMin >= END_HOUR * 60) return null
                            const topPx = ((apptStartMin - START_HOUR * 60) / 60) * HOUR_HEIGHT
                            const heightPx = (appt.duration / 60) * HOUR_HEIGHT
                            const colorClass = APPOINTMENT_COLORS[appt.type]?.[appt.status] || 'bg-gray-100 border-gray-300 text-gray-700'
                            const clientName = appt.client?.name || appt.prospectName || ''
                            return (
                              <div
                                key={appt.id}
                                className={`absolute left-1 right-1 border rounded-md px-1.5 py-0.5 overflow-hidden cursor-pointer z-[5] ${colorClass}`}
                                style={{ top: Math.max(topPx, 0), height: Math.max(heightPx, 20) }}
                                onClick={(e) => handleAppointmentClick(appt, e)}
                              >
                                <div className="text-[11px] font-medium leading-tight truncate">
                                  {clientName}
                                </div>
                                {heightPx > 28 && (
                                  <div className="text-[10px] opacity-75 leading-tight">
                                    {minutesToTime(apptStartMin)} - {minutesToTime(apptEndMin)}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })()
              )}
            </div>

            {/* Desktop: week grid with trainer-colored appointments */}
            <div className="hidden md:block overflow-y-auto overflow-x-auto" style={{ maxHeight: '70vh' }}>
              {/* Header row (Mon-Sun) */}
              <div className="sticky top-0 z-10 grid grid-cols-[56px_repeat(7,1fr)] border-b border-border">
                <div className="border-r border-border bg-background-primary" />
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
                      <div className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-text-primary'}`}>
                        {parsed.day}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Body */}
              <div>
                <div
                  className="grid grid-cols-[56px_repeat(7,1fr)] relative"
                  style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
                >
                  {/* Time gutter */}
                  <div className="border-r border-border relative">
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="absolute right-0 left-0 flex items-center justify-end pr-2"
                        style={{ top: (hour - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                      >
                        <span className="text-[11px] text-text-tertiary select-none leading-none">
                          {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {weekDateStrings.map((dateStr) => {
                    const dayAppointments = appointmentsByDate[dateStr] || []
                    const overlapLayout = computeOverlapLayout(dayAppointments)

                    return (
                      <div
                        key={dateStr}
                        className="relative border-r border-border last:border-r-0"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect()
                          const clickY = e.clientY - rect.top
                          const minuteOfDay = START_HOUR * 60 + (clickY / (TOTAL_HOURS * HOUR_HEIGHT)) * (TOTAL_HOURS * 60)
                          handleSlotClick(dateStr, minuteOfDay)
                        }}
                      >
                        {/* Hour grid lines */}
                        {HOURS.map((hour) => (
                          <div
                            key={hour}
                            className="absolute left-0 right-0 border-t border-border/50"
                            style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                          />
                        ))}

                        {/* Appointments with trainer colors */}
                        {dayAppointments.map((appt) => {
                          const apptStartMin = getApptMinutes(appt.scheduledAt)
                          const apptEndMin = apptStartMin + appt.duration
                          if (apptEndMin <= START_HOUR * 60 || apptStartMin >= END_HOUR * 60) return null
                          const topPx = ((apptStartMin - START_HOUR * 60) / 60) * HOUR_HEIGHT
                          const heightPx = (appt.duration / 60) * HOUR_HEIGHT

                          // Trainer color for scheduled; status color for completed/no-show/cancelled
                          const tColor = trainerColors.get(appt.trainer.id)
                          const colorClass = appt.status === 'SCHEDULED' && tColor
                            ? `${tColor.bg} ${tColor.border} ${tColor.text}`
                            : (APPOINTMENT_COLORS[appt.type]?.[appt.status] || 'bg-gray-100 border-gray-300 text-gray-700')

                          const clientName = appt.client?.name || appt.prospectName || ''
                          const trainerFirstName = appt.trainer.name?.split(' ')[0] || ''

                          const overlap = overlapLayout.get(appt.id)
                          const positionStyle: React.CSSProperties = overlap
                            ? {
                                top: Math.max(topPx, 0),
                                height: Math.max(heightPx, 20),
                                left: `calc(${overlap.left}% + 2px)`,
                                width: `calc(${overlap.width}% - 4px)`,
                              }
                            : {
                                top: Math.max(topPx, 0),
                                height: Math.max(heightPx, 20),
                              }

                          return (
                            <div
                              key={appt.id}
                              className={`absolute border rounded-md px-1.5 py-0.5 overflow-hidden cursor-pointer z-[5] ${colorClass} ${
                                overlap ? '' : 'left-1 right-1'
                              }`}
                              style={positionStyle}
                              onClick={(e) => handleAppointmentClick(appt, e)}
                            >
                              <div className="text-[11px] font-medium leading-tight truncate">
                                {trainerFirstName ? `${trainerFirstName} — ${clientName}` : clientName}
                              </div>
                              {heightPx > 28 && (
                                <div className="text-[10px] opacity-75 leading-tight">
                                  {minutesToTime(apptStartMin)} - {minutesToTime(apptEndMin)}
                                </div>
                              )}
                              {heightPx > 44 && (
                                <div className="text-[10px] opacity-60 leading-tight truncate">
                                  {appt.type === 'FITNESS_ASSESSMENT' ? 'Assessment' : 'Session'}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ===== DETAIL / TRAINER MODE ===== */
          <>
          {/* Mobile: day view with swipe */}
          <div className="md:hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTrainerTouchEnd}>
            <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
              <div
                className="grid grid-cols-[44px_1fr] relative"
                style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
              >
                {/* Compact time gutter */}
                <div className="border-r border-border relative">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="absolute right-0 left-0 flex items-center justify-end pr-1"
                      style={{ top: (hour - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    >
                      <span className="text-[10px] text-text-tertiary select-none">
                        {hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Single day column */}
                <div
                  className="relative"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const clickY = e.clientY - rect.top
                    const minuteOfDay = START_HOUR * 60 + (clickY / (TOTAL_HOURS * HOUR_HEIGHT)) * (TOTAL_HOURS * 60)
                    handleSlotClick(trainerMobileDateStr, minuteOfDay)
                  }}
                >
                  {/* Hour grid lines */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-t border-border/50"
                      style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Availability shading */}
                  {availability[trainerMobileDateStr]?.isAvailable &&
                    availability[trainerMobileDateStr].blocks.map((block, bi) => {
                      const sMin = timeToMinutes(block.startTime)
                      const eMin = timeToMinutes(block.endTime)
                      if (eMin <= START_HOUR * 60 || sMin >= END_HOUR * 60) return null
                      const topPx = ((sMin - START_HOUR * 60) / 60) * HOUR_HEIGHT
                      const heightPx = ((eMin - sMin) / 60) * HOUR_HEIGHT
                      return (
                        <div
                          key={`avail-${bi}`}
                          className="absolute left-0 right-0 bg-green-50/70 z-[1]"
                          style={{ top: Math.max(topPx, 0), height: Math.max(heightPx, 4) }}
                        />
                      )
                    })}

                  {/* "Not available" indicator */}
                  {availability[trainerMobileDateStr] && !availability[trainerMobileDateStr].isAvailable && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs text-text-tertiary bg-background-secondary/80 px-2 py-1 rounded">
                        Not available
                      </span>
                    </div>
                  )}

                  {/* Appointments */}
                  {(appointmentsByDate[trainerMobileDateStr] || []).map((appt) => {
                    const apptStartMin = getApptMinutes(appt.scheduledAt)
                    const apptEndMin = apptStartMin + appt.duration
                    if (apptEndMin <= START_HOUR * 60 || apptStartMin >= END_HOUR * 60) return null
                    const topPx = ((apptStartMin - START_HOUR * 60) / 60) * HOUR_HEIGHT
                    const heightPx = (appt.duration / 60) * HOUR_HEIGHT
                    const colorClass = APPOINTMENT_COLORS[appt.type]?.[appt.status] || 'bg-gray-100 border-gray-300 text-gray-700'
                    const clientName = appt.client?.name || appt.prospectName || ''
                    return (
                      <div
                        key={appt.id}
                        className={`absolute left-1 right-1 border rounded-md px-1.5 py-0.5 overflow-hidden cursor-pointer z-[5] ${colorClass}`}
                        style={{ top: Math.max(topPx, 0), height: Math.max(heightPx, 20) }}
                        onClick={(e) => handleAppointmentClick(appt, e)}
                      >
                        <div className="text-[11px] font-medium leading-tight truncate">
                          {clientName}
                        </div>
                        {heightPx > 28 && (
                          <div className="text-[10px] opacity-75 leading-tight">
                            {minutesToTime(apptStartMin)} - {minutesToTime(apptEndMin)}
                          </div>
                        )}
                        {heightPx > 44 && (
                          <div className="text-[10px] opacity-60 leading-tight truncate">
                            {appt.type === 'FITNESS_ASSESSMENT' ? 'Assessment' : 'Session'}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop: week grid */}
          <div className="hidden md:block overflow-y-auto overflow-x-auto" style={{ maxHeight: '70vh' }}>
            {/* Header row */}
            <div className="sticky top-0 z-10 grid grid-cols-[56px_repeat(7,1fr)] border-b border-border">
              <div className="border-r border-border bg-background-primary" />
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

            {/* Body */}
            <div>
              <div
                className="grid grid-cols-[56px_repeat(7,1fr)] relative"
                style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
              >
                {/* Time gutter */}
                <div className="border-r border-border relative">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="absolute right-0 left-0 flex items-center justify-end pr-2"
                      style={{
                        top: (hour - START_HOUR) * HOUR_HEIGHT,
                        height: HOUR_HEIGHT,
                      }}
                    >
                      <span className="text-[11px] text-text-tertiary select-none leading-none">
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
                const dayAppointments = appointmentsByDate[dateStr] || []
                const overlapLayout = isMultiTrainerMode ? computeOverlapLayout(dayAppointments) : null
                const showAvailability = !isMultiTrainerMode

                return (
                  <div
                    key={dateStr}
                    className="relative border-r border-border last:border-r-0"
                    onClick={isMultiTrainerMode ? (e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const clickY = e.clientY - rect.top
                      const minuteOfDay = START_HOUR * 60 + (clickY / (TOTAL_HOURS * HOUR_HEIGHT)) * (TOTAL_HOURS * 60)
                      handleSlotClick(dateStr, minuteOfDay)
                    } : undefined}
                  >
                    {/* Hour grid lines */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-t border-border/50"
                        style={{ top: (hour - START_HOUR) * HOUR_HEIGHT }}
                      />
                    ))}

                    {/* Availability blocks (single-trainer mode only) */}
                    {showAvailability && day?.isAvailable &&
                      day.blocks.map((block, bi) => {
                        const startMin = timeToMinutes(block.startTime)
                        const endMin = timeToMinutes(block.endTime)
                        const topPx = ((startMin - START_HOUR * 60) / 60) * HOUR_HEIGHT
                        const heightPx = ((endMin - startMin) / 60) * HOUR_HEIGHT

                        if (endMin <= START_HOUR * 60 || startMin >= END_HOUR * 60) return null

                        return (
                          <div
                            key={`avail-${bi}`}
                            className="absolute left-0 right-0 bg-green-50/70 cursor-pointer z-[1]"
                            style={{
                              top: Math.max(topPx, 0),
                              height: Math.max(heightPx, 4),
                            }}
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect()
                              const clickY = e.clientY - rect.top
                              const clickMinute = startMin + (clickY / heightPx) * (endMin - startMin)
                              handleSlotClick(dateStr, clickMinute)
                            }}
                          />
                        )
                      })}

                    {/* Appointment blocks */}
                    {dayAppointments.map((appt) => {
                      const apptStartMin = getApptMinutes(appt.scheduledAt)
                      const apptEndMin = apptStartMin + appt.duration

                      if (apptEndMin <= START_HOUR * 60 || apptStartMin >= END_HOUR * 60) return null

                      const topPx = ((apptStartMin - START_HOUR * 60) / 60) * HOUR_HEIGHT
                      const heightPx = (appt.duration / 60) * HOUR_HEIGHT

                      // Color: type+status in detail mode (single trainer)
                      const colorClass = APPOINTMENT_COLORS[appt.type]?.[appt.status] || 'bg-gray-100 border-gray-300 text-gray-700'

                      const clientName = appt.client?.name || appt.prospectName || ''

                      // Overlap positioning
                      const overlap = overlapLayout?.get(appt.id)
                      const positionStyle: React.CSSProperties = overlap
                        ? {
                            top: Math.max(topPx, 0),
                            height: Math.max(heightPx, 20),
                            left: `calc(${overlap.left}% + 2px)`,
                            width: `calc(${overlap.width}% - 4px)`,
                          }
                        : {
                            top: Math.max(topPx, 0),
                            height: Math.max(heightPx, 20),
                          }

                      return (
                        <div
                          key={appt.id}
                          className={`absolute border rounded-md px-1.5 py-0.5 overflow-hidden cursor-pointer z-[5] ${colorClass} ${
                            overlap ? '' : 'left-1 right-1'
                          }`}
                          style={positionStyle}
                          onClick={(e) => handleAppointmentClick(appt, e)}
                        >
                          <div className="text-[11px] font-medium leading-tight truncate">
                            {clientName}
                          </div>
                          {heightPx > 28 && (
                            <div className="text-[10px] opacity-75 leading-tight">
                              {minutesToTime(apptStartMin)} - {minutesToTime(apptEndMin)}
                            </div>
                          )}
                          {heightPx > 44 && (
                            <div className="text-[10px] opacity-60 leading-tight truncate">
                              {appt.type === 'FITNESS_ASSESSMENT' ? 'Assessment' : 'Session'}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* "Not available" indicator (single-trainer only) */}
                    {showAvailability && day && !day.isAvailable && (
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
          </div>
          </>
        )}
      </Card>

      {/* Modals */}
      {canEdit && (
        <AvailabilityEditor
          isOpen={editorOpen}
          onClose={() => setEditorOpen(false)}
          trainerId={hasLocations ? selectedTrainerId || singleSelectedTrainerId : singleSelectedTrainerId}
          trainerName={
            hasLocations
              ? (locationTrainers.find((t) => t.id === (selectedTrainerId || singleSelectedTrainerId))?.name || 'Trainer')
              : (selectedTrainer?.name || selectedTrainer?.email || 'Trainer')
          }
          onSaved={fetchData}
        />
      )}

      <AppointmentCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        trainerId={createModalTrainerId}
        trainerName={createModalTrainerName}
        trainers={isOverviewMode ? overviewTrainers : undefined}
        date={createDate}
        time={createTime}
        onCreated={fetchData}
      />

      <AppointmentDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        appointment={selectedAppointment}
        orgTimezone={orgTimezone}
        onUpdated={fetchData}
      />
    </div>
  )
}
