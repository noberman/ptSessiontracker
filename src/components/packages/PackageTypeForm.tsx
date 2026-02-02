'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'

type StartTrigger = 'DATE_OF_PURCHASE' | 'FIRST_SESSION'
type DurationUnit = 'DAYS' | 'WEEKS' | 'MONTHS'

interface PackageTypeFormData {
  name: string
  defaultSessions: string
  defaultPrice: string
  startTrigger: StartTrigger
  hasExpiry: boolean
  expiryDurationValue: string
  expiryDurationUnit: DurationUnit
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
    startTrigger: packageType?.startTrigger || 'DATE_OF_PURCHASE',
    hasExpiry: !!(packageType?.expiryDurationValue),
    expiryDurationValue: packageType?.expiryDurationValue?.toString() || '',
    expiryDurationUnit: packageType?.expiryDurationUnit || 'MONTHS',
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
        startTrigger: formData.startTrigger,
        expiryDurationValue: formData.hasExpiry && formData.expiryDurationValue
          ? parseInt(formData.expiryDurationValue)
          : null,
        expiryDurationUnit: formData.hasExpiry && formData.expiryDurationValue
          ? formData.expiryDurationUnit
          : null,
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

      {/* Start Trigger */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Package Starts
        </label>
        <div className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="startTrigger"
              value="DATE_OF_PURCHASE"
              checked={formData.startTrigger === 'DATE_OF_PURCHASE'}
              onChange={() => setFormData({ ...formData, startTrigger: 'DATE_OF_PURCHASE' })}
              className="mt-0.5"
            />
            <div>
              <span className="text-sm text-text-primary">Date of Purchase</span>
              <p className="text-xs text-text-secondary">Package starts immediately when assigned to a client</p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="startTrigger"
              value="FIRST_SESSION"
              checked={formData.startTrigger === 'FIRST_SESSION'}
              onChange={() => setFormData({ ...formData, startTrigger: 'FIRST_SESSION' })}
              className="mt-0.5"
            />
            <div>
              <span className="text-sm text-text-primary">First Session</span>
              <p className="text-xs text-text-secondary">Package starts when the first session is logged</p>
            </div>
          </label>
        </div>
      </div>

      {/* Expiry Duration */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Expiry Duration
        </label>
        <label className="flex items-center gap-2 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.hasExpiry}
            onChange={(e) => setFormData({ ...formData, hasExpiry: e.target.checked })}
          />
          <span className="text-sm text-text-primary">Package expires after a set duration</span>
        </label>
        {formData.hasExpiry && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={formData.expiryDurationValue}
              onChange={(e) => setFormData({ ...formData, expiryDurationValue: e.target.value })}
              className="w-20 px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary"
              min="1"
              placeholder="e.g., 3"
            />
            <select
              value={formData.expiryDurationUnit}
              onChange={(e) => setFormData({ ...formData, expiryDurationUnit: e.target.value as DurationUnit })}
              className="px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary"
            >
              <option value="DAYS">Days</option>
              <option value="WEEKS">Weeks</option>
              <option value="MONTHS">Months</option>
            </select>
            <span className="text-sm text-text-secondary">
              after {formData.startTrigger === 'FIRST_SESSION' ? 'first session' : 'purchase'}
            </span>
          </div>
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