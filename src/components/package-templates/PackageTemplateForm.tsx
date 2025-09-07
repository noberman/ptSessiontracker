'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface PackageTemplateFormProps {
  template?: {
    id: string
    name: string
    displayName: string
    category: string
    sessions: number
    price: number
    active: boolean
    sortOrder: number
  }
}

const CATEGORIES = ['Prime', 'Elite', 'Transformation', 'Intro', 'Custom']

export function PackageTemplateForm({ template }: PackageTemplateFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const isEdit = !!template
  
  const [formData, setFormData] = useState({
    name: template?.name || '',
    displayName: template?.displayName || '',
    category: template?.category || 'Prime',
    sessions: template?.sessions || 0,
    price: template?.price || 0,
    active: template?.active !== false,
    sortOrder: template?.sortOrder || 0,
  })

  const sessionValue = formData.price && formData.sessions 
    ? (formData.price / formData.sessions).toFixed(2)
    : '0.00'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate required fields
    if (!formData.name || !formData.displayName || !formData.category) {
      setError('Please fill in all required fields')
      setLoading(false)
      return
    }

    if (formData.sessions <= 0 || formData.price <= 0) {
      setError('Sessions and price must be greater than 0')
      setLoading(false)
      return
    }

    try {
      const url = isEdit 
        ? `/api/package-templates/${template.id}` 
        : '/api/package-templates'
      
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
        throw new Error(data.error || 'Failed to save template')
      }

      router.push('/package-templates')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit Package Template' : 'Create Package Template'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error-50 border border-error-200 p-4">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-text-primary mb-1">
                Display Name *
              </label>
              <Input
                id="displayName"
                type="text"
                required
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="e.g., 12 Prime PT Sessions"
              />
              <p className="text-xs text-text-secondary mt-1">
                This is what users will see when selecting a package
              </p>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">
                Internal Name *
              </label>
              <Input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Pre-Paid - 12 Prime PT Sessions"
              />
              <p className="text-xs text-text-secondary mt-1">
                Unique identifier for the template
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-text-primary mb-1">
                Category *
              </label>
              <select
                id="category"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sortOrder" className="block text-sm font-medium text-text-primary mb-1">
                Sort Order (within category)
              </label>
              <Input
                id="sortOrder"
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
              <p className="text-xs text-text-secondary mt-1">
                Order within the {formData.category} category (lower numbers appear first)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="sessions" className="block text-sm font-medium text-text-primary mb-1">
                Sessions *
              </label>
              <Input
                id="sessions"
                type="number"
                required
                min="1"
                value={formData.sessions}
                onChange={(e) => setFormData({ ...formData, sessions: parseInt(e.target.value) || 0 })}
                placeholder="12"
              />
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-text-primary mb-1">
                Package Price *
              </label>
              <Input
                id="price"
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="1200.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Per Session Value
              </label>
              <div className="rounded-lg border border-border px-3 py-2 bg-gray-50">
                <span className="text-sm text-text-primary font-medium">${sessionValue}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="active" className="ml-2 block text-sm text-text-primary">
              Active (template will be available for selection)
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/package-templates')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Template' : 'Create Template')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}