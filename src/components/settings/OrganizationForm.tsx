'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Organization } from '@prisma/client'
import { Button } from '@/components/ui/Button'
import { TimezonePicker } from '@/components/ui/TimezonePicker'
import { toast } from 'react-hot-toast'
import { AlertCircle } from 'lucide-react'

interface OrganizationFormProps {
  organization: Organization
}

export function OrganizationForm({ organization }: OrganizationFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: organization.name,
    email: organization.email,
    phone: organization.phone || '',
    timezone: organization.timezone || 'Asia/Singapore'
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
      
      // If timezone was changed, refresh the entire app to update all components
      if (formData.timezone !== organization.timezone) {
        toast.loading('Refreshing to apply timezone change...', { duration: 1000 })
        // Small delay to let the toast show
        setTimeout(() => {
          router.refresh()
          // Also reload the page to ensure all server components re-fetch
          window.location.reload()
        }, 1000)
      } else {
        // For non-timezone changes, just refresh the router
        router.refresh()
      }
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

      <div className="space-y-2">
        <label htmlFor="timezone" className="block text-sm font-medium text-text-primary">
          Timezone
        </label>
        <div className="relative">
          <TimezonePicker 
            value={formData.timezone}
            onChange={(value) => setFormData({ ...formData, timezone: value })}
          />
        </div>
        <div className="p-3 bg-warning-50 border border-warning-200 rounded-md flex gap-2">
          <AlertCircle className="h-4 w-4 text-warning-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-warning-800 space-y-1">
            <p className="font-medium">Important: Changing timezone affects session times and commission calculations</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>All future sessions will be stored using this timezone</li>
              <li>Commission month boundaries will use this timezone</li>
              <li>Existing sessions will continue to display correctly</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}