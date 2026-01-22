import { prisma } from './prisma'
// Re-export pure utility functions for convenience
export { calculateUnlockedSessions, calculateSessionsUnlockedByPayment } from './payments-utils'

/**
 * Payment-related utility functions for split payment feature
 * Server-side only (uses Prisma)
 */

export interface PaymentSummary {
  totalValue: number
  paidAmount: number
  remainingBalance: number
  totalSessions: number
  unlockedSessions: number
  usedSessions: number
  availableSessions: number
  isFullyPaid: boolean
  paymentProgress: number // 0-100
}

/**
 * Get payment summary for a package
 */
export async function getPaymentSummary(packageId: string): Promise<PaymentSummary | null> {
  const pkg = await prisma.package.findUnique({
    where: { id: packageId },
    include: {
      payments: {
        orderBy: { paymentDate: 'asc' }
      },
      _count: {
        select: {
          sessions: {
            where: {
              cancelled: false
            }
          }
        }
      }
    }
  })

  if (!pkg) return null

  const paidAmount = pkg.payments.reduce((sum, p) => sum + p.amount, 0)
  const totalValue = pkg.totalValue
  const totalSessions = pkg.totalSessions
  const usedSessions = pkg._count.sessions
  const unlockedSessions = calculateUnlockedSessions(paidAmount, totalValue, totalSessions)
  const availableSessions = Math.max(0, unlockedSessions - usedSessions)
  const remainingBalance = Math.max(0, totalValue - paidAmount)
  const isFullyPaid = paidAmount >= totalValue
  const paymentProgress = totalValue > 0 ? Math.min(100, (paidAmount / totalValue) * 100) : 100

  return {
    totalValue,
    paidAmount,
    remainingBalance,
    totalSessions,
    unlockedSessions,
    usedSessions,
    availableSessions,
    isFullyPaid,
    paymentProgress
  }
}

/**
 * Check if a session can be logged for a package
 * Returns true if there are available unlocked sessions
 */
export async function canLogSession(packageId: string): Promise<{
  allowed: boolean
  reason?: string
  summary?: PaymentSummary
}> {
  const summary = await getPaymentSummary(packageId)

  if (!summary) {
    return { allowed: false, reason: 'Package not found' }
  }

  if (summary.availableSessions > 0) {
    return { allowed: true, summary }
  }

  if (summary.isFullyPaid) {
    return {
      allowed: false,
      reason: 'All sessions have been used',
      summary
    }
  }

  const sessionsNeededToUnlock = summary.usedSessions + 1 - summary.unlockedSessions
  const paymentNeeded = (sessionsNeededToUnlock / summary.totalSessions) * summary.totalValue

  return {
    allowed: false,
    reason: `Payment required to unlock more sessions. Current: ${summary.unlockedSessions}/${summary.totalSessions} unlocked (${summary.usedSessions} used). Payment of $${summary.remainingBalance.toFixed(2)} needed to unlock remaining sessions.`,
    summary
  }
}
