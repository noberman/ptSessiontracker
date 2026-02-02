'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DatePicker } from '@/components/ui/DatePicker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

interface PackageType {
  id: string
  name: string
  defaultSessions?: number | null
  defaultPrice?: number | null
  isActive: boolean
  sortOrder: number
  startTrigger?: string
  expiryDurationValue?: number | null
  expiryDurationUnit?: string | null
}

interface PackageFormProps {
  packageData?: {
    id: string
    packageType: string
    packageTypeId?: string | null
    name: string
    totalValue: number
    totalSessions: number
    remainingSessions: number
    startDate?: string | Date | null
    expiresAt?: string | Date | null
    active: boolean
    clientId: string
  }
  clients?: Array<{
    id: string
    name: string
    email: string
  }>
  preselectedClientId?: string
  currentUserRole: string
}

export function PackageForm({ 
  packageData, 
  clients = [],
  preselectedClientId,
  currentUserRole 
}: PackageFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([])
  const [loadingPackageTypes, setLoadingPackageTypes] = useState(true)
  
  const isEdit = !!packageData
  const isAdmin = currentUserRole === 'ADMIN'
  // Non-admins can only edit certain fields in edit mode
  const canEditFinancials = !isEdit || isAdmin

  const [formData, setFormData] = useState<{
    clientId: string
    packageTypeId: string
    name: string
    totalValue: number | string
    totalSessions: number | string
    remainingSessions: number | string
    startDate: string
    expiresAt: string
    active: boolean
    // Initial payment fields
    initialPaymentAmount: number | string
    initialPaymentDate: string
    initialPaymentFullAmount: boolean
  }>({
    clientId: packageData?.clientId || preselectedClientId || '',
    packageTypeId: packageData?.packageTypeId || '',
    name: packageData?.name || '',
    totalValue: packageData?.totalValue || 0,
    totalSessions: packageData?.totalSessions || 0,
    remainingSessions: packageData?.remainingSessions || 0,
    startDate: packageData?.startDate
      ? new Date(packageData.startDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    expiresAt: packageData?.expiresAt
      ? new Date(packageData.expiresAt).toISOString().split('T')[0]
      : '',
    active: packageData?.active !== false,
    // Initial payment defaults
    initialPaymentAmount: 0,
    initialPaymentDate: new Date().toISOString().split('T')[0],
    initialPaymentFullAmount: true, // Default to full payment
  })

  const [sessionValue, setSessionValue] = useState(0)

  // Handle "Full amount" checkbox for initial payment
  useEffect(() => {
    if (!isEdit && formData.initialPaymentFullAmount) {
      const totalValue = typeof formData.totalValue === 'string'
        ? parseFloat(formData.totalValue) || 0
        : formData.totalValue
      setFormData(prev => ({
        ...prev,
        initialPaymentAmount: totalValue
      }))
    }
  }, [formData.totalValue, formData.initialPaymentFullAmount, isEdit])

  // Convert clients to searchable options
  const clientOptions = useMemo(() => {
    return clients.map(client => ({
      value: client.id,
      label: client.name,
      subLabel: client.email
    }))
  }, [clients])

  // Fetch package types
  useEffect(() => {
    const fetchPackageTypes = async () => {
      try {
        const response = await fetch('/api/package-types')
        if (response.ok) {
          const data = await response.json()
          setPackageTypes(data)
        }
      } catch (error) {
        console.error('Failed to fetch package types:', error)
      } finally {
        setLoadingPackageTypes(false)
      }
    }
    fetchPackageTypes()
  }, [])

  // Calculate session value when total value or sessions change
  useEffect(() => {
    const totalValue = typeof formData.totalValue === 'string' ? parseFloat(formData.totalValue) || 0 : formData.totalValue
    const totalSessions = typeof formData.totalSessions === 'string' ? parseInt(formData.totalSessions) || 0 : formData.totalSessions
    
    if (totalSessions > 0) {
      setSessionValue(totalValue / totalSessions)
    } else {
      setSessionValue(0)
    }
  }, [formData.totalValue, formData.totalSessions])

  // Get selected package type's config
  const selectedPackageType = useMemo(() => {
    if (!formData.packageTypeId || formData.packageTypeId === 'custom') return null
    return packageTypes.find(t => t.id === formData.packageTypeId) || null
  }, [formData.packageTypeId, packageTypes])

  const hasDurationConfig = selectedPackageType?.expiryDurationValue && selectedPackageType?.expiryDurationUnit
  const isFirstSessionTrigger = selectedPackageType?.startTrigger === 'FIRST_SESSION'

  // Calculate expiry date from start date + duration (client-side preview)
  const calculateExpiryFromDuration = (startDate: string, durationValue: number, durationUnit: string): string => {
    const date = new Date(startDate)
    switch (durationUnit) {
      case 'DAYS':
        date.setDate(date.getDate() + durationValue)
        break
      case 'WEEKS':
        date.setDate(date.getDate() + durationValue * 7)
        break
      case 'MONTHS': {
        const dayOfMonth = date.getDate()
        date.setDate(1)
        date.setMonth(date.getMonth() + durationValue)
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
        date.setDate(Math.min(dayOfMonth, lastDay))
        break
      }
    }
    return date.toISOString().split('T')[0]
  }

  // Format duration for display
  const formatDuration = (value: number, unit: string): string => {
    const labels: Record<string, [string, string]> = {
      DAYS: ['day', 'days'],
      WEEKS: ['week', 'weeks'],
      MONTHS: ['month', 'months'],
    }
    const [singular, plural] = labels[unit] || [unit.toLowerCase(), unit.toLowerCase()]
    return `${value} ${value === 1 ? singular : plural}`
  }

  // Handle package type selection
  const handlePackageTypeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const typeId = e.target.value

    if (!typeId || typeId === 'custom') {
      setFormData({
        ...formData,
        packageTypeId: '',
        name: '',
        totalValue: 0,
        totalSessions: 0,
        remainingSessions: isEdit ? formData.remainingSessions : 0,
        expiresAt: '',
      })
      return
    }

    const packageType = packageTypes.find(t => t.id === typeId)
    if (packageType) {
      const defaultName = packageType.name || ''
      const defaultSessions = packageType.defaultSessions || 0
      const defaultPrice = packageType.defaultPrice || 0

      // Auto-calculate expiry for date_of_purchase with duration
      let expiresAt = ''
      if (packageType.startTrigger !== 'FIRST_SESSION' && packageType.expiryDurationValue && packageType.expiryDurationUnit) {
        expiresAt = calculateExpiryFromDuration(
          formData.startDate,
          packageType.expiryDurationValue,
          packageType.expiryDurationUnit
        )
      }

      setFormData({
        ...formData,
        packageTypeId: typeId,
        name: defaultName,
        totalValue: defaultPrice,
        totalSessions: defaultSessions,
        remainingSessions: isEdit ? formData.remainingSessions : defaultSessions,
        expiresAt,
      })
    }
  }

  // Recalculate expiry when start date changes (for date_of_purchase + duration)
  useEffect(() => {
    if (!isEdit && selectedPackageType && !isFirstSessionTrigger && hasDurationConfig && formData.startDate) {
      const newExpiry = calculateExpiryFromDuration(
        formData.startDate,
        selectedPackageType.expiryDurationValue!,
        selectedPackageType.expiryDurationUnit!
      )
      setFormData(prev => ({ ...prev, expiresAt: newExpiry }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.startDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate required fields
    if (!formData.clientId) {
      setError('Please select a client')
      setLoading(false)
      return
    }

    if (!formData.name) {
      setError('Please enter a package name')
      setLoading(false)
      return
    }

    const totalValue = typeof formData.totalValue === 'string' ? parseFloat(formData.totalValue) || 0 : formData.totalValue
    const totalSessions = typeof formData.totalSessions === 'string' ? parseInt(formData.totalSessions) || 0 : formData.totalSessions
    
    if (totalValue < 0) {
      setError('Total value cannot be negative')
      setLoading(false)
      return
    }

    if (totalSessions <= 0) {
      setError('Total sessions must be greater than 0')
      setLoading(false)
      return
    }

    // Validate dates
    if (formData.expiresAt && formData.startDate) {
      if (new Date(formData.expiresAt) <= new Date(formData.startDate)) {
        setError('Expiration date must be after start date')
        setLoading(false)
        return
      }
    }

    try {
      const url = isEdit ? `/api/packages/${packageData.id}` : '/api/packages'
      const method = isEdit ? 'PUT' : 'POST'

      let body: any = {}

      if (isEdit) {
        // For edit mode, only send fields the user is allowed to change
        body = {
          startDate: formData.startDate,
          expiresAt: formData.expiresAt || null,
          active: formData.active,
          remainingSessions: typeof formData.remainingSessions === 'string'
            ? parseInt(formData.remainingSessions) || 0
            : formData.remainingSessions,
        }

        // Only admins can send financial fields
        if (isAdmin) {
          body.name = formData.name
          body.totalValue = totalValue
          body.totalSessions = totalSessions
          body.packageTypeId = formData.packageTypeId || null
        }
      } else {
        // For create mode, send all fields including initial payment
        const initialPaymentAmount = typeof formData.initialPaymentAmount === 'string'
          ? parseFloat(formData.initialPaymentAmount) || 0
          : formData.initialPaymentAmount

        body = {
          clientId: formData.clientId,
          packageTypeId: formData.packageTypeId || null,
          name: formData.name,
          totalValue: totalValue,
          totalSessions: totalSessions,
          startDate: formData.startDate,
          expiresAt: formData.expiresAt || null,
          // Include initial payment if amount > 0
          ...(initialPaymentAmount > 0 && {
            initialPayment: {
              amount: initialPaymentAmount,
              paymentDate: formData.initialPaymentDate || formData.startDate
            }
          })
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save package')
      }

      // Redirect based on context
      if (preselectedClientId) {
        router.push(`/clients/${preselectedClientId}`)
      } else {
        router.push('/packages')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save package')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Package' : 'Create New Package'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error-50 border border-error-200 p-4">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          )}

          {!isEdit && !preselectedClientId && (
            <div>
              <label htmlFor="client" className="block text-sm font-medium text-text-primary mb-1">
                Client *
              </label>
              <SearchableSelect
                id="client"
                options={clientOptions}
                value={formData.clientId}
                onChange={(value) => setFormData({ ...formData, clientId: value })}
                placeholder="Select a client"
                searchPlaceholder="Type client name or email..."
                required
              />
            </div>
          )}

          {!isEdit && (
            <div>
              <label htmlFor="packageType" className="block text-sm font-medium text-text-primary mb-1">
                Package Type
              </label>
              <select
                id="packageType"
                value={formData.packageTypeId}
                onChange={handlePackageTypeSelect}
                className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                disabled={loadingPackageTypes}
              >
                <option value="">Select a package type</option>
                <option value="custom">Custom Package</option>
                {packageTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                    {type.defaultSessions && type.defaultPrice && (
                      <> ({type.defaultSessions} sessions - ${type.defaultPrice})</>
                    )}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">
              Package Name *
            </label>
            <Input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={!formData.packageTypeId || formData.packageTypeId === 'custom' ? "Enter package name" : "Name set by package type"}
              disabled={!canEditFinancials}
              className={!canEditFinancials ? 'bg-gray-100 cursor-not-allowed' : ''}
            />
            {isEdit && !canEditFinancials && (
              <p className="text-xs text-text-secondary mt-1">
                Contact an admin to modify package name
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="totalValue" className="block text-sm font-medium text-text-primary mb-1">
                Total Value ($) *
              </label>
              <Input
                id="totalValue"
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.totalValue}
                onChange={(e) => setFormData({ ...formData, totalValue: e.target.value })}
                placeholder="0.00"
                disabled={!canEditFinancials}
                className={!canEditFinancials ? 'bg-gray-100 cursor-not-allowed' : ''}
              />
            </div>

            <div>
              <label htmlFor="totalSessions" className="block text-sm font-medium text-text-primary mb-1">
                Total Sessions *
              </label>
              <Input
                id="totalSessions"
                type="number"
                required
                min="1"
                value={formData.totalSessions}
                onChange={(e) => setFormData({ ...formData, totalSessions: e.target.value })}
                placeholder="0"
                disabled={!canEditFinancials}
                className={!canEditFinancials ? 'bg-gray-100 cursor-not-allowed' : ''}
              />
            </div>
          </div>
          {isEdit && !canEditFinancials && (
            <p className="text-xs text-text-secondary">
              Contact an admin to modify package value or session count
            </p>
          )}

          <div className="bg-background-secondary rounded-lg p-3">
            <p className="text-sm text-text-secondary">
              Session Value: <span className="font-semibold text-text-primary">
                ${sessionValue.toFixed(2)} per session
              </span>
              {isEdit && (
                <span className="block text-xs mt-1">
                  Set at package creation. Used for commission calculations.
                </span>
              )}
            </p>
          </div>

          {/* Initial Payment Section (only for new packages) */}
          {!isEdit && (
            <div className="border border-border rounded-lg p-4 mt-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Initial Payment</h3>

              <div className="flex items-center mb-3">
                <input
                  id="initialPaymentFullAmount"
                  type="checkbox"
                  checked={formData.initialPaymentFullAmount}
                  onChange={(e) => {
                    const isFullAmount = e.target.checked
                    const totalValue = typeof formData.totalValue === 'string'
                      ? parseFloat(formData.totalValue) || 0
                      : formData.totalValue
                    setFormData({
                      ...formData,
                      initialPaymentFullAmount: isFullAmount,
                      initialPaymentAmount: isFullAmount ? totalValue : formData.initialPaymentAmount
                    })
                  }}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="initialPaymentFullAmount" className="ml-2 block text-sm text-text-primary">
                  Full amount ({typeof formData.totalValue === 'string'
                    ? `$${parseFloat(formData.totalValue) || 0}`
                    : `$${formData.totalValue}`})
                </label>
              </div>

              {!formData.initialPaymentFullAmount && (
                <div className="mb-3">
                  <label htmlFor="initialPaymentAmount" className="block text-sm font-medium text-text-primary mb-1">
                    Payment Amount ($)
                  </label>
                  <Input
                    id="initialPaymentAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    max={typeof formData.totalValue === 'string'
                      ? parseFloat(formData.totalValue) || 0
                      : formData.totalValue}
                    value={formData.initialPaymentAmount}
                    onChange={(e) => setFormData({ ...formData, initialPaymentAmount: e.target.value })}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    Enter the initial payment amount. Sessions will be unlocked proportionally.
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="initialPaymentDate" className="block text-sm font-medium text-text-primary mb-1">
                  Payment Date
                </label>
                <DatePicker
                  value={formData.initialPaymentDate}
                  onChange={(value) => setFormData({ ...formData, initialPaymentDate: value })}
                  placeholder="Select payment date"
                />
              </div>

              {/* Preview sessions unlocked */}
              {(() => {
                const totalValue = typeof formData.totalValue === 'string'
                  ? parseFloat(formData.totalValue) || 0
                  : formData.totalValue
                const totalSessions = typeof formData.totalSessions === 'string'
                  ? parseInt(formData.totalSessions) || 0
                  : formData.totalSessions
                const paymentAmount = typeof formData.initialPaymentAmount === 'string'
                  ? parseFloat(formData.initialPaymentAmount) || 0
                  : formData.initialPaymentAmount

                if (totalValue > 0 && totalSessions > 0 && paymentAmount > 0) {
                  const unlockedSessions = totalValue > 0
                    ? Math.floor((paymentAmount / totalValue) * totalSessions)
                    : totalSessions

                  return (
                    <div className="mt-3 p-2 bg-primary-50 rounded text-sm text-primary-700">
                      <strong>{unlockedSessions}</strong> of {totalSessions} sessions will be unlocked
                      {paymentAmount < totalValue && (
                        <span className="block text-xs mt-1">
                          Additional payments will unlock more sessions
                        </span>
                      )}
                    </div>
                  )
                }
                return null
              })()}
            </div>
          )}

          {isEdit && (
            <div>
              <label htmlFor="remainingSessions" className="block text-sm font-medium text-text-primary mb-1">
                Remaining Sessions
              </label>
              <Input
                id="remainingSessions"
                type="number"
                min="0"
                value={formData.remainingSessions}
                onChange={(e) => setFormData({ ...formData, remainingSessions: e.target.value })}
              />
              <p className="text-xs text-text-secondary mt-1">
                Manually adjust remaining sessions
              </p>
            </div>
          )}

          {/* Date fields — behavior depends on package type config */}
          {!isEdit && isFirstSessionTrigger ? (
            // FIRST_SESSION trigger during creation: no date fields, show info
            <div className="bg-background-secondary rounded-lg p-3">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-text-primary">Start &amp; Expiry:</span>{' '}
                This package starts when the first session is logged.
                {hasDurationConfig && (
                  <> It will expire{' '}
                    <span className="font-semibold">
                      {formatDuration(selectedPackageType!.expiryDurationValue!, selectedPackageType!.expiryDurationUnit!)}
                    </span>{' '}
                    after the first session.
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-text-primary mb-1">
                  Start Date
                </label>
                <DatePicker
                  value={formData.startDate}
                  onChange={(value) => setFormData({ ...formData, startDate: value })}
                  placeholder="Select start date"
                  disabled={isEdit && isFirstSessionTrigger}
                />
              </div>

              <div>
                <label htmlFor="expiresAt" className="block text-sm font-medium text-text-primary mb-1">
                  Expiration Date
                </label>
                {!isEdit && hasDurationConfig ? (
                  // Creation + duration config: show calculated date as read-only
                  <>
                    <DatePicker
                      value={formData.expiresAt}
                      onChange={() => {}}
                      placeholder="Auto-calculated"
                      disabled
                    />
                    <p className="text-xs text-text-secondary mt-1">
                      Auto-calculated: {formatDuration(selectedPackageType!.expiryDurationValue!, selectedPackageType!.expiryDurationUnit!)} after start date
                    </p>
                  </>
                ) : (
                  // Edit mode or no duration config: editable
                  <>
                    <DatePicker
                      value={formData.expiresAt}
                      onChange={(value) => setFormData({ ...formData, expiresAt: value })}
                      placeholder="Select expiry date"
                    />
                    {isEdit && packageData?.expiresAt && new Date(packageData.expiresAt) < new Date() && (
                      <p className="text-xs text-warning-600 mt-1">
                        This package has expired. Set a future date to re-activate it.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {isEdit && (
            <div className="flex items-center">
              <input
                id="active"
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="active" className="ml-2 block text-sm text-text-primary">
                Active
              </label>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : (isEdit ? 'Update Package' : 'Create Package')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (preselectedClientId) {
                  router.push(`/clients/${preselectedClientId}`)
                } else {
                  router.push('/packages')
                }
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}