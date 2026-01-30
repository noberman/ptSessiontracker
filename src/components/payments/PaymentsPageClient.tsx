'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { PaymentFormModal } from './PaymentFormModal'
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react'
import { format } from 'date-fns'

interface FilterOption {
  id: string
  name: string
}

interface Payment {
  id: string
  amount: number
  paymentDate: string
  paymentMethod: string
  notes: string | null
  createdAt: string
  packageId: string
  packageName: string
  clientId: string
  clientName: string
  trainerId: string | null
  trainerName: string | null
  createdById: string | null
  createdByName: string | null
  salesAttributedToId: string | null
  salesAttributedToName: string | null
  salesAttributedTo2Id: string | null
  salesAttributedTo2Name: string | null
}

interface PaymentsPageClientProps {
  locations: FilterOption[]
  trainers: FilterOption[]
  clients: FilterOption[]
  currentUserRole: string
}

function getMonthRange(offset: number = 0) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + offset
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return {
    startDate: format(start, 'yyyy-MM-dd'),
    endDate: format(end, 'yyyy-MM-dd'),
  }
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
}

export function PaymentsPageClient({
  locations,
  trainers,
  clients,
  currentUserRole,
}: PaymentsPageClientProps) {
  // Filter state
  const [period, setPeriod] = useState<'month' | 'lastMonth' | 'custom'>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [locationId, setLocationId] = useState('')
  const [trainerId, setTrainerId] = useState('')
  const [clientId, setClientId] = useState('')
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)

  // Computed filter helpers
  const activeFilterCount = [locationId, trainerId, clientId].filter(Boolean).length
  const clearFilters = () => {
    setPeriod('month')
    setCustomStartDate('')
    setCustomEndDate('')
    setLocationId('')
    setTrainerId('')
    setClientId('')
  }

  // Data state
  const [payments, setPayments] = useState<Payment[]>([])
  const [summary, setSummary] = useState({ totalCount: 0, totalAmount: 0 })
  const [loading, setLoading] = useState(true)

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Compute active date range
  const getDateRange = useCallback(() => {
    if (period === 'month') return getMonthRange(0)
    if (period === 'lastMonth') return getMonthRange(-1)
    return { startDate: customStartDate, endDate: customEndDate }
  }, [period, customStartDate, customEndDate])

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const { startDate, endDate } = getDateRange()
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (locationId) params.set('locationId', locationId)
      if (trainerId) params.set('trainerId', trainerId)
      if (clientId) params.set('clientId', clientId)

      const response = await fetch(`/api/payments?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch payments')

      const data = await response.json()
      setPayments(data.payments)
      setSummary(data.summary)
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }, [getDateRange, locationId, trainerId, clientId])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // Delete handler
  const handleDelete = async () => {
    if (!deletingPayment) return
    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/payments/${deletingPayment.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Failed to delete payment')
        return
      }
      setDeletingPayment(null)
      fetchPayments()
    } catch (error) {
      console.error('Error deleting payment:', error)
      alert('Failed to delete payment')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Period label for display
  const periodLabel =
    period === 'month'
      ? 'This Month'
      : period === 'lastMonth'
        ? 'Last Month'
        : 'Custom Range'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Payments</h1>
          <p className="text-sm text-text-secondary mt-1">
            View and manage payment transactions
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Record Payment
        </Button>
      </div>

      {/* Filter Section - Consistent with Dashboard */}
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-4">
          <Button
            variant={isFiltersOpen ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          >
            {isFiltersOpen ? 'Hide Filters' : 'Show Filters'}
            {activeFilterCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
            >
              Clear All
            </Button>
          )}
        </div>

        {isFiltersOpen && (
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Quick Select */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Quick Select
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as 'month' | 'lastMonth' | 'custom')}
                  className="w-full rounded-lg border border-border px-3 py-2 text-text-primary bg-surface hover:bg-surface-hover focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="month">This Month</option>
                  <option value="lastMonth">Last Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* Custom Date Range */}
              {period === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Start Date
                    </label>
                    <DatePicker
                      value={customStartDate}
                      onChange={(value) => setCustomStartDate(value)}
                      className="text-sm"
                      placeholder="Select start date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      End Date
                    </label>
                    <DatePicker
                      value={customEndDate}
                      onChange={(value) => setCustomEndDate(value)}
                      className="text-sm"
                      placeholder="Select end date"
                    />
                  </div>
                </>
              )}

              {/* Location Filter */}
              {locations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Location
                  </label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-text-primary bg-surface hover:bg-surface-hover focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value="">All Locations</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Trainer Filter */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Trainer
                </label>
                <select
                  value={trainerId}
                  onChange={(e) => setTrainerId(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-text-primary bg-surface hover:bg-surface-hover focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="">All Trainers</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Filter */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Client
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-text-primary bg-surface hover:bg-surface-hover focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="">All Clients</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface rounded-lg border border-border p-4">
          <p className="text-sm text-text-secondary">Total Payments</p>
          <p className="text-2xl font-bold text-text-primary">{summary.totalCount}</p>
        </div>
        <div className="bg-surface rounded-lg border border-border p-4">
          <p className="text-sm text-text-secondary">Total Amount</p>
          <p className="text-2xl font-bold text-text-primary">
            ${summary.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-surface rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-background-secondary">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Trainer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Package
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Method
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Sales Credit
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Recorded By
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-text-secondary">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-text-secondary">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No payments found for {periodLabel.toLowerCase()}</p>
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-surface-hover">
                    <td className="px-4 py-3 text-sm text-text-primary whitespace-nowrap">
                      {format(new Date(payment.paymentDate), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-text-primary whitespace-nowrap">
                      ${payment.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">
                      <a
                        href={`/clients/${payment.clientId}`}
                        className="text-primary-600 hover:underline"
                      >
                        {payment.clientName}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">
                      {payment.trainerName || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">
                      <a
                        href={`/packages/${payment.packageId}`}
                        className="text-primary-600 hover:underline"
                      >
                        {payment.packageName}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">
                      {PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">
                      {payment.salesAttributedToName ? (
                        <span>
                          {payment.salesAttributedToName}
                          {payment.salesAttributedTo2Name && (
                            <span className="text-text-secondary">
                              {' '}& {payment.salesAttributedTo2Name}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {payment.createdByName || '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingPayment(payment)}
                          className="p-1.5 rounded-md hover:bg-background-secondary text-text-secondary hover:text-text-primary transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingPayment(payment)}
                          className="p-1.5 rounded-md hover:bg-error-50 text-text-secondary hover:text-error-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Payment Modal */}
      {showCreateModal && (
        <PaymentFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchPayments}
          clients={clients}
          trainers={trainers}
        />
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <PaymentFormModal
          isOpen={!!editingPayment}
          onClose={() => setEditingPayment(null)}
          onSuccess={fetchPayments}
          clients={clients}
          trainers={trainers}
          payment={editingPayment}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingPayment}
        onClose={() => setDeletingPayment(null)}
        onConfirm={handleDelete}
        title="Delete Payment"
        message={
          deletingPayment
            ? `Are you sure you want to delete the $${deletingPayment.amount.toFixed(2)} payment for ${deletingPayment.clientName}? This may affect session availability.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
      />
    </div>
  )
}
