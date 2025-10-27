'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

interface UsageLimits {
  trainers: { current: number; limit: number; percentage: number }
  locations: { current: number; limit: number; percentage: number }
  sessions: { current: number; limit: number; percentage: number }
}

interface LimitWarningsProps {
  organizationId: string
  subscriptionTier: 'FREE' | 'GROWTH' | 'SCALE'
  lastIssue?: string | null
  lastIssueDate?: Date | null
}

export function LimitWarnings({ 
  organizationId, 
  subscriptionTier,
  lastIssue,
  lastIssueDate
}: LimitWarningsProps) {
  const [usage, setUsage] = useState<UsageLimits | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const response = await fetch(`/api/organizations/${organizationId}/usage`)
        if (response.ok) {
          const data = await response.json()
          setUsage(data)
        }
      } catch (error) {
        console.error('Failed to fetch usage:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchUsage()
  }, [organizationId])

  if (loading || dismissed || !usage) return null

  // Check if any limits are exceeded
  const overTrainers = usage.trainers.limit !== -1 && usage.trainers.current > usage.trainers.limit
  const overLocations = usage.locations.limit !== -1 && usage.locations.current > usage.locations.limit
  const nearSessionLimit = usage.sessions.limit !== -1 && usage.sessions.percentage > 80

  // If there's a lastIssue from a downgrade, show it
  if (lastIssue && lastIssueDate) {
    const hoursSinceIssue = (Date.now() - new Date(lastIssueDate).getTime()) / (1000 * 60 * 60)
    // Show for 48 hours after the issue
    if (hoursSinceIssue < 48) {
      return (
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20 mb-6">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800 dark:text-orange-200">
            Action Required - Subscription Downgrade
          </AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-300">
            <div className="mt-2 space-y-2">
              <p>{lastIssue}</p>
              <div className="flex gap-2 mt-3">
                <Link href="/settings/billing">
                  <Button variant="primary" size="sm">
                    Upgrade Plan
                  </Button>
                </Link>
                <Link href="/settings/team">
                  <Button variant="outline" size="sm">
                    Manage Team
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setDismissed(true)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )
    }
  }

  // Show warnings for current overages
  if (!overTrainers && !overLocations && !nearSessionLimit) return null

  return (
    <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20 mb-6">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800 dark:text-orange-200">
        Plan Limits {overTrainers || overLocations ? 'Exceeded' : 'Warning'}
      </AlertTitle>
      <AlertDescription className="text-orange-700 dark:text-orange-300">
        <div className="mt-2 space-y-2">
          {overTrainers && (
            <p>
              ⚠️ You have {usage.trainers.current} trainers but your {subscriptionTier} plan allows {usage.trainers.limit}.
              Please deactivate {usage.trainers.current - usage.trainers.limit} trainer{usage.trainers.current - usage.trainers.limit > 1 ? 's' : ''} or upgrade.
            </p>
          )}
          {overLocations && (
            <p>
              ⚠️ You have {usage.locations.current} locations but your {subscriptionTier} plan allows {usage.locations.limit}.
              Please deactivate {usage.locations.current - usage.locations.limit} location{usage.locations.current - usage.locations.limit > 1 ? 's' : ''} or upgrade.
            </p>
          )}
          {nearSessionLimit && (
            <p>
              ⚠️ You&apos;ve used {usage.sessions.current} of {usage.sessions.limit} sessions this month ({usage.sessions.percentage}%).
              Consider upgrading if you need more sessions.
            </p>
          )}
          <div className="flex gap-2 mt-3">
            <Link href="/settings/billing">
              <Button variant="primary" size="sm">
                Upgrade Plan
              </Button>
            </Link>
            {(overTrainers || overLocations) && (
              <Link href="/settings/team">
                <Button variant="outline" size="sm">
                  Manage Team
                </Button>
              </Link>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}