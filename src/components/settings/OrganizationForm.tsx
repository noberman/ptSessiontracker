'use client'

import { useState } from 'react'
import { Organization } from '@prisma/client'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'

interface OrganizationFormProps {
  organization: Organization
}

export function OrganizationForm({ organization }: OrganizationFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: organization.name,
    email: organization.email,
    phone: organization.phone || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update organization')
      }

      toast.success('Organization updated successfully')
    } catch (error) {
      console.error('Error updating organization:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update organization')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">
          Organization Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary"
          required
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
          Contact Email
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary"
          required
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-text-primary mb-1">
          Phone Number (Optional)
        </label>
        <input
          type="tel"
          id="phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary"
          placeholder="+65 1234 5678"
        />
      </div>

      <div className="pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}