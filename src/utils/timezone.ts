import { toZonedTime, fromZonedTime, format } from 'date-fns-tz'
import { parseISO } from 'date-fns'

// Deployment date when timezone fix goes live - UPDATE THIS WHEN DEPLOYING
// Set to Nov 11, 2025 - all sessions before this are treated as "old" (stored as local time)
export const TIMEZONE_FIX_DEPLOYMENT_DATE = new Date('2025-11-11T00:00:00Z')

/**
 * Display session time correctly based on when session was created
 * Old sessions: already in local time, display as-is
 * New sessions: stored as UTC, convert to org timezone
 * 
 * IMPORTANT: When Prisma returns dates from the database, they are JavaScript Date objects
 * that have already been parsed from the stored UTC time. However, the Date object itself
 * doesn't carry timezone information - it just represents a point in time.
 */
export function displaySessionTime(
  sessionDate: Date | string, 
  createdAt: Date | string,
  orgTimezone: string
): Date {
  console.log('🕐 displaySessionTime input:', {
    sessionDate,
    createdAt,
    orgTimezone,
    TIMEZONE_FIX_DEPLOYMENT_DATE
  })
  
  // Parse dates properly
  const createdAtObj = typeof createdAt === 'string' ? parseISO(createdAt) : createdAt
  const sessionDateObj = typeof sessionDate === 'string' ? parseISO(sessionDate) : sessionDate
  
  console.log('🕐 Parsed dates:', {
    createdAtObj,
    sessionDateObj,
    isOldSession: createdAtObj < TIMEZONE_FIX_DEPLOYMENT_DATE
  })
  
  // Old sessions: stored as local time
  if (createdAtObj < TIMEZONE_FIX_DEPLOYMENT_DATE) {
    console.log('🕐 OLD session - returning as-is')
    // Old sessions were stored as local time but might have Z suffix
    // We need to interpret them as Singapore time, not UTC
    if (typeof sessionDate === 'string' && sessionDate.endsWith('Z')) {
      // Remove Z and treat as local Singapore time
      const cleanDateStr = sessionDate.replace('Z', '')
      // Parse as Singapore time and return
      const result = fromZonedTime(cleanDateStr, orgTimezone)
      const localResult = toZonedTime(result, orgTimezone)
      return localResult
    }
    return sessionDateObj
  }
  
  // New sessions: properly stored as UTC, convert to org timezone
  // Session is stored in UTC, convert to organization timezone for display
  console.log('🕐 NEW session - converting from UTC to', orgTimezone)
  const result = toZonedTime(sessionDateObj, orgTimezone)
  console.log('🕐 Converted result:', result)
  return result
}

/**
 * Convert organization's local time to UTC for storage
 * Used when creating new sessions
 */
export function orgTimeToUtc(localDateInput: Date | string, orgTimezone: string): Date {
  // IMPORTANT: This function expects the input to be in the organization's timezone
  // and converts it to UTC for storage
  
  if (typeof localDateInput === 'string') {
    // Check if the string has timezone information
    if (localDateInput.includes('Z') || localDateInput.match(/[+-]\d{2}:\d{2}$/)) {
      // This shouldn't happen - we expect plain datetime strings
      // But if it does, parse it as ISO and return
      return parseISO(localDateInput)
    } else {
      // Parse the string as a date in the organization's timezone
      // For format like "2025-11-12 13:00" or "2025-11-12T13:00"
      const cleanStr = localDateInput.replace('T', ' ')
      
      // fromZonedTime interprets this string as being in orgTimezone and converts to UTC
      const result = fromZonedTime(cleanStr, orgTimezone)
      return result
    }
  } else {
    // Date object - this is problematic because JS Date already has timezone context
    // If we get a Date object, it might already be in UTC
    // We need to be careful here
    const result = fromZonedTime(localDateInput, orgTimezone)
    return result
  }
}

/**
 * Get month boundaries in UTC for database queries
 * Converts org's local month start/end to UTC timestamps
 */
export function getMonthBoundariesInUtc(
  year: number, 
  month: number, 
  orgTimezone: string
): { start: Date; end: Date } {
  // Create date strings representing start and end of month in org timezone
  // Format: YYYY-MM-DD HH:mm:ss (no timezone suffix means it's in orgTimezone)
  const startStr = `${year}-${String(month).padStart(2, '0')}-01 00:00:00`
  const endStr = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()} 23:59:59.999`
  
  // Convert from org timezone to UTC for database queries
  return {
    start: fromZonedTime(startStr, orgTimezone),
    end: fromZonedTime(endStr, orgTimezone)
  }
}

/**
 * Format a date for display in org's timezone
 * Handles both old and new sessions appropriately
 */
export function formatSessionDateTime(
  sessionDate: Date | string,
  createdAt: Date | string, 
  orgTimezone: string,
  formatString: string = 'PPpp'
): string {
  const displayDate = displaySessionTime(sessionDate, createdAt, orgTimezone)
  return format(displayDate, formatString, { timeZone: orgTimezone })
}

/**
 * Check if a session was created before the timezone fix
 */
export function isLegacySession(createdAt: Date | string): boolean {
  const createdAtObj = new Date(createdAt)
  return createdAtObj < TIMEZONE_FIX_DEPLOYMENT_DATE
}

/**
 * Get the organization's current time
 */
export function getOrgCurrentTime(orgTimezone: string): Date {
  return toZonedTime(new Date(), orgTimezone)
}