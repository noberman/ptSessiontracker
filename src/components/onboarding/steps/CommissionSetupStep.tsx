'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { DollarSign, TrendingUp, Plus, X } from 'lucide-react'

interface CommissionSetupStepProps {
  onNext: (data: { commissionMethod: string; commissionTiers?: any[] }) => void
}

export function CommissionSetupStep({ onNext }: CommissionSetupStepProps) {
  const [method, setMethod] = useState<'FLAT' | 'PROGRESSIVE'>('FLAT')
  const [flatRate, setFlatRate] = useState<number | ''>(50)
  const [tiers, setTiers] = useState([
    { min: 1, max: 10, percentage: 40 },
    { min: 11, max: 20, percentage: 50 },
    { min: 21, max: null, percentage: 60 }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSaveCommissions = async () => {
    console.log('🔵 Saving commissions - method:', method, 'tiers:', tiers)
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/organization/commission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          ...(method === 'FLAT' ? { rate: typeof flatRate === 'number' ? flatRate : 0 } : { tiers })
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save commission settings')
      }

      console.log('🔵 Commission saved successfully, calling onNext')
      onNext({ 
        commissionMethod: method,
        ...(method === 'PROGRESSIVE' ? { commissionTiers: tiers } : {})
      })
    } catch (err) {
      console.error('🔴 Error saving commissions:', err)
      setError('Failed to save commission settings. Please try again.')
      setIsLoading(false)
    }
  }

  const updateTier = (index: number, field: string, value: any) => {
    const newTiers = [...tiers]
    newTiers[index] = { ...newTiers[index], [field]: value }
    
    // If updating the min of a tier, update the max of the previous tier
    if (field === 'min' && index > 0 && value) {
      newTiers[index - 1].max = value - 1
    }
    // If updating the max of a tier, update the min of the next tier
    if (field === 'max' && value && index < tiers.length - 1) {
      newTiers[index + 1].min = value + 1
    }
    
    setTiers(newTiers)
  }
  
  const addTier = () => {
    if (tiers.length >= 10) {
      setError('Maximum 10 tiers allowed')
      return
    }
    
    const lastTier = tiers[tiers.length - 1]
    const newMin = lastTier.max ? lastTier.max + 1 : lastTier.min + 10
    
    // Update the last tier to have a max value
    const updatedTiers = [...tiers]
    updatedTiers[updatedTiers.length - 1].max = newMin - 1
    
    // Add new tier with no max (unlimited)
    setTiers([...updatedTiers, { min: newMin, max: null, percentage: 50 }])
    setError('')
  }
  
  const removeTier = (index: number) => {
    if (tiers.length <= 1) {
      setError('At least one tier is required')
      return
    }
    
    const newTiers = tiers.filter((_, i) => i !== index)
    
    // If removing the last tier, make the new last tier unlimited
    if (index === tiers.length - 1 && newTiers.length > 0) {
      newTiers[newTiers.length - 1].max = null
    }
    
    setTiers(newTiers)
    setError('')
  }

  return (
    <Card className="p-8 md:p-10">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
          <DollarSign className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          How do you calculate trainer commissions?
        </h2>
        <p className="text-text-secondary">
          Set up your commission structure
        </p>
      </div>

      <div className="space-y-4">
        {/* Flat Rate Option */}
        <label className="block">
          <div className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-background-secondary transition-colors">
            <input
              type="radio"
              name="method"
              value="FLAT"
              checked={method === 'FLAT'}
              onChange={(e) => setMethod('FLAT')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium mb-1">Flat rate</div>
              <div className="text-sm text-text-secondary mb-2">
                Same commission percentage for all sessions
              </div>
              {method === 'FLAT' && (
                <div className="flex items-center gap-2 mt-3">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={flatRate}
                    onChange={(e) => setFlatRate(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    onBlur={(e) => {
                      if (e.target.value === '') {
                        setFlatRate(0)
                      }
                    }}
                    className="w-20"
                  />
                  <span className="text-sm">% of session value</span>
                </div>
              )}
            </div>
          </div>
        </label>

        {/* Progressive Tiers Option */}
        <label className="block">
          <div className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-background-secondary transition-colors">
            <input
              type="radio"
              name="method"
              value="PROGRESSIVE"
              checked={method === 'PROGRESSIVE'}
              onChange={(e) => setMethod('PROGRESSIVE')}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium mb-1 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Progressive tiers (Recommended)
              </div>
              <div className="text-sm text-text-secondary mb-2">
                Higher commissions as trainers complete more sessions
              </div>
              {method === 'PROGRESSIVE' && (
                <div className="space-y-3 mt-3">
                  {tiers.map((tier, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-background rounded-lg">
                      <Input
                        type="number"
                        min="1"
                        value={tier.min}
                        onChange={(e) => updateTier(index, 'min', e.target.value === '' ? '' : parseInt(e.target.value) || 1)}
                        onBlur={(e) => {
                          if (e.target.value === '') {
                            updateTier(index, 'min', 1)
                          }
                        }}
                        className="w-20"
                        placeholder="Min"
                      />
                      <span className="text-sm">-</span>
                      {index === tiers.length - 1 ? (
                        <span className="w-20 text-center text-sm font-medium">∞</span>
                      ) : (
                        <Input
                          type="number"
                          min={tier.min + 1}
                          value={tier.max || ''}
                          onChange={(e) => updateTier(index, 'max', e.target.value === '' ? null : parseInt(e.target.value))}
                          onBlur={(e) => {
                            if (e.target.value === '') {
                              updateTier(index, 'max', tier.min + 10)
                            }
                          }}
                          className="w-20"
                          placeholder="Max"
                        />
                      )}
                      <span className="text-sm">sessions:</span>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={tier.percentage}
                        onChange={(e) => updateTier(index, 'percentage', e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                        onBlur={(e) => {
                          if (e.target.value === '') {
                            updateTier(index, 'percentage', 0)
                          }
                        }}
                        className="w-20"
                        placeholder="%"
                      />
                      <span className="text-sm">%</span>
                      {tiers.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTier(index)}
                          className="p-1 h-8 w-8"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {tiers.length < 10 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTier}
                      className="mt-2"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Tier
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </label>

        {/* Custom Option (Disabled) */}
        <label className="block opacity-50">
          <div className="flex items-start gap-3 p-4 border rounded-lg">
            <input
              type="radio"
              name="method"
              value="CUSTOM"
              disabled
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium mb-1">Custom per trainer</div>
              <div className="text-sm text-text-secondary">
                Set different rates for each trainer (Coming soon)
              </div>
            </div>
          </div>
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-md">
          <p className="text-sm text-error-600">{error}</p>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end mt-6">
        <Button
          onClick={handleSaveCommissions}
          disabled={isLoading}
          size="lg"
          className="min-w-[150px]"
        >
          {isLoading ? 'Saving...' : 'Continue →'}
        </Button>
      </div>
    </Card>
  )
}