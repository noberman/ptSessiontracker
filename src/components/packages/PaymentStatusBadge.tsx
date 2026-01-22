'use client'

import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface PaymentStatusBadgeProps {
  paidAmount: number
  totalValue: number
  unlockedSessions?: number
  totalSessions?: number
  usedSessions?: number
  showProgress?: boolean
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

/**
 * PaymentStatusBadge - Shows payment status for a package
 *
 * Color coding:
 * - Green (success): Fully paid (100%)
 * - Yellow (warning): Partially paid, has available sessions
 * - Red (error): Partially paid, no available sessions (payment needed)
 */
export function PaymentStatusBadge({
  paidAmount,
  totalValue,
  unlockedSessions,
  totalSessions,
  usedSessions,
  showProgress = false,
  className,
  size = 'sm'
}: PaymentStatusBadgeProps) {
  // Calculate payment progress
  const paymentProgress = totalValue > 0
    ? Math.min(100, (paidAmount / totalValue) * 100)
    : 100
  const isFullyPaid = paidAmount >= totalValue

  // Calculate session availability (if provided)
  const hasSessionInfo = unlockedSessions !== undefined && usedSessions !== undefined
  const availableSessions = hasSessionInfo
    ? Math.max(0, unlockedSessions! - usedSessions!)
    : null
  const needsPayment = hasSessionInfo && availableSessions === 0 && !isFullyPaid

  // Determine variant based on payment status
  let variant: 'success' | 'warning' | 'error' = 'success'
  let statusText = 'Paid'

  if (isFullyPaid) {
    variant = 'success'
    statusText = 'Paid'
  } else if (needsPayment) {
    variant = 'error'
    statusText = 'Partial'
  } else {
    variant = 'warning'
    statusText = 'Partial'
  }

  if (showProgress) {
    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <div className="flex items-center justify-between text-sm">
          <Badge variant={variant} size={size}>
            {statusText}
          </Badge>
          <span className="text-gray-500 text-xs">
            ${paidAmount.toLocaleString()} / ${totalValue.toLocaleString()}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              isFullyPaid
                ? 'bg-success-500'
                : needsPayment
                  ? 'bg-error-500'
                  : 'bg-warning-500'
            )}
            style={{ width: `${paymentProgress}%` }}
          />
        </div>
        {hasSessionInfo && !isFullyPaid && (
          <span className="text-xs text-gray-500">
            {availableSessions} of {unlockedSessions} unlocked sessions available
            {needsPayment && ' - payment required'}
          </span>
        )}
      </div>
    )
  }

  return (
    <Badge variant={variant} size={size} className={className}>
      {statusText}
    </Badge>
  )
}
