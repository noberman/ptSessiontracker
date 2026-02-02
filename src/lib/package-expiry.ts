import { DurationUnit } from '@prisma/client'

/**
 * Calculate an expiry date by adding a duration to a start date.
 * Handles month arithmetic correctly (e.g. Jan 31 + 1 month = Feb 28).
 */
export function calculateExpiryDate(
  startDate: Date,
  durationValue: number,
  durationUnit: DurationUnit
): Date {
  const result = new Date(startDate)

  switch (durationUnit) {
    case 'DAYS':
      result.setDate(result.getDate() + durationValue)
      break
    case 'WEEKS':
      result.setDate(result.getDate() + durationValue * 7)
      break
    case 'MONTHS': {
      const targetMonth = result.getMonth() + durationValue
      const dayOfMonth = result.getDate()
      // Set to first of target month to avoid overflow
      result.setDate(1)
      result.setMonth(targetMonth)
      // Get last day of the target month
      const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
      // Use the original day or the last day of the month, whichever is smaller
      result.setDate(Math.min(dayOfMonth, lastDay))
      break
    }
  }

  return result
}

/**
 * Format a duration value + unit into a human-readable string.
 * e.g. (3, 'MONTHS') → "3 months", (1, 'WEEKS') → "1 week"
 */
export function formatDuration(value: number, unit: DurationUnit): string {
  const unitLabels: Record<DurationUnit, [string, string]> = {
    DAYS: ['day', 'days'],
    WEEKS: ['week', 'weeks'],
    MONTHS: ['month', 'months'],
  }
  const [singular, plural] = unitLabels[unit]
  return `${value} ${value === 1 ? singular : plural}`
}
