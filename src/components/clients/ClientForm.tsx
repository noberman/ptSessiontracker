'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface ClientFormProps {
  client?: {
    id: string
    name: string
    email: string
    phone?: string | null
    locationId?: string | null
    primaryTrainerId?: string | null
    active: boolean
  }
  locations?: Array<{
    id: string
    name: string
  }>
  trainers?: Array<{
    id: string
    name: string
    email: string
    locationId?: string | null
  }>
  currentUserRole: string
}

export function ClientForm({ 
  client, 
  locations = [], 
  trainers = [],
  currentUserRole 
}: ClientFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    locationId: client?.locationId || '',
    primaryTrainerId: client?.primaryTrainerId || '',
    active: client?.active !== false,
  })

  const [filteredTrainers, setFilteredTrainers] = useState(trainers)

  // Filter trainers based on selected location
  useEffect(() => {
    if (formData.locationId) {
      const locationTrainers = trainers.filter(t => 
        !t.locationId || t.locationId === formData.locationId
      )
      setFilteredTrainers(locationTrainers)
      
      // Reset trainer selection if current trainer is not at the selected location
      if (formData.primaryTrainerId && 
          !locationTrainers.find(t => t.id === formData.primaryTrainerId)) {
        setFormData(prev => ({ ...prev, primaryTrainerId: '' }))
      }
    } else {
      setFilteredTrainers(trainers)
    }
  }, [formData.locationId, trainers])

  const isEdit = !!client

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    // Validate phone format (optional)
    if (formData.phone) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/
      if (!phoneRegex.test(formData.phone)) {
        setError('Please enter a valid phone number')
        setLoading(false)
        return
      }
    }

    try {
      const url = isEdit ? `/api/clients/${client.id}` : '/api/clients'
      const method = isEdit ? 'PUT' : 'POST'
      
      const body: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        locationId: formData.locationId || null,
        primaryTrainerId: formData.primaryTrainerId || null,
      }

      if (isEdit && currentUserRole === 'ADMIN') {
        body.active = formData.active
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
        throw new Error(data.error || 'Failed to save client')
      }

      router.push('/clients')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save client')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Client' : 'Create New Client'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error-50 border border-error-200 p-4">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">
                Name *
              </label>
              <Input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter client name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
                Email *
              </label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-text-primary mb-1">
                Phone Number
              </label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>

            {locations.length > 0 && (
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-text-primary mb-1">
                  Location
                </label>
                <select
                  id="location"
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="">Select location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="trainer" className="block text-sm font-medium text-text-primary mb-1">
              Primary Trainer
            </label>
            <select
              id="trainer"
              value={formData.primaryTrainerId}
              onChange={(e) => setFormData({ ...formData, primaryTrainerId: e.target.value })}
              className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              disabled={!formData.locationId && locations.length > 0}
            >
              <option value="">No trainer assigned</option>
              {filteredTrainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.name} ({trainer.email})
                </option>
              ))}
            </select>
            {!formData.locationId && locations.length > 0 && (
              <p className="text-xs text-text-secondary mt-1">
                Select a location first to see available trainers
              </p>
            )}
          </div>

          {isEdit && currentUserRole === 'ADMIN' && (
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
              {loading ? 'Saving...' : (isEdit ? 'Update Client' : 'Create Client')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/clients')}
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