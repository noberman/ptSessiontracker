'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DatePicker } from '@/components/ui/DatePicker'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SearchableSelect, type Option } from '@/components/ui/SearchableSelect'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

interface Package {
  id: string
  name: string
  packageType: string
  remainingSessions: number
  totalSessions: number
  expiresAt: string | null
}

interface Client {
  id: string
  name: string
  email: string
  locationId?: string
  location?: {
    id: string
    name: string
  }
  packages: Package[]
}

interface SessionFormProps {
  clients: Client[]
  myClients?: Client[]
  otherClients?: Client[]
  trainers?: Array<{
    id: string
    name: string
    email: string
  }>
  preselectedClientId?: string
  currentUserRole: string
  currentUserId: string
}

export function SessionForm({ 
  clients,
  myClients = [],
  otherClients = [],
  trainers = [],
  preselectedClientId,
  currentUserRole,
  currentUserId
}: SessionFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    clientId: preselectedClientId || '',
    trainerId: currentUserId, // Default to current user for trainers
    packageId: '',
    sessionDate: new Date().toISOString().split('T')[0],
    sessionTime: new Date().toTimeString().slice(0, 5), // Default to current time (HH:MM)
    notes: '',
    isNoShow: false
  })

  const [paymentRequired, setPaymentRequired] = useState(false)
  const [paymentSummary, setPaymentSummary] = useState<{
    unlockedSessions: number
    usedSessions: number
    remainingBalance: number
  } | null>(null)

  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [isSubstitute, setIsSubstitute] = useState(false)
  
  // Convert clients to searchable options
  const clientOptions = useMemo(() => {
    if (currentUserRole === 'TRAINER' && myClients.length > 0 && otherClients.length > 0) {
      return [
        ...myClients.map(client => ({
          value: client.id,
          label: client.name,
          subLabel: client.email,
          group: 'My Clients'
        })),
        ...otherClients.map(client => ({
          value: client.id,
          label: client.name,
          subLabel: client.email,
          group: 'Other Clients (Substitute)'
        }))
      ]
    }
    return clients.map(client => ({
      value: client.id,
      label: client.name,
      subLabel: `${client.email}${client.location ? ` • ${client.location.name}` : ''}`
    }))
  }, [clients, myClients, otherClients, currentUserRole])
  
  // Convert trainers to searchable options
  const trainerOptions = useMemo(() => {
    return trainers.map(trainer => ({
      value: trainer.id,
      label: trainer.name,
      subLabel: trainer.email
    }))
  }, [trainers])

  // Update selected client when clientId changes
  useEffect(() => {
    if (formData.clientId) {
      const client = clients.find(c => c.id === formData.clientId)
      setSelectedClient(client || null)
      
      // Check if this is a substitute session (for trainers)
      if (currentUserRole === 'TRAINER' && client) {
        const isMyClient = myClients.some(c => c.id === client.id)
        setIsSubstitute(!isMyClient)
      }

      // Reset package selection when client changes
      setFormData(prev => ({ ...prev, packageId: '' }))
      setSelectedPackage(null)
    } else {
      setSelectedClient(null)
      setIsSubstitute(false)
    }
  }, [formData.clientId, clients, myClients, currentUserRole])

  // Update selected package when packageId changes
  useEffect(() => {
    if (formData.packageId && selectedClient) {
      const pkg = selectedClient.packages.find(p => p.id === formData.packageId)
      setSelectedPackage(pkg || null)
    } else {
      setSelectedPackage(null)
    }
  }, [formData.packageId, selectedClient])

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

    if (!formData.packageId) {
      setError('Please select a package')
      setLoading(false)
      return
    }

    if (!formData.sessionDate) {
      setError('Please select a session date')
      setLoading(false)
      return
    }

    if (!formData.sessionTime) {
      setError('Please select a session time')
      setLoading(false)
      return
    }

    // Combine date and time for validation
    const sessionDateTime = new Date(`${formData.sessionDate}T${formData.sessionTime}`)
    const now = new Date()
    if (sessionDateTime > now) {
      setError('Cannot create sessions for future dates/times')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        // Check if this is a payment-required error
        if (data.paymentRequired && data.summary) {
          setPaymentRequired(true)
          setPaymentSummary({
            unlockedSessions: data.summary.unlockedSessions,
            usedSessions: data.summary.usedSessions,
            remainingBalance: data.summary.remainingBalance
          })
          setError(data.error || 'Payment required to unlock more sessions')
        } else {
          setPaymentRequired(false)
          setPaymentSummary(null)
          throw new Error(data.error || 'Failed to create session')
        }
        setLoading(false)
        return
      }

      // Redirect to sessions list or client page
      if (preselectedClientId) {
        router.push(`/clients/${preselectedClientId}`)
      } else {
        router.push('/sessions')
      }
      router.refresh()
    } catch (err: any) {
      setPaymentRequired(false)
      setPaymentSummary(null)
      setError(err.message || 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  const getPackageStatus = (pkg: Package) => {
    const isExpired = pkg.expiresAt && new Date(pkg.expiresAt) < new Date()
    const percentUsed = pkg.totalSessions > 0 
      ? Math.round(((pkg.totalSessions - pkg.remainingSessions) / pkg.totalSessions) * 100)
      : 0

    return {
      isExpired,
      percentUsed,
      hasNoSessions: pkg.remainingSessions === 0
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log Training Session</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className={`rounded-lg p-4 ${paymentRequired ? 'bg-warning-50 border border-warning-200' : 'bg-error-50 border border-error-200'}`}>
              {paymentRequired ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-warning-800">Payment Required</p>
                      <p className="text-sm text-warning-700 mt-1">{error}</p>
                    </div>
                  </div>
                  {paymentSummary && (
                    <div className="text-sm text-warning-700 bg-warning-100 rounded p-3">
                      <p>Sessions unlocked: <strong>{paymentSummary.unlockedSessions}</strong></p>
                      <p>Sessions used: <strong>{paymentSummary.usedSessions}</strong></p>
                      <p>Remaining balance: <strong>${paymentSummary.remainingBalance.toFixed(2)}</strong></p>
                    </div>
                  )}
                  {formData.packageId && (
                    <Link
                      href={`/packages/${formData.packageId}`}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-warning-700 bg-warning-100 hover:bg-warning-200 rounded-md transition-colors"
                    >
                      Go to Package to Record Payment
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-sm text-error-700">{error}</p>
              )}
            </div>
          )}

          {/* Trainer Selection (for managers/admins) */}
          {currentUserRole !== 'TRAINER' && trainers && trainers.length > 0 && (
            <div>
              <label htmlFor="trainer" className="block text-sm font-medium text-text-primary mb-1">
                Select Trainer *
              </label>
              <SearchableSelect
                id="trainer"
                options={trainerOptions}
                value={formData.trainerId}
                onChange={(value) => setFormData({ ...formData, trainerId: value })}
                placeholder="Select a trainer"
                searchPlaceholder="Type trainer name or email..."
                required
              />
            </div>
          )}

          {/* Client Selection */}
          <div>
            <label htmlFor="client" className="block text-sm font-medium text-text-primary mb-1">
              Select Client *
            </label>
            <SearchableSelect
              id="client"
              options={clientOptions}
              value={formData.clientId}
              onChange={(value) => setFormData({ ...formData, clientId: value })}
              placeholder="Select a client"
              searchPlaceholder="Type client name or email..."
              required
              showGroups={currentUserRole === 'TRAINER' && myClients.length > 0 && otherClients.length > 0}
            />
            {isSubstitute && (
              <div className="mt-2">
                <Badge variant="warning" size="sm">
                  Substitute Session - You are not the primary trainer
                </Badge>
              </div>
            )}
          </div>

          {/* Package Selection */}
          {selectedClient && selectedClient.packages.length > 0 && (
            <div>
              <label htmlFor="package" className="block text-sm font-medium text-text-primary mb-1">
                Select Package *
              </label>
              <select
                id="package"
                required
                value={formData.packageId}
                onChange={(e) => setFormData({ ...formData, packageId: e.target.value })}
                className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">Select a package</option>
                {selectedClient.packages.map((pkg) => {
                  const status = getPackageStatus(pkg)
                  return (
                    <option 
                      key={pkg.id} 
                      value={pkg.id}
                      disabled={status.isExpired || false}
                    >
                      {pkg.name} - {pkg.remainingSessions}/{pkg.totalSessions} sessions remaining
                      {status.isExpired && ' (EXPIRED)'}
                      {status.hasNoSessions && ' (NO SESSIONS)'}
                    </option>
                  )
                })}
              </select>
              {selectedPackage && (
                <div className="mt-2 space-y-1">
                  <div className="text-sm text-text-secondary">
                    Package: {selectedPackage.packageType}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm text-text-secondary">
                      Sessions: {selectedPackage.totalSessions - selectedPackage.remainingSessions} used / {selectedPackage.totalSessions} total
                    </div>
                    {selectedPackage.remainingSessions === 0 && (
                      <Badge variant="error" size="xs">
                        No Sessions Remaining
                      </Badge>
                    )}
                  </div>
                  {selectedPackage.expiresAt && (
                    <div className="text-sm text-text-secondary">
                      Expires: {new Date(selectedPackage.expiresAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedClient && selectedClient.packages.length === 0 && (
            <div className="rounded-lg bg-warning-50 border border-warning-200 p-4">
              <p className="text-sm text-warning-700">
                This client has no active packages. Please create a package first.
              </p>
            </div>
          )}

          {/* Date and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sessionDate" className="block text-sm font-medium text-text-primary mb-1">
                Session Date *
              </label>
              <DatePicker
                value={formData.sessionDate}
                onChange={(value) => setFormData({ ...formData, sessionDate: value })}
                maxDate={new Date()}
                placeholder="Select date"
              />
            </div>
            <div>
              <label htmlFor="sessionTime" className="block text-sm font-medium text-text-primary mb-1">
                Session Time *
              </label>
              <Input
                id="sessionTime"
                type="time"
                required
                value={formData.sessionTime}
                onChange={(e) => setFormData({ ...formData, sessionTime: e.target.value })}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-text-primary mb-1">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              placeholder="Any additional notes about the session..."
            />
          </div>

          {/* No-Show Checkbox */}
          <div className="bg-background-secondary rounded-lg p-4">
            <div className="flex items-start">
              <input
                id="isNoShow"
                type="checkbox"
                checked={formData.isNoShow}
                onChange={(e) => setFormData({ ...formData, isNoShow: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="isNoShow" className="ml-3">
                <span className="block text-sm font-medium text-text-primary">
                  Mark as No-Show
                </span>
                <span className="block text-xs text-text-secondary mt-1">
                  Check this if the client did not show up for the scheduled session. 
                  The session will be logged but won&apos;t count toward commission.
                </span>
              </label>
            </div>
          </div>

          <div className="bg-background-secondary rounded-lg p-3">
            <p className="text-sm text-text-secondary">
              {formData.isNoShow ? (
                <>This session will be marked as <span className="font-semibold text-red-600">No-Show</span> and 
                no validation email will be sent.</>
              ) : (
                <>This session will be marked as <span className="font-semibold">Pending Validation</span> and 
                an email will be sent to the client for confirmation.</>
              )}
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              disabled={loading || !selectedClient || !selectedPackage}
              className="flex-1"
            >
              {loading ? 'Creating Session...' : 'Log Session'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (preselectedClientId) {
                  router.push(`/clients/${preselectedClientId}`)
                } else {
                  router.push('/sessions')
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