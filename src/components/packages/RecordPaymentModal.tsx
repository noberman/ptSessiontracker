'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AlertCircle, DollarSign, Check } from 'lucide-react'
import { calculateUnlockedSessions } from '@/lib/payments-utils'

interface PaymentSummary {
  totalValue: number
  paidAmount: number
  remainingBalance: number
  totalSessions: number
  unlockedSessions: number
  usedSessions: number
  availableSessions: number
}

interface RecordPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  packageId: string
  packageName: string
  summary: PaymentSummary
  onSuccess?: () => void
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  packageId,
  packageName,
  summary,
  onSuccess
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount('')
      setPaymentDate(new Date().toISOString().split('T')[0])
      setNotes('')
      setError('')
      setSuccess(false)
    }
  }, [isOpen])

  // Calculate how many sessions will be unlocked by this payment
  const paymentAmount = parseFloat(amount) || 0
  const newPaidAmount = summary.paidAmount + paymentAmount
  const newUnlockedSessions = calculateUnlockedSessions(
    newPaidAmount,
    summary.totalValue,
    summary.totalSessions
  )
  const sessionsToUnlock = newUnlockedSessions - summary.unlockedSessions

  const handlePayFullBalance = () => {
    setAmount(summary.remainingBalance.toFixed(2))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid payment amount')
      return
    }

    if (parseFloat(amount) > summary.remainingBalance + 0.01) {
      setError(`Amount exceeds remaining balance of $${summary.remainingBalance.toFixed(2)}`)
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/packages/${packageId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          paymentDate: paymentDate || new Date().toISOString(),
          notes: notes || null
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record payment')
      }

      setSuccess(true)

      // Close modal after a short delay
      setTimeout(() => {
        if (onSuccess) onSuccess()
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment" size="md">
      <form onSubmit={handleSubmit}>
        {/* Package Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-text-primary">{packageName}</p>
          <p className="text-sm text-text-secondary mt-1">
            Remaining Balance: <span className="font-semibold text-primary">${summary.remainingBalance.toFixed(2)}</span>
          </p>
        </div>

        {/* Payment Amount */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-primary mb-1">
            Payment Amount
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={summary.remainingBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handlePayFullBalance}
              className="whitespace-nowrap"
            >
              Full Balance
            </Button>
          </div>
        </div>

        {/* Payment Date */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-primary mb-1">
            Payment Date
          </label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-primary mb-1">
            Notes (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Second installment"
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Preview */}
        {paymentAmount > 0 && paymentAmount <= summary.remainingBalance && (
          <div className="mb-4 p-3 bg-success-50 border border-success-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-success-600 mt-0.5" />
              <div className="text-sm text-success-700">
                {sessionsToUnlock > 0 ? (
                  <p>This payment will unlock <span className="font-semibold">{sessionsToUnlock} additional session{sessionsToUnlock !== 1 ? 's' : ''}</span>.</p>
                ) : (
                  <p>This payment will not unlock additional sessions yet.</p>
                )}
                {newPaidAmount >= summary.totalValue && (
                  <p className="mt-1 font-medium">Package will be fully paid!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-error-600 mt-0.5" />
              <div className="text-sm text-error-600">{error}</div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-success-50 border border-success-200 rounded-md">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-success-600" />
              <span className="text-sm text-success-600">Payment recorded successfully!</span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || success}>
            {loading ? 'Recording...' : 'Record Payment'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
