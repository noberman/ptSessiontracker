'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AlertCircle, Check, DollarSign, Plus, X } from 'lucide-react'

interface TrainerOption {
  id: string
  name: string
}

interface Payment {
  id: string
  amount: number
  paymentDate: string
  paymentMethod: string
  notes: string | null
  salesAttributedToId: string | null
  salesAttributedTo2Id: string | null
}

interface EditPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  payment: Payment
  trainers: TrainerOption[]
  onSuccess: () => void
}

export function EditPaymentModal({
  isOpen,
  onClose,
  payment,
  trainers,
  onSuccess,
}: EditPaymentModalProps) {
  const [amount, setAmount] = useState(payment.amount.toString())
  const [paymentDate, setPaymentDate] = useState(
    new Date(payment.paymentDate).toISOString().split('T')[0]
  )
  const [paymentMethod, setPaymentMethod] = useState(payment.paymentMethod || 'CARD')
  const [notes, setNotes] = useState(payment.notes || '')
  const [salesAttributedToId, setSalesAttributedToId] = useState(
    payment.salesAttributedToId || ''
  )
  const [salesAttributedTo2Id, setSalesAttributedTo2Id] = useState(
    payment.salesAttributedTo2Id || ''
  )
  const [showSecondAttribution, setShowSecondAttribution] = useState(
    !!payment.salesAttributedTo2Id
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Reset when payment changes
  useEffect(() => {
    setAmount(payment.amount.toString())
    setPaymentDate(new Date(payment.paymentDate).toISOString().split('T')[0])
    setPaymentMethod(payment.paymentMethod || 'CARD')
    setNotes(payment.notes || '')
    setSalesAttributedToId(payment.salesAttributedToId || '')
    setSalesAttributedTo2Id(payment.salesAttributedTo2Id || '')
    setShowSecondAttribution(!!payment.salesAttributedTo2Id)
    setError('')
    setSuccess(false)
  }, [payment])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (
      salesAttributedToId &&
      salesAttributedTo2Id &&
      salesAttributedToId === salesAttributedTo2Id
    ) {
      setError('Cannot attribute sales commission to the same person twice')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/payments/${payment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsedAmount,
          paymentDate,
          paymentMethod,
          notes: notes || null,
          salesAttributedToId: salesAttributedToId || null,
          salesAttributedTo2Id: showSecondAttribution ? salesAttributedTo2Id || null : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update payment')
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Payment" size="md">
      <form onSubmit={handleSubmit}>
        {/* Amount */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-primary mb-1">
            Amount
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
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
            required
          />
        </div>

        {/* Payment Method */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-text-primary mb-1">
            Payment Method
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-surface text-sm"
          >
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="OTHER">Other</option>
          </select>
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

        {/* Sales Attribution */}
        {trainers.length > 0 && (
          <div className="mb-4 border-t border-border pt-4">
            <label className="block text-sm font-medium text-text-primary mb-1">
              Sales Commission Attribution
            </label>
            <select
              value={salesAttributedToId}
              onChange={(e) => setSalesAttributedToId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-surface text-sm"
            >
              <option value="">No attribution</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {salesAttributedToId && !showSecondAttribution && (
              <button
                type="button"
                onClick={() => setShowSecondAttribution(true)}
                className="mt-2 flex items-center gap-1 text-sm text-primary hover:text-primary-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add split (50/50)
              </button>
            )}

            {showSecondAttribution && (
              <div className="mt-2 flex items-center gap-2">
                <select
                  value={salesAttributedTo2Id}
                  onChange={(e) => setSalesAttributedTo2Id(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-surface text-sm"
                >
                  <option value="">No second person</option>
                  {trainers
                    .filter((t) => t.id !== salesAttributedToId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setShowSecondAttribution(false)
                    setSalesAttributedTo2Id('')
                  }}
                  className="p-2 rounded-md hover:bg-background-secondary text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-error-600 mt-0.5" />
              <span className="text-sm text-error-600">{error}</span>
            </div>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-4 p-3 bg-success-50 border border-success-200 rounded-md">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success-600" />
              <span className="text-sm text-success-600">Payment updated successfully!</span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || success}>
            {loading ? 'Updating...' : 'Update Payment'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
