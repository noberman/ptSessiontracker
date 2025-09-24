'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Building2, MapPin } from 'lucide-react'

export default function OrgSetupPage() {
  const router = useRouter()
  const { data: session, update } = useSession()
  const [organizationName, setOrganizationName] = useState('')
  const [locationName, setLocationName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // If user already has an organization, skip this step
    if (session?.user?.organizationId) {
      router.push('/onboarding/welcome')
    }
  }, [session, router])

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

      // Update the session to reflect the new organization
      await update()

      // Save initial progress
      localStorage.setItem('onboarding_progress', JSON.stringify({
        currentStep: 1,
        completedSteps: ['org-setup'],
        data: {
          organizationName,
          locationName
        }
      }))

      // Continue to welcome page
      router.push('/onboarding/welcome')
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-50 to-white">
      <Card className="p-8 md:p-10 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Welcome to FitSync!
          </h1>
          <p className="text-text-secondary">
            Let's set up your organization
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              <Building2 className="w-4 h-4 inline mr-1" />
              Organization Name
            </label>
            <Input
              type="text"
              placeholder="e.g., FitLife Gym"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              required
            />
            <p className="text-xs text-text-secondary mt-1">
              This is your gym or fitness studio name
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              <MapPin className="w-4 h-4 inline mr-1" />
              Primary Location
            </label>
            <Input
              type="text"
              placeholder="e.g., Downtown Branch"
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
            {isLoading ? 'Creating organization...' : 'Continue'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-text-secondary">
            Signed in as {session?.user?.email}
          </p>
        </div>
      </Card>
    </div>
  )
}