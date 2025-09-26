'use client'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Check, CreditCard } from 'lucide-react'

interface BillingStepProps {
  onNext: () => void
}

const plans = [
  {
    name: 'FREE',
    price: 0,
    features: [
      '2 trainers',
      '50 sessions/month',
      '1 location',
      'Basic support'
    ],
    current: true
  },
  {
    name: 'GROWTH',
    price: 17,
    features: [
      '10 trainers',
      '500 sessions/month',
      '3 locations',
      'Priority support',
      'Advanced analytics'
    ],
    recommended: true
  },
  {
    name: 'SCALE',
    price: 37,
    features: [
      'Unlimited trainers',
      'Unlimited sessions',
      'Unlimited locations',
      'Premium support',
      'Custom integrations'
    ]
  }
]

export function BillingStep({ onNext }: BillingStepProps) {
  const handleSelectPlan = (plan: string) => {
    // For now, just continue with Free plan
    // TODO: Implement Stripe integration for paid plans
    onNext()
  }

  return (
    <Card className="p-8 md:p-10">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
          <CreditCard className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Choose your plan
        </h2>
        <p className="text-text-secondary">
          Start free and upgrade anytime
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative p-6 border-2 rounded-lg transition-all ${
              plan.current
                ? 'border-primary bg-primary-50'
                : 'border-border hover:border-primary-200'
            }`}
          >
            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-white text-xs px-3 py-1 rounded-full">
                  Recommended
                </span>
              </div>
            )}
            
            <div className="text-center mb-4">
              <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
              <div className="text-3xl font-bold">
                ${plan.price}
                <span className="text-sm font-normal text-text-secondary">/month</span>
              </div>
              {plan.current && (
                <span className="text-xs text-primary font-medium">Current Plan</span>
              )}
            </div>
            
            <ul className="space-y-2 mb-6">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-secondary">{feature}</span>
                </li>
              ))}
            </ul>
            
            <Button
              className="w-full"
              variant={plan.current ? 'primary' : 'outline'}
              onClick={() => handleSelectPlan(plan.name)}
            >
              {plan.current ? 'Continue with Free' : '14-day trial'}
            </Button>
          </div>
        ))}
      </div>
      
      <p className="text-center text-sm text-text-secondary">
        No credit card required for Free plan
      </p>
    </Card>
  )
}