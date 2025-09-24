'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import { TrendingUp, Percent, Info } from 'lucide-react'

type CommissionMethod = 'FLAT' | 'PROGRESSIVE' | 'CUSTOM'

interface ProgressiveTier {
  minSessions: number
  maxSessions: number | null
  percentage: number
}

export default function CommissionsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [method, setMethod] = useState<CommissionMethod>('PROGRESSIVE')
  const [flatRate, setFlatRate] = useState(50)
  const [progressiveTiers, setProgressiveTiers] = useState<ProgressiveTier[]>([
    { minSessions: 1, maxSessions: 10, percentage: 40 },
    { minSessions: 11, maxSessions: 20, percentage: 50 },
    { minSessions: 21, maxSessions: null, percentage: 60 },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSkip, setShowSkip] = useState(false)

  // Show skip button after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleTierChange = (index: number, field: keyof ProgressiveTier, value: number | null) => {
    const newTiers = [...progressiveTiers]
    newTiers[index] = { ...newTiers[index], [field]: value }
    setProgressiveTiers(newTiers)
  }

  const handleContinue = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Save commission configuration
      let commissionData: any = {
        method: method === 'CUSTOM' ? 'CUSTOM' : method,
      }

      if (method === 'FLAT') {
        // Update organization with flat rate
        await fetch('/api/commission/method', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'FLAT',
            defaultRate: flatRate / 100, // Convert to decimal
          }),
        })
      } else if (method === 'PROGRESSIVE') {
        // Save progressive tiers
        await fetch('/api/commission/tiers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tiers: progressiveTiers.map(tier => ({
              minSessions: tier.minSessions,
              maxSessions: tier.maxSessions,
              percentage: tier.percentage / 100, // Convert to decimal
            })),
          }),
        })
      }

      // Save progress
      const progress = JSON.parse(localStorage.getItem('onboarding_progress') || '{}')
      localStorage.setItem('onboarding_progress', JSON.stringify({
        ...progress,
        currentStep: 5,
        completedSteps: [...(progress.completedSteps || []), 'commissions'],
        data: { 
          ...progress.data,
          commissionMethod: method,
          commissionConfig: method === 'FLAT' ? { rate: flatRate } : { tiers: progressiveTiers }
        }
      }))

      router.push('/onboarding/billing')
    } catch (err) {
      setError('Failed to save commission settings. Please try again.')
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    // Use default 50% flat rate
    const progress = JSON.parse(localStorage.getItem('onboarding_progress') || '{}')
    localStorage.setItem('onboarding_progress', JSON.stringify({
      ...progress,
      currentStep: 5,
      completedSteps: [...(progress.completedSteps || []), 'commissions'],
      skippedSteps: [...(progress.skippedSteps || []), 'commissions'],
      data: { 
        ...progress.data,
        commissionMethod: 'FLAT',
        commissionConfig: { rate: 50 }
      }
    }))
    router.push('/onboarding/billing')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <OnboardingProgress currentStep={4} />
        
        <Card className="p-8 md:p-10 max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">
              How do you calculate trainer commissions?
            </h2>
            <p className="text-text-secondary">
              Choose your commission structure
            </p>
          </div>

          {/* Commission Methods */}
          <div className="space-y-4 mb-6">
            {/* Flat Rate */}
            <label className="block">
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  method === 'FLAT' 
                    ? 'border-primary bg-primary-50' 
                    : 'border-border hover:border-primary-200'
                }`}
                onClick={() => setMethod('FLAT')}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="method"
                    value="FLAT"
                    checked={method === 'FLAT'}
                    onChange={() => setMethod('FLAT')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-text-primary mb-1">
                      Flat rate
                    </div>
                    <p className="text-sm text-text-secondary mb-2">
                      Same commission percentage for all sessions
                    </p>
                    {method === 'FLAT' && (
                      <div className="mt-3 flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={flatRate}
                          onChange={(e) => setFlatRate(parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <span className="text-text-primary">% of session value</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </label>

            {/* Progressive Tiers */}
            <label className="block">
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  method === 'PROGRESSIVE' 
                    ? 'border-primary bg-primary-50' 
                    : 'border-border hover:border-primary-200'
                }`}
                onClick={() => setMethod('PROGRESSIVE')}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="method"
                    value="PROGRESSIVE"
                    checked={method === 'PROGRESSIVE'}
                    onChange={() => setMethod('PROGRESSIVE')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-text-primary">
                        Progressive tiers
                      </span>
                      <span className="text-xs bg-success-100 text-success-700 px-2 py-0.5 rounded">
                        Recommended
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mb-2">
                      Commission increases with more sessions
                    </p>
                    {method === 'PROGRESSIVE' && (
                      <div className="mt-3 space-y-2">
                        {progressiveTiers.map((tier, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <span className="text-text-secondary w-24">
                              {tier.maxSessions 
                                ? `${tier.minSessions}-${tier.maxSessions}` 
                                : `${tier.minSessions}+`} sessions:
                            </span>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={tier.percentage}
                              onChange={(e) => handleTierChange(index, 'percentage', parseInt(e.target.value) || 0)}
                              className="w-16 h-8 text-sm"
                            />
                            <span>%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </label>

            {/* Custom per Trainer */}
            <label className="block">
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  method === 'CUSTOM' 
                    ? 'border-primary bg-primary-50' 
                    : 'border-border hover:border-primary-200'
                }`}
                onClick={() => setMethod('CUSTOM')}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="method"
                    value="CUSTOM"
                    checked={method === 'CUSTOM'}
                    onChange={() => setMethod('CUSTOM')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-text-primary mb-1">
                      Custom per trainer
                    </div>
                    <p className="text-sm text-text-secondary">
                      Set different rates for each trainer (configure later)
                    </p>
                  </div>
                </div>
              </div>
            </label>
          </div>

          {/* Info Box */}
          <div className="mb-6 p-3 bg-primary-50 rounded-lg flex items-start gap-2">
            <Info className="w-4 h-4 text-primary mt-0.5" />
            <p className="text-xs text-primary-900">
              You can change these settings anytime from your dashboard
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-md">
              <p className="text-sm text-error-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isLoading}
              className={`transition-opacity ${showSkip ? 'opacity-100' : 'opacity-0'}`}
            >
              Use defaults (50% flat)
            </Button>
            
            <Button
              onClick={handleContinue}
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}