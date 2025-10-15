'use client'

import { Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface PricingCardProps {
  tier: {
    name: string
    displayName: string
    price: number
    priceId?: string
    features: string[]
    limits: {
      trainers: number
      sessionsPerMonth: number
      locations: number
    }
  }
  isPopular?: boolean
  onSelect: () => void
}

export function PricingCard({ tier, isPopular = false, onSelect }: PricingCardProps) {
  const formatLimit = (value: number) => {
    return value === -1 ? 'Unlimited' : value.toString()
  }

  return (
    <div className={cn(
      "relative rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md",
      isPopular && "border-primary shadow-md scale-105"
    )}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
            Most Popular
          </span>
        </div>
      )}

      <div className="space-y-4">
        {/* Header */}
        <div>
          <h3 className="text-xl font-bold">{tier.displayName}</h3>
          <div className="mt-2">
            <span className="text-3xl font-bold">
              ${tier.price}
            </span>
            <span className="text-muted-foreground">/month</span>
          </div>
        </div>

        {/* Key Limits */}
        <div className="space-y-2 py-4 border-y">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Trainers</span>
            <span className="font-semibold">{formatLimit(tier.limits.trainers)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Sessions/month</span>
            <span className="font-semibold">{formatLimit(tier.limits.sessionsPerMonth)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Locations</span>
            <span className="font-semibold">{formatLimit(tier.limits.locations)}</span>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-2">
          {tier.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <Button 
          className="w-full" 
          variant={isPopular ? "primary" : "outline"}
          onClick={onSelect}
        >
          {tier.price === 0 ? 'Get Started Free' : 'Start 14-Day Trial'}
        </Button>
      </div>
    </div>
  )
}