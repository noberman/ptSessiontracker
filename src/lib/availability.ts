import { TrainerAvailability } from '@prisma/client'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { toZonedTime } from 'date-fns-tz'

interface AvailabilityBlock {
  startTime: string
  endTime: string
}

interface DayAvailability {
  isAvailable: boolean
  blocks: AvailabilityBlock[]
}

/**
 * Resolves trainer availability for a date range by applying override logic:
 * 1. Specific-date entries take precedence over recurring entries
 * 2. If a specific-date entry has isAvailable=false, the day is blocked
 * 3. If no specific-date entries exist, fall back to recurring dayOfWeek entries
 * 4. If no entries at all for a day, the trainer is not available
 *
 * All dates are interpreted in the organization's timezone.
 * startDate/endDate are plain YYYY-MM-DD strings representing calendar dates in org tz.
 * specificDate values stored in DB are UTC — they are converted to org tz for matching.
 */
export function resolveAvailability(
  entries: TrainerAvailability[],
  startDateStr: string,
  endDateStr: string,
  orgTimezone: string
): Map<string, DayAvailability> {
  const result = new Map<string, DayAvailability>()

  // Separate entries into recurring and overrides
  const recurring = entries.filter((e) => e.dayOfWeek !== null && e.specificDate === null)
  const overrides = entries.filter((e) => e.specificDate !== null)

  // Build a map of overrides by date string (YYYY-MM-DD in org timezone)
  // specificDate is stored as UTC midnight-in-org-tz, so convert back to org tz to get the calendar date
  const overridesByDate = new Map<string, TrainerAvailability[]>()
  for (const override of overrides) {
    const orgDate = toZonedTime(override.specificDate!, orgTimezone)
    const dateKey = formatDateKey(orgDate)
    if (!overridesByDate.has(dateKey)) {
      overridesByDate.set(dateKey, [])
    }
    overridesByDate.get(dateKey)!.push(override)
  }

  // Build a map of recurring entries by dayOfWeek
  const recurringByDay = new Map<number, TrainerAvailability[]>()
  for (const entry of recurring) {
    const dow = entry.dayOfWeek!
    if (!recurringByDay.has(dow)) {
      recurringByDay.set(dow, [])
    }
    recurringByDay.get(dow)!.push(entry)
  }

  // Iterate through each calendar day in the range (pure date strings, no Date objects)
  let currentStr = startDateStr
  while (currentStr <= endDateStr) {
    const dateKey = currentStr
    // Parse YYYY-MM-DD to get day-of-week (these are calendar dates, not timestamps)
    const [y, m, d] = currentStr.split('-').map(Number)
    const calendarDate = new Date(y, m - 1, d) // local JS date just for getDay()
    const dayOfWeek = calendarDate.getDay() // 0=Sunday

    // Check for specific-date overrides first
    const dateOverrides = overridesByDate.get(dateKey)
    if (dateOverrides && dateOverrides.length > 0) {
      const hasUnavailable = dateOverrides.some((o) => !o.isAvailable)
      if (hasUnavailable) {
        result.set(dateKey, { isAvailable: false, blocks: [] })
      } else {
        const blocks = dateOverrides
          .filter((o) => o.isAvailable)
          .map((o) => ({ startTime: o.startTime, endTime: o.endTime }))
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
        result.set(dateKey, { isAvailable: true, blocks })
      }
    } else {
      // Fall back to recurring entries for this day of week
      const dayEntries = recurringByDay.get(dayOfWeek)
      if (dayEntries && dayEntries.length > 0) {
        const blocks = dayEntries
          .filter((e) => e.isAvailable)
          .map((e) => ({ startTime: e.startTime, endTime: e.endTime }))
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
        result.set(dateKey, {
          isAvailable: blocks.length > 0,
          blocks,
        })
      } else {
        result.set(dateKey, { isAvailable: false, blocks: [] })
      }
    }

    // Advance to next day using string arithmetic (avoids timezone issues)
    currentStr = nextDateStr(currentStr)
  }

  return result
}

/** Format a Date as YYYY-MM-DD (uses local date methods — caller must ensure date is in correct tz) */
function formatDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Advance a YYYY-MM-DD string by one day */
function nextDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(y, m - 1, d + 1)
  return formatDateKey(next)
}

/**
 * Permission check for availability CRUD operations.
 * Returns a NextResponse error if denied, or null if allowed.
 */
export async function checkAvailabilityPermission(
  session: { user: { id: string; role: string; organizationId: string } },
  trainerId: string
): Promise<NextResponse | null> {
  const role = session.user.role

  // Admin, PT_MANAGER, CLUB_MANAGER can always edit
  if (['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(role)) {
    return null
  }

  // Trainers: check org setting and must be editing own availability
  if (role === 'TRAINER') {
    if (trainerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Trainers can only edit their own availability' },
        { status: 403 }
      )
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { availabilityEditableBy: true },
    })

    if (org?.availabilityEditableBy !== 'MANAGER_AND_TRAINER') {
      return NextResponse.json(
        { error: 'Trainers are not allowed to edit availability for this organization' },
        { status: 403 }
      )
    }

    return null
  }

  return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
}

/**
 * Validate that startTime and endTime are HH:mm in 15-min increments and startTime < endTime.
 * Returns a NextResponse error if invalid, or null if valid.
 */
export function validateTimes(startTime: string, endTime: string): NextResponse | null {
  const timeRegex = /^([01]\d|2[0-3]):(00|15|30|45)$/
  if (!timeRegex.test(startTime)) {
    return NextResponse.json(
      { error: 'startTime must be HH:mm format in 15-min increments (e.g., 09:00, 09:15)' },
      { status: 400 }
    )
  }
  if (!timeRegex.test(endTime)) {
    return NextResponse.json(
      { error: 'endTime must be HH:mm format in 15-min increments (e.g., 17:00, 17:15)' },
      { status: 400 }
    )
  }
  if (startTime >= endTime) {
    return NextResponse.json(
      { error: 'startTime must be before endTime' },
      { status: 400 }
    )
  }
  return null
}
