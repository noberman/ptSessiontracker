'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AlertCircle, Check, DollarSign, Plus, X } from 'lucide-react'

interface FilterOption {
  id: string
  name: string
}

interface ClientPackage {
  id: string
  name: string
  totalValue: number
  remainingBalance: number
}

interface Payment {
  id: string
  amount: number
  paymentDate: string
  paymentMethod: string
  notes: string | null
  packageId: string
  packageName: string
  clientId: string
  clientName: string
  salesAttributedToId: string | null
  salesAttributedTo2Id: string | null
}

interface PaymentFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  clients: FilterOption[]
  trainers: FilterOption[]
  payment?: Payment // If provided, we're editing
}

export function PaymentFormModal({
  isOpen,
  onClose,
  onSuccess,
  clients,
  trainers,
  payment,
}: PaymentFormModalProps) {
  const isEdit = !!payment

  // Form state
  const [clientId, setClientId] = useState(payment?.clientId || '')
  const [packageId, setPackageId] = useState(payment?.packageId || '')
  const [amount, setAmount] = useState(payment ? payment.amount.toString() : '')
  const [paymentDate, setPaymentDate] = useState(
    payment
      ? new Date(payment.paymentDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  )
  const [paymentMethod, setPaymentMethod] = useState(payment?.paymentMethod || 'CARD')
  const [notes, setNotes] = useState(payment?.notes || '')
  const [salesAttributedToId, setSalesAttributedToId] = useState(
    payment?.salesAttributedToId || ''
  )
  const [salesAttributedTo2Id, setSalesAttributedTo2Id] = useState(
    payment?.salesAttributedTo2Id || ''
  )
  const [showSecondAttribution, setShowSecondAttribution] = useState(
    !!payment?.salesAttributedTo2Id
  )

  // Data state
  const [clientPackages, setClientPackages] = useState<ClientPackage[]>([])
  const [loadingPackages, setLoadingPackages] = useState(false)

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Fetch client packages when client changes (create mode only)
  useEffect(() => {
    if (!clientId || isEdit) return

    setLoadingPackages(true)
    setPackageId('')

    fetch(`/api/packages?clientId=${clientId}&active=true&limit=100`)
      .then((res) => res.json())
      .then((data) => {
        // Data comes from the packages list endpoint
        const pkgs = (data.packages || []).map((pkg: Record<string, unknown>) => ({
          id: pkg.id as string,
          name: pkg.name as string,
          totalValue: pkg.totalValue as number,
          remainingBalance: (pkg.paymentStatus as Record<string, number>)?.remainingBalance ?? pkg.totalValue,
        }))
        setClientPackages(pkgs)
      })
      .catch(() => setClientPackages([]))
      .finally(() => setLoadingPackages(false))
  }, [clientId, isEdit])

  const selectedPackage = clientPackages.find((p) => p.id === packageId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isEdit && !packageId) {
      setError('Please select a package')
      return
    }

    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    // Validate no duplicate attribution
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
      const url = isEdit ? `/api/payments/${payment.id}` : '/api/payments'
      const method = isEdit ? 'PUT' : 'POST'

      const body: Record<string, unknown> = {
        amount: parsedAmount,
        paymentDate,
        paymentMethod,
        notes: notes || null,
        salesAttributedToId: salesAttributedToId || null,
        salesAttributedTo2Id: showSecondAttribution ? salesAttributedTo2Id || null : null,
      }

      if (!isEdit) {
        body.packageId = packageId
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save payment')
      }

      setSuccess(true)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Payment' : 'Record Payment'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Client & Package Selection (create only) */}
        {!isEdit ? (
          <>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Client
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-text-primary bg-surface text-sm"
                required
              >
                <option value="">Select client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Package
              </label>
              {loadingPackages ? (
                <p className="text-sm text-text-secondary py-2">Loading packages...</p>
              ) : !clientId ? (
                <p className="text-sm text-text-secondary py-2">Select a client first</p>
              ) : clientPackages.length === 0 ? (
                <p className="text-sm text-text-secondary py-2">
                  No active packages for this client
                </p>
              ) : (
                <select
                  value={packageId}
                  onChange={(e) => setPackageId(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-text-primary bg-surface text-sm"
                  required
                >
                  <option value="">Select package...</option>
                  {clientPackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} — Balance: ${pkg.remainingBalance.toFixed(2)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </>
        ) : (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-text-primary">
              {payment.clientName} — {payment.packageName}
            </p>
          </div>
        )}

        {/* Amount */}
        <div>
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
              placeholder="0.00"
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              required
            />
          </div>
          {!isEdit && selectedPackage && (
            <p className="text-xs text-text-secondary mt-1">
              Remaining balance: ${selectedPackage.remainingBalance.toFixed(2)}
            </p>
          )}
        </div>

        {/* Payment Date */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Payment Date
          </label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            required
          />
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Payment Method
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-text-primary bg-surface text-sm"
          >
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Notes (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Second installment"
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>

        {/* Sales Attribution */}
        <div className="border-t border-border pt-4">
          <label className="block text-sm font-medium text-text-primary mb-2">
            Sales Commission Attribution
          </label>
          <p className="text-xs text-text-secondary mb-3">
            Optional. If set, this person receives sales commission credit for this payment.
            Add a second person for a 50/50 split.
          </p>

          <div className="space-y-3">
            <select
              value={salesAttributedToId}
              onChange={(e) => setSalesAttributedToId(e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-text-primary bg-surface text-sm"
            >
              <option value="">No attribution</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {salesAttributedToId && !showSecondAttribution && (
              <button
                type="button"
                onClick={() => setShowSecondAttribution(true)}
                className="flex items-center gap-1 text-sm text-primary hover:text-primary-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add split (50/50)
              </button>
            )}

            {showSecondAttribution && (
              <div className="flex items-center gap-2">
                <select
                  value={salesAttributedTo2Id}
                  onChange={(e) => setSalesAttributedTo2Id(e.target.value)}
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-text-primary bg-surface text-sm"
                >
                  <option value="">No second person</option>
                  {trainers
                    .filter((t) => t.id !== salesAttributedToId)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setShowSecondAttribution(false)
                    setSalesAttributedTo2Id('')
                  }}
                  className="p-2 rounded-md hover:bg-background-secondary text-text-secondary hover:text-text-primary transition-colors"
                  title="Remove split"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {salesAttributedToId && showSecondAttribution && salesAttributedTo2Id && (
              <p className="text-xs text-text-secondary bg-gray-50 rounded-md px-3 py-2">
                Sales commission will be split 50/50 between the two selected people.
              </p>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-error-50 border border-error-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-error-600 mt-0.5" />
              <span className="text-sm text-error-600">{error}</span>
            </div>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="p-3 bg-success-50 border border-success-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-success-600" />
              <span className="text-sm text-success-600">
                Payment {isEdit ? 'updated' : 'recorded'} successfully!
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || success}>
            {loading
              ? isEdit
                ? 'Updating...'
                : 'Recording...'
              : isEdit
                ? 'Update Payment'
                : 'Record Payment'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
