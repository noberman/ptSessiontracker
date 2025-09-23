'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, TrendingUp, Check } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SUBSCRIPTION_TIERS } from '@/lib/stripe'
import { SubscriptionTier } from '@prisma/client'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  currentTier: SubscriptionTier
  recommendedTier?: SubscriptionTier
  limitType: 'trainers' | 'sessions' | 'locations'
  currentUsage?: {
    current: number
    limit: number
    percentage: number
  }
}

export function UpgradeModal({
  isOpen,
  onClose,
  currentTier,
  recommendedTier = 'BASIC',
  limitType,
  currentUsage,
}: UpgradeModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const limitLabels = {
    trainers: 'trainers',
    sessions: 'sessions per month',
    locations: 'locations',
  }

  const getRecommendedTiers = () => {
    if (currentTier === 'FREE') {
      return ['BASIC', 'PRO'] as const
    }
    return ['PRO'] as const
  }

  const tiers = getRecommendedTiers()

  const handleUpgrade = (tier: SubscriptionTier) => {
    setLoading(true)
    router.push(`/settings/billing?upgrade=${tier.toLowerCase()}`)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-warning-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-warning-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                You've reached your limit
              </h2>
              <p className="text-sm text-text-secondary">
                Upgrade to add more {limitLabels[limitType]}
              </p>
            </div>
          </div>

          {currentUsage && (
            <div className="mb-6 p-4 bg-background-alt rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-text-secondary">Current usage</span>
                <span className="text-sm font-medium">
                  {currentUsage.current} / {currentUsage.limit} {limitLabels[limitType]}
                </span>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div
                  className="bg-error-500 h-2 rounded-full"
                  style={{ width: `${Math.min(100, currentUsage.percentage)}%` }}
                />
              </div>
            </div>
          )}

          <div className="space-y-4">
            {tiers.map((tierKey) => {
              const tier = SUBSCRIPTION_TIERS[tierKey]
              const isRecommended = tierKey === recommendedTier
              const limit = tier.limits[limitType === 'sessions' ? 'sessionsPerMonth' : limitType]

              return (
                <div
                  key={tierKey}
                  className={`border rounded-lg p-4 ${
                    isRecommended ? 'border-primary-500 bg-primary-50' : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{tier.name}</h3>
                        {isRecommended && (
                          <span className="text-xs bg-primary-500 text-white px-2 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-bold mb-2">
                        ${tier.price}
                        <span className="text-sm font-normal text-text-secondary">/month</span>
                      </p>
                      <ul className="space-y-1">
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-success-500" />
                          <span className={limitType === 'trainers' ? 'font-semibold' : ''}>
                            {limit === -1 ? 'Unlimited' : `Up to ${limit}`} trainers
                          </span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-success-500" />
                          <span className={limitType === 'sessions' ? 'font-semibold' : ''}>
                            {tier.limits.sessionsPerMonth === -1 
                              ? 'Unlimited' 
                              : `${tier.limits.sessionsPerMonth}`} sessions/month
                          </span>
                        </li>
                        <li className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-success-500" />
                          <span className={limitType === 'locations' ? 'font-semibold' : ''}>
                            {tier.limits.locations === -1 
                              ? 'Unlimited' 
                              : `Up to ${tier.limits.locations}`} locations
                          </span>
                        </li>
                      </ul>
                    </div>
                    <Button
                      onClick={() => handleUpgrade(tierKey)}
                      variant={isRecommended ? 'primary' : 'outline'}
                      disabled={loading}
                      className="ml-4"
                    >
                      Upgrade
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex justify-between items-center">
            <Button variant="ghost" onClick={onClose}>
              Maybe later
            </Button>
            <p className="text-xs text-text-secondary">
              Cancel anytime • No hidden fees
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}