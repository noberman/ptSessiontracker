'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface LocationFormProps {
  location?: {
    id: string
    name: string
    active: boolean
  }
  isEdit?: boolean
}

export function LocationForm({ location, isEdit = false }: LocationFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: location?.name || '',
    active: location?.active ?? true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const url = isEdit 
        ? `/api/locations/${location?.id}`
        : '/api/locations'
      
      const method = isEdit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEdit ? 'update' : 'create'} location`)
      }

      // Redirect to locations list
      router.push('/locations')
      router.refresh()
    } catch (err: any) {
      setError(err.message || `Failed to ${isEdit ? 'update' : 'create'} location`)
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Location' : 'Create New Location'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error-50 border border-error-200 p-4">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">
              Location Name *
            </label>
            <Input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Downtown Gym, West Branch"
              className="w-full"
            />
            <p className="text-xs text-text-secondary mt-1">
              Choose a unique name that identifies this gym location
            </p>
          </div>

          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Status
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="active"
                    checked={formData.active}
                    onChange={() => setFormData({ ...formData, active: true })}
                    className="mr-2"
                  />
                  <span className="text-sm text-text-primary">Active</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="active"
                    checked={!formData.active}
                    onChange={() => setFormData({ ...formData, active: false })}
                    className="mr-2"
                  />
                  <span className="text-sm text-text-primary">Inactive</span>
                </label>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Inactive locations won't be available for new sessions
              </p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="flex-1"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Location' : 'Create Location'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/locations')}
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