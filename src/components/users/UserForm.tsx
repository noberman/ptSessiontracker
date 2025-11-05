'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { LocationRemovalDialog } from './LocationRemovalDialog'

interface UserFormProps {
  user?: {
    id: string
    name: string
    email: string
    role: string
    locationId?: string
    locationIds?: string[]  // For multi-location support
    commissionProfileId?: string
    active: boolean
  }
  locations?: Array<{
    id: string
    name: string
  }>
  commissionProfiles?: Array<{
    id: string
    name: string
    isDefault: boolean
  }>
  currentUserRole: string
}

export function UserForm({ user, locations = [], commissionProfiles = [], currentUserRole }: UserFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Reassignment dialog state
  const [showReassignmentDialog, setShowReassignmentDialog] = useState(false)
  const [affectedClients, setAffectedClients] = useState<any[]>([])
  const [pendingLocationIds, setPendingLocationIds] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    role: user?.role || 'TRAINER',
    locationIds: user?.locationIds || [],  // User locations from UserLocation table
    commissionProfileId: user?.commissionProfileId || commissionProfiles.find(p => p.isDefault)?.id || '',
    active: user?.active !== false,
  })

  const isEdit = !!user

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLocationDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Toggle location selection
  const toggleLocation = (locationId: string) => {
    setFormData(prev => ({
      ...prev,
      locationIds: prev.locationIds.includes(locationId)
        ? prev.locationIds.filter(id => id !== locationId)
        : [...prev.locationIds, locationId]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate passwords match
    if (!isEdit && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password length
    if (!isEdit && formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    // Validate location requirement for non-admin users
    if (formData.role !== 'ADMIN' && formData.locationIds.length === 0) {
      setError('Non-admin users must be assigned to at least one location')
      setLoading(false)
      return
    }

    try {
      const url = isEdit ? `/api/users/${user.id}` : '/api/users'
      const method = isEdit ? 'PUT' : 'POST'
      
      const body: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        locationId: formData.locationIds[0] || null,  // First selected location becomes primary
        locationIds: formData.locationIds,  // All selected locations
      }

      if (!isEdit || formData.password) {
        body.password = formData.password
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
        // Check if reassignment is required
        if (response.status === 409 && data.requiresReassignment) {
          setAffectedClients(data.affectedClients)
          setPendingLocationIds(formData.locationIds)
          setShowReassignmentDialog(true)
          setLoading(false)
          return
        }
        throw new Error(data.message || data.error || 'Failed to save user')
      }

      router.push('/users')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to save user')
    } finally {
      setLoading(false)
    }
  }

  // Role options based on current user's role
  const getRoleOptions = () => {
    if (currentUserRole === 'ADMIN') {
      return ['TRAINER', 'CLUB_MANAGER', 'PT_MANAGER', 'ADMIN']
    } else if (currentUserRole === 'PT_MANAGER') {
      return ['TRAINER', 'CLUB_MANAGER']
    } else if (currentUserRole === 'CLUB_MANAGER') {
      return ['TRAINER']
    }
    return []
  }

  const roleOptions = getRoleOptions()

  // Handle reassignment confirmation
  const handleReassignment = async (reassignments: Record<string, string>) => {
    try {
      // Build reassignment array for API
      const reassignmentArray = Object.entries(reassignments).map(([clientId, toTrainerId]) => {
        const client = affectedClients.find(c => c.id === clientId)
        return {
          clientId,
          fromTrainerId: user!.id,
          toTrainerId,
          locationId: client.locationId
        }
      })

      // Call bulk reassignment API
      const reassignResponse = await fetch('/api/clients/bulk-reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reassignments: reassignmentArray })
      })

      if (!reassignResponse.ok) {
        const error = await reassignResponse.json()
        throw new Error(error.error || 'Failed to reassign clients')
      }

      // Now update the user with the new locations
      const updateResponse = await fetch(`/api/users/${user!.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          role: formData.role,
          locationId: pendingLocationIds[0] || null,
          locationIds: pendingLocationIds,
          active: formData.active
        })
      })

      if (!updateResponse.ok) {
        const error = await updateResponse.json()
        throw new Error(error.error || 'Failed to update user locations')
      }

      // Success - redirect
      router.push('/users')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to complete reassignment')
      setShowReassignmentDialog(false)
    }
  }

  return (
    <>
      <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit User' : 'Create New User'}</CardTitle>
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
              Name *
            </label>
            <Input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter full name"
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

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">
              Password {isEdit ? '(leave blank to keep current)' : '*'}
            </label>
            <Input
              id="password"
              type="password"
              required={!isEdit}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={isEdit ? 'Enter new password' : 'Enter password'}
            />
          </div>

          {(!isEdit || formData.password) && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-primary mb-1">
                Confirm Password *
              </label>
              <Input
                id="confirmPassword"
                type="password"
                required={!isEdit || !!formData.password}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirm password"
              />
            </div>
          )}

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-text-primary mb-1">
              Role *
            </label>
            <select
              id="role"
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {(formData.role === 'TRAINER' || formData.role === 'PT_MANAGER') && commissionProfiles.length > 0 && (
            <div>
              <label htmlFor="commissionProfile" className="block text-sm font-medium text-text-primary mb-1">
                Commission Profile
              </label>
              <select
                id="commissionProfile"
                value={formData.commissionProfileId}
                onChange={(e) => setFormData({ ...formData, commissionProfileId: e.target.value })}
                className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">Select a profile</option>
                {commissionProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} {profile.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {locations.length > 0 && (
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-medium text-text-primary mb-1">
                {formData.role === 'ADMIN' 
                  ? 'Location (Optional for Admins)'
                  : 'Assigned Locations *'}
              </label>
              
              {formData.role === 'ADMIN' ? (
                <div className="rounded-lg border border-border px-3 py-2 bg-gray-50">
                  <p className="text-sm text-text-primary">Admins have automatic access to all locations</p>
                </div>
              ) : formData.role === 'TRAINER' || formData.role === 'PT_MANAGER' || formData.role === 'CLUB_MANAGER' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-left text-text-primary bg-white hover:bg-gray-50 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm flex items-center justify-between"
                  >
                    <span>
                      {formData.locationIds.length === 0 
                        ? 'Select locations' 
                        : formData.locationIds.length === 1
                          ? locations.find(l => l.id === formData.locationIds[0])?.name || 'Select locations'
                          : `${formData.locationIds.length} locations selected`}
                    </span>
                    <svg className="h-4 w-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {locationDropdownOpen && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-white shadow-lg">
                      <div className="max-h-60 overflow-y-auto p-2">
                        {locations.map((location) => (
                          <label
                            key={location.id}
                            className="flex items-center space-x-2 hover:bg-gray-50 p-2 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.locationIds.includes(location.id)}
                              onChange={() => toggleLocation(location.id)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-text-primary">{location.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p className="mt-1 text-xs text-text-secondary">
                    {formData.role === 'TRAINER' 
                      ? 'Select all locations where this trainer can work. At least one required.'
                      : formData.role === 'PT_MANAGER'
                        ? 'Select all locations this PT Manager oversees. At least one required.'
                        : formData.role === 'CLUB_MANAGER'
                          ? 'Select all locations this Club Manager manages. At least one required.'
                          : 'Select all locations where this user can work. At least one required.'}
                  </p>
                </>
              ) : (
                <select
                  value={formData.locationIds[0] || ''}
                  onChange={(e) => setFormData({ ...formData, locationIds: e.target.value ? [e.target.value] : [] })}
                  className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="">No location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

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
              {loading ? 'Saving...' : (isEdit ? 'Update User' : 'Create User')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/users')}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
    
    {/* Reassignment Dialog */}
    {isEdit && user && (
      <LocationRemovalDialog
        isOpen={showReassignmentDialog}
        onClose={() => {
          setShowReassignmentDialog(false)
          setAffectedClients([])
          setPendingLocationIds([])
        }}
        onConfirm={handleReassignment}
        affectedClients={affectedClients}
        currentTrainerId={user.id}
        currentTrainerName={user.name}
      />
    )}
    </>
  )
}