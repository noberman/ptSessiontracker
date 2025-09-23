'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Sparkles, Loader2 } from 'lucide-react'
import { getStripe } from '@/lib/stripe-client'

interface UpgradeButtonProps {
  className?: string
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children?: React.ReactNode
  tier?: 'BASIC' | 'PRO'
}

export function UpgradeButton({ 
  className,
  variant = 'primary',
  size = 'md',
  children,
  tier = 'PRO'
}: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async () => {
    setLoading(true)
    setError(null)

    try {
      // Create checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start checkout')
      }

      // Get Stripe instance
      const stripe = await getStripe()
      if (!stripe) {
        throw new Error('Stripe not configured')
      }

      // Redirect to checkout
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      })

      if (stripeError) {
        throw stripeError
      }
    } catch (err: any) {
      console.error('Upgrade error:', err)
      setError(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant={variant}
        size={size}
        onClick={handleUpgrade}
        disabled={loading}
        className={className}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading checkout...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            {children || 'Upgrade to Professional'}
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-error">{error}</p>
      )}
    </div>
  )
}