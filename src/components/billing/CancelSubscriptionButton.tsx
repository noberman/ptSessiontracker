'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { AlertCircle, Loader2 } from 'lucide-react'

interface CancelSubscriptionButtonProps {
  className?: string
}

export function CancelSubscriptionButton({ className }: CancelSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleCancel = async () => {
    setLoading(true)
    try {
      // Open Stripe portal where they can cancel
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to open billing portal')
      }
      
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error: unknown) {
      console.error('Error opening billing portal:', error)
      alert(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="space-y-3">
        <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-warning-900">
              <p className="font-medium">Are you sure you want to cancel?</p>
              <p className="mt-1">You&apos;ll lose access to premium features at the end of your billing period.</p>
              <p className="mt-2 text-xs">You&apos;ll be redirected to manage your subscription.</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="danger"
            size="sm"
            onClick={handleCancel}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Opening Portal...
              </>
            ) : (
              'Continue to Cancel'
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfirm(false)}
            disabled={loading}
          >
            Keep Subscription
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button 
      variant="outline"
      size="sm"
      className={`text-error-600 hover:bg-error-50 hover:border-error-300 ${className}`}
      onClick={() => setShowConfirm(true)}
    >
      Cancel Subscription
    </Button>
  )
}