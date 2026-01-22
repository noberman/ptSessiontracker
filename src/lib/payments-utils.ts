/**
 * Pure utility functions for payment calculations
 * These can be safely used in client components (no Prisma dependency)
 */

/**
 * Calculate the number of unlocked sessions based on payment progress
 * Formula: floor((paidAmount / totalValue) * totalSessions)
 */
export function calculateUnlockedSessions(
  paidAmount: number,
  totalValue: number,
  totalSessions: number
): number {
  if (totalValue <= 0) return totalSessions
  if (paidAmount >= totalValue) return totalSessions

  return Math.floor((paidAmount / totalValue) * totalSessions)
}

/**
 * Calculate how many additional sessions will be unlocked by a payment
 */
export function calculateSessionsUnlockedByPayment(
  currentPaidAmount: number,
  paymentAmount: number,
  totalValue: number,
  totalSessions: number
): number {
  const currentUnlocked = calculateUnlockedSessions(currentPaidAmount, totalValue, totalSessions)
  const newUnlocked = calculateUnlockedSessions(currentPaidAmount + paymentAmount, totalValue, totalSessions)
  return newUnlocked - currentUnlocked
}
