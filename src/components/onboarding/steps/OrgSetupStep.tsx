'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Building2, MapPin } from 'lucide-react'

interface OrgSetupStepProps {
  onNext: (data: { organizationName: string; locationName: string }) => void
}

export function OrgSetupStep({ onNext }: OrgSetupStepProps) {
  const [organizationName, setOrganizationName] = useState('')
  const [locationName, setLocationName] = useState('Main Location')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!organizationName || !locationName) {
      setError('Please fill in all fields')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Create organization for Google OAuth user
      const response = await fetch('/api/auth/google-org-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName,
          locationName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization')
      }

      // Continue to next step
      onNext({ organizationName, locationName })
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-8 md:p-10">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Let&apos;s set up your organization
        </h2>
        <p className="text-text-secondary">
          This will be your gym or fitness studio
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            <Building2 className="w-4 h-4 inline mr-1" />
            Organization Name *
          </label>
          <Input
            type="text"
            placeholder="e.g., FitLife Gym"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            required
          />
          <p className="text-xs text-text-secondary mt-1">
            This is your business name
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            <MapPin className="w-4 h-4 inline mr-1" />
            Primary Location Name *
          </label>
          <Input
            type="text"
            placeholder="e.g., Main Location"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            required
          />
          <p className="text-xs text-text-secondary mt-1">
            You can add more locations later
          </p>
        </div>

        {error && (
          <div className="p-3 bg-error-50 border border-error-200 rounded-md">
            <p className="text-sm text-error-600">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? 'Creating organization...' : 'Create Organization →'}
        </Button>
      </form>
    </Card>
  )
}