'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'

interface PackageTypeFormData {
  name: string
  defaultSessions: string
  defaultPrice: string
  isActive: boolean
}

interface PackageTypeFormProps {
  packageType?: any
  onSuccess: () => void
  onCancel: () => void
}

export function PackageTypeForm({ packageType, onSuccess, onCancel }: PackageTypeFormProps) {
  const [formData, setFormData] = useState<PackageTypeFormData>({
    name: packageType?.name || '',
    defaultSessions: packageType?.defaultSessions?.toString() || '',
    defaultPrice: packageType?.defaultPrice?.toString() || '',
    isActive: packageType?.isActive ?? true
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }
    
    // Validate numeric fields
    if (formData.defaultSessions && parseInt(formData.defaultSessions) <= 0) {
      toast.error('Default sessions must be greater than 0')
      return
    }
    
    if (formData.defaultPrice && parseFloat(formData.defaultPrice) < 0) {
      toast.error('Default price cannot be negative')
      return
    }
    
    setSubmitting(true)

    try {
      const payload = {
        name: formData.name.trim(),
        defaultSessions: formData.defaultSessions ? parseInt(formData.defaultSessions) : null,
        defaultPrice: formData.defaultPrice ? parseFloat(formData.defaultPrice) : null,
        isActive: formData.isActive
      }

      const url = packageType 
        ? `/api/package-types/${packageType.id}`
        : '/api/package-types'
      
      const method = packageType ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        toast.success(packageType ? 'Package type updated' : 'Package type created')
        onSuccess()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save package type')
      }
    } catch (error) {
      console.error('Error saving package type:', error)
      toast.error('Error saving package type')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">
          Package Type Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary"
          placeholder="e.g., Elite 12 Sessions, Premium 24 Sessions"
          required
        />
        <p className="text-xs text-text-secondary mt-1">
          Name shown to trainers when creating packages
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="defaultSessions" className="block text-sm font-medium text-text-primary mb-1">
            Default Sessions (optional)
          </label>
          <input
            type="number"
            id="defaultSessions"
            value={formData.defaultSessions}
            onChange={(e) => setFormData({ ...formData, defaultSessions: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary"
            min="1"
            placeholder="e.g., 10"
          />
        </div>

        <div>
          <label htmlFor="defaultPrice" className="block text-sm font-medium text-text-primary mb-1">
            Default Price (optional)
          </label>
          <input
            type="number"
            id="defaultPrice"
            value={formData.defaultPrice}
            onChange={(e) => setFormData({ ...formData, defaultPrice: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary"
            min="0"
            step="0.01"
            placeholder="e.g., 500.00"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="mr-2"
          />
          <label htmlFor="isActive" className="text-sm text-text-primary">
            Active (available for new packages)
          </label>
        </div>
        {packageType?._count?.packages > 0 && !formData.isActive && (
          <p className="text-xs text-warning mt-1">
            Warning: This type is used by {packageType._count.packages} package(s). 
            Deactivating will prevent creating new packages with this type.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-border">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'Saving...' : (packageType ? 'Update' : 'Create')}
        </Button>
      </div>
    </form>
  )
}