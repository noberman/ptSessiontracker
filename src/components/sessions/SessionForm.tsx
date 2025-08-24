'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

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
  userLocation?: { id: string; name: string } | null
}

export function SessionForm({ 
  clients,
  myClients = [],
  otherClients = [],
  trainers = [],
  preselectedClientId,
  currentUserRole,
  currentUserId,
  userLocation
}: SessionFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    clientId: preselectedClientId || '',
    trainerId: currentUserId, // Default to current user for trainers
    packageId: '',
    sessionDate: new Date().toISOString().split('T')[0],
    notes: ''
  })

  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [isSubstitute, setIsSubstitute] = useState(false)

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

    // Check if session date is in the future
    const sessionDate = new Date(formData.sessionDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (sessionDate > today) {
      setError('Cannot create sessions for future dates')
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
        throw new Error(data.error || 'Failed to create session')
      }

      // Redirect to sessions list or client page
      if (preselectedClientId) {
        router.push(`/clients/${preselectedClientId}`)
      } else {
        router.push('/sessions')
      }
      router.refresh()
    } catch (err: any) {
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
            <div className="rounded-lg bg-error-50 border border-error-200 p-4">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          )}

          {/* Trainer Selection (for managers/admins) */}
          {currentUserRole !== 'TRAINER' && trainers && trainers.length > 0 && (
            <div>
              <label htmlFor="trainer" className="block text-sm font-medium text-text-primary mb-1">
                Select Trainer *
              </label>
              <select
                id="trainer"
                required
                value={formData.trainerId}
                onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
                className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">Select a trainer</option>
                {trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.name} ({trainer.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Client Selection */}
          <div>
            <label htmlFor="client" className="block text-sm font-medium text-text-primary mb-1">
              Select Client *
            </label>
            {currentUserRole === 'TRAINER' && myClients.length > 0 && otherClients.length > 0 ? (
              <select
                id="client"
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">Select a client</option>
                {myClients.length > 0 && (
                  <optgroup label="My Clients">
                    {myClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </option>
                    ))}
                  </optgroup>
                )}
                {otherClients.length > 0 && (
                  <optgroup label="Other Clients (Substitute)">
                    {otherClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            ) : (
              <select
                id="client"
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </option>
                ))}
              </select>
            )}
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

          {/* Date */}
          <div>
            <label htmlFor="sessionDate" className="block text-sm font-medium text-text-primary mb-1">
              Session Date *
            </label>
            <Input
              id="sessionDate"
              type="date"
              required
              value={formData.sessionDate}
              onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Location Display */}
          {userLocation && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Location
              </label>
              <div className="block w-full rounded-lg border border-border px-3 py-2 bg-background-secondary text-text-secondary text-sm">
                {userLocation.name}
              </div>
            </div>
          )}

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

          <div className="bg-background-secondary rounded-lg p-3">
            <p className="text-sm text-text-secondary">
              This session will be marked as <span className="font-semibold">Pending Validation</span> and 
              an email will be sent to the client for confirmation.
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