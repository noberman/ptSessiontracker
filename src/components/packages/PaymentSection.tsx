'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { PaymentStatusBadge } from './PaymentStatusBadge'
import { RecordPaymentModal } from './RecordPaymentModal'
import { EditPaymentModal } from './EditPaymentModal'
import { Trash2, Pencil, DollarSign, AlertCircle } from 'lucide-react'

interface Payment {
  id: string
  amount: number
  paymentDate: string
  paymentMethod: string
  notes: string | null
  createdAt: string
  createdBy: string | null
  salesAttributedToName: string | null
  salesAttributedTo2Name: string | null
  salesAttributedToId: string | null
  salesAttributedTo2Id: string | null
}

interface PaymentSummary {
  totalValue: number
  paidAmount: number
  remainingBalance: number
  totalSessions: number
  unlockedSessions: number
  usedSessions: number
  availableSessions: number
  isFullyPaid: boolean
  paymentProgress: number
}

interface TrainerOption {
  id: string
  name: string
}

interface PaymentSectionProps {
  packageId: string
  packageName: string
  canRecordPayment: boolean
  canDeletePayment: boolean
  canEditPayment: boolean
  trainers?: TrainerOption[]
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
}

export function PaymentSection({
  packageId,
  packageName,
  canRecordPayment,
  canDeletePayment,
  canEditPayment,
  trainers = [],
}: PaymentSectionProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payments, setPayments] = useState<Payment[]>([])
  const [summary, setSummary] = useState<PaymentSummary | null>(null)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const fetchPayments = async () => {
    try {
      const response = await fetch(`/api/packages/${packageId}/payments`)
      if (!response.ok) {
        throw new Error('Failed to fetch payments')
      }
      const data = await response.json()
      setPayments(data.payments || [])
      setSummary(data.summary)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [packageId])

  const handleDeletePayment = (payment: Payment) => {
    setDeleteError('')
    setPaymentToDelete(payment)
  }

  const confirmDeletePayment = async () => {
    if (!paymentToDelete) return

    setDeletingPaymentId(paymentToDelete.id)

    try {
      const response = await fetch(`/api/packages/${packageId}/payments/${paymentToDelete.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete payment')
      }

      // Close modal and refresh data
      setPaymentToDelete(null)
      await fetchPayments()
      router.refresh()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete payment')
    } finally {
      setDeletingPaymentId(null)
    }
  }

  const handlePaymentSuccess = () => {
    fetchPayments()
    router.refresh()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-error-600">
            <AlertCircle className="w-5 h-5" />
            <span>{error || 'Unable to load payment information'}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment Status</CardTitle>
          {canRecordPayment && !summary.isFullyPaid && (
            <Button size="sm" onClick={() => setShowRecordModal(true)}>
              <DollarSign className="w-4 h-4 mr-1" />
              Record Payment
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Payment Summary */}
          <div className="mb-6">
            <PaymentStatusBadge
              paidAmount={summary.paidAmount}
              totalValue={summary.totalValue}
              unlockedSessions={summary.unlockedSessions}
              totalSessions={summary.totalSessions}
              usedSessions={summary.usedSessions}
              showProgress
            />
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-background-secondary rounded-lg">
            <div>
              <dt className="text-sm text-text-secondary">Total Value</dt>
              <dd className="text-lg font-semibold">${summary.totalValue.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-sm text-text-secondary">Amount Paid</dt>
              <dd className="text-lg font-semibold text-success-600">${summary.paidAmount.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-sm text-text-secondary">Remaining Balance</dt>
              <dd className="text-lg font-semibold text-warning-600">
                ${summary.remainingBalance.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-text-secondary">Sessions Unlocked</dt>
              <dd className="text-lg font-semibold">
                {summary.unlockedSessions} / {summary.totalSessions}
              </dd>
            </div>
          </div>

          {/* Payment History */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-3">Payment History</h4>
            {payments.length > 0 ? (
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">${payment.amount.toFixed(2)}</span>
                        <span className="text-sm text-text-secondary">
                          {new Date(payment.paymentDate).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-text-tertiary px-1.5 py-0.5 bg-gray-100 rounded">
                          {PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod}
                        </span>
                      </div>
                      {payment.notes && (
                        <p className="text-sm text-text-secondary mt-1">{payment.notes}</p>
                      )}
                      {payment.salesAttributedToName && (
                        <p className="text-xs text-text-tertiary mt-1">
                          Sales credit: {payment.salesAttributedToName}
                          {payment.salesAttributedTo2Name && ` & ${payment.salesAttributedTo2Name} (50/50)`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {canEditPayment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-text-secondary hover:text-text-primary"
                          onClick={() => setEditingPayment(payment)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {canDeletePayment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error-600 hover:text-error-700 hover:bg-error-50"
                          onClick={() => handleDeletePayment(payment)}
                          disabled={deletingPaymentId === payment.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary text-center py-4">
                No payments recorded yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        packageId={packageId}
        packageName={packageName}
        summary={summary}
        trainers={trainers}
        onSuccess={handlePaymentSuccess}
      />

      {/* Edit Payment Modal */}
      {editingPayment && (
        <EditPaymentModal
          isOpen={!!editingPayment}
          onClose={() => setEditingPayment(null)}
          payment={editingPayment}
          trainers={trainers}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Delete Payment Confirmation Modal */}
      <ConfirmModal
        isOpen={!!paymentToDelete}
        onClose={() => {
          setPaymentToDelete(null)
          setDeleteError('')
        }}
        onConfirm={confirmDeletePayment}
        title="Delete Payment"
        message={
          deleteError
            ? deleteError
            : paymentToDelete
              ? `Are you sure you want to delete the payment of $${paymentToDelete.amount.toFixed(2)} from ${new Date(paymentToDelete.paymentDate).toLocaleDateString()}? This will affect unlocked sessions.`
              : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={!!deletingPaymentId}
      />
    </>
  )
}
