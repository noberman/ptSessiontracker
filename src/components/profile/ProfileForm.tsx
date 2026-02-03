'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useSession } from 'next-auth/react'

interface ProfileFormProps {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter()
  const { update } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPasswordFields, setShowPasswordFields] = useState(false)
  
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    // Validate password fields if changing password
    if (showPasswordFields) {
      if (!formData.currentPassword) {
        setError('Current password is required to change password')
        setLoading(false)
        return
      }
      
      if (formData.newPassword !== formData.confirmPassword) {
        setError('New passwords do not match')
        setLoading(false)
        return
      }
      
      if (formData.newPassword && formData.newPassword.length < 6) {
        setError('New password must be at least 6 characters')
        setLoading(false)
        return
      }
    }

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
      }

      if (showPasswordFields && formData.newPassword) {
        payload.currentPassword = formData.currentPassword
        payload.newPassword = formData.newPassword
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      // Update the session with new user data
      await update({
        name: formData.name,
        email: formData.email,
      })

      setSuccess('Profile updated successfully')
      
      // Reset password fields
      if (showPasswordFields) {
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }))
        setShowPasswordFields(false)
      }

      // Refresh the page to show updated data
      router.refresh()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-error-50 border border-error-200 p-4">
          <p className="text-sm text-error-600">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="rounded-lg bg-success-50 border border-success-200 p-4">
          <p className="text-sm text-success-600">{success}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">Name</label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="mt-1"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">Email</label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            className="mt-1"
          />
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-text-primary mb-1">Role</label>
          <Input
            id="role"
            type="text"
            value={user.role.replace('_', ' ')}
            disabled
            className="mt-1 bg-gray-50"
          />
          <p className="text-xs text-text-secondary mt-1">
            Role cannot be changed. Contact an administrator if you need to change your role.
          </p>
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-text-primary">Change Password</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPasswordFields(!showPasswordFields)}
          >
            {showPasswordFields ? 'Cancel' : 'Change Password'}
          </Button>
        </div>

        {showPasswordFields && (
          <div className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-text-primary mb-1">Current Password</label>
              <Input
                id="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-text-primary mb-1">New Password</label>
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="mt-1"
                placeholder="Minimum 6 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-1">Confirm New Password</label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}