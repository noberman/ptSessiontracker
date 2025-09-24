'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import { Check, Crown, Zap } from 'lucide-react'

interface PlanFeature {
  text: string
  included: boolean
}

interface Plan {
  name: string
  tier: 'FREE' | 'GROWTH' | 'SCALE'
  price: number
  features: PlanFeature[]
  recommended?: boolean
}

export default function BillingPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [selectedPlan, setSelectedPlan] = useState<'FREE' | 'GROWTH' | 'SCALE'>('FREE')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const plans: Plan[] = [
    {
      name: 'Starter',
      tier: 'FREE',
      price: 0,
      features: [
        { text: '2 trainers', included: true },
        { text: '50 sessions/month', included: true },
        { text: '1 location', included: true },
        { text: 'Basic reports', included: true },
        { text: 'Email support', included: true },
        { text: 'Priority support', included: false },
        { text: 'Custom branding', included: false },
      ],
    },
    {
      name: 'Growth',
      tier: 'GROWTH',
      price: 49,
      recommended: true,
      features: [
        { text: '10 trainers', included: true },
        { text: '500 sessions/month', included: true },
        { text: '3 locations', included: true },
        { text: 'Advanced reports', included: true },
        { text: 'Priority email support', included: true },
        { text: 'Export data', included: true },
        { text: 'Custom branding', included: false },
      ],
    },
    {
      name: 'Scale',
      tier: 'SCALE',
      price: 149,
      features: [
        { text: 'Unlimited trainers', included: true },
        { text: 'Unlimited sessions', included: true },
        { text: 'Unlimited locations', included: true },
        { text: 'Custom reports', included: true },
        { text: 'Priority phone support', included: true },
        { text: 'Export all data', included: true },
        { text: 'Custom branding', included: true },
      ],
    },
  ]

  const handleSelectPlan = async (tier: 'FREE' | 'GROWTH' | 'SCALE') => {
    setSelectedPlan(tier)
    setIsLoading(true)
    setError('')

    try {
      if (tier !== 'FREE') {
        // For paid plans, we'll need to set up Stripe checkout later
        // For now, just save the selection
        console.log('Selected paid plan:', tier)
      }

      // Save progress
      const progress = JSON.parse(localStorage.getItem('onboarding_progress') || '{}')
      localStorage.setItem('onboarding_progress', JSON.stringify({
        ...progress,
        currentStep: 6,
        completedSteps: [...(progress.completedSteps || []), 'billing'],
        data: { 
          ...progress.data,
          selectedPlan: tier
        }
      }))

      // Continue to demo
      router.push('/onboarding/demo')
    } catch (err) {
      setError('Failed to save plan selection. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <OnboardingProgress currentStep={5} />
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-text-primary mb-2">
            Choose your plan
          </h2>
          <p className="text-text-secondary">
            Start with our free plan or unlock more features
          </p>
          <p className="text-sm text-success-600 mt-2">
            No credit card required for the free plan
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.tier}
              className={`relative p-6 ${
                plan.recommended 
                  ? 'ring-2 ring-primary shadow-lg' 
                  : ''
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-white text-sm font-medium px-3 py-1 rounded-full">
                    POPULAR
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-3">
                  {plan.tier === 'FREE' ? (
                    <Zap className="w-6 h-6 text-primary" />
                  ) : plan.tier === 'GROWTH' ? (
                    <TrendingUp className="w-6 h-6 text-primary" />
                  ) : (
                    <Crown className="w-6 h-6 text-primary" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-1">
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-text-primary">
                    ${plan.price}
                  </span>
                  <span className="text-text-secondary">/month</span>
                </div>
              </div>

              {/* Features List */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check 
                      className={`w-5 h-5 mt-0.5 ${
                        feature.included 
                          ? 'text-success-600' 
                          : 'text-gray-300'
                      }`}
                    />
                    <span className={`text-sm ${
                      feature.included 
                        ? 'text-text-primary' 
                        : 'text-gray-400 line-through'
                    }`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              <Button
                variant={plan.recommended ? 'default' : 'outline'}
                className="w-full"
                onClick={() => handleSelectPlan(plan.tier)}
                disabled={isLoading && selectedPlan === plan.tier}
              >
                {plan.tier === 'FREE' 
                  ? 'Continue with Free' 
                  : 'Start 14-day trial'}
              </Button>

              {plan.tier === 'FREE' && (
                <p className="text-xs text-text-secondary text-center mt-2">
                  Current plan
                </p>
              )}
            </Card>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 p-3 bg-error-50 border border-error-200 rounded-md max-w-md mx-auto">
            <p className="text-sm text-error-600 text-center">{error}</p>
          </div>
        )}

        {/* Info Text */}
        <div className="text-center mt-8">
          <p className="text-sm text-text-secondary">
            You can upgrade, downgrade, or cancel anytime
          </p>
        </div>
      </div>
    </div>
  )
}

// Add missing import
import { TrendingUp } from 'lucide-react'