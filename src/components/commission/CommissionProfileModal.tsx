'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { 
  Plus, 
  Trash2, 
  DollarSign,
  Percent,
  TrendingUp,
  Package,
  Gift,
  Calculator,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface CommissionTier {
  id?: string
  tierLevel: number
  sessionThreshold: number | null
  salesThreshold: number | null
  sessionCommissionPercent: number | null
  sessionFlatFee: number | null
  salesCommissionPercent: number | null
  salesFlatFee: number | null
  tierBonus: number | null
}

interface CommissionProfile {
  id?: string
  name: string
  isDefault: boolean
  isActive?: boolean
  calculationMethod: 'PROGRESSIVE' | 'GRADUATED' | 'FLAT'
  triggerType: 'NONE' | 'SESSION_COUNT' | 'SALES_VOLUME' | 'EITHER_OR' | 'BOTH_AND'
  tiers: CommissionTier[]
  _count?: {
    users: number
  }
}

interface CommissionProfileModalProps {
  profile: CommissionProfile | null
  onClose: () => void
}

export function CommissionProfileModal({ profile, onClose }: CommissionProfileModalProps) {
  const [formData, setFormData] = useState<CommissionProfile>({
    name: '',
    isDefault: false,
    calculationMethod: 'PROGRESSIVE',
    triggerType: 'SESSION_COUNT',
    tiers: [
      {
        tierLevel: 1,
        sessionThreshold: null,
        salesThreshold: null,
        sessionCommissionPercent: null,
        sessionFlatFee: null,
        salesCommissionPercent: null,
        salesFlatFee: null,
        tierBonus: null
      }
    ]
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sessionRewardType, setSessionRewardType] = useState<'none' | 'percent' | 'flat'>('percent')
  const [salesRewardType, setSalesRewardType] = useState<'none' | 'percent' | 'flat'>('none')
  
  // Test Calculator State
  const [showTestCalculator, setShowTestCalculator] = useState(false)
  const [testScenario, setTestScenario] = useState<{
    sessions: number | string,
    sessionValue: number | string,
    packagesSold: number | string,
    packageValue: number | string
  }>({
    sessions: 15,
    sessionValue: 100,
    packagesSold: 2,
    packageValue: 1500
  })
  const [testResults, setTestResults] = useState<{
    tierReached: number
    sessionCommission: number
    salesCommission: number
    tierBonus: number
    totalCommission: number
    breakdown: string[]
  } | null>(null)

  useEffect(() => {
    if (profile) {
      setFormData(profile)
      // Determine reward types from existing data
      if (profile.tiers[0]) {
        if (profile.tiers[0].sessionFlatFee !== null) {
          setSessionRewardType('flat')
        } else if (profile.tiers[0].sessionCommissionPercent !== null) {
          setSessionRewardType('percent')
        } else {
          setSessionRewardType('none')
        }
        
        if (profile.tiers[0].salesFlatFee !== null) {
          setSalesRewardType('flat')
        } else if (profile.tiers[0].salesCommissionPercent !== null) {
          setSalesRewardType('percent')
        } else {
          setSalesRewardType('none')
        }
      }
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      // Clean up tiers based on reward types
      const cleanedTiers = formData.tiers.map(tier => ({
        ...tier,
        sessionCommissionPercent: sessionRewardType === 'percent' ? tier.sessionCommissionPercent : null,
        sessionFlatFee: sessionRewardType === 'flat' ? tier.sessionFlatFee : null,
        salesCommissionPercent: salesRewardType === 'percent' ? tier.salesCommissionPercent : null,
        salesFlatFee: salesRewardType === 'flat' ? tier.salesFlatFee : null
      }))

      const dataToSend = {
        ...formData,
        tiers: cleanedTiers
      }

      const url = profile?.id 
        ? `/api/commission/profiles/${profile.id}`
        : '/api/commission/profiles'
      
      const method = profile?.id ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      })

      if (response.ok) {
        onClose()
      } else {
        const error = await response.json()
        if (error.details) {
          const newErrors: Record<string, string> = {}
          error.details.forEach((detail: any) => {
            newErrors[detail.path.join('.')] = detail.message
          })
          setErrors(newErrors)
        } else {
          setErrors({ general: error.error || 'Failed to save profile' })
        }
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      setErrors({ general: 'Failed to save profile' })
    } finally {
      setLoading(false)
    }
  }

  const addTier = () => {
    const newTierLevel = formData.tiers.length + 1
    setFormData({
      ...formData,
      tiers: [
        ...formData.tiers,
        {
          tierLevel: newTierLevel,
          sessionThreshold: null,
          salesThreshold: null,
          sessionCommissionPercent: sessionRewardType === 'percent' ? null : null,
          sessionFlatFee: sessionRewardType === 'flat' ? null : null,
          salesCommissionPercent: salesRewardType === 'percent' ? null : null,
          salesFlatFee: salesRewardType === 'flat' ? null : null,
          tierBonus: null
        }
      ]
    })
  }

  const removeTier = (index: number) => {
    const newTiers = formData.tiers.filter((_, i) => i !== index)
    // Renumber tier levels
    const renumberedTiers = newTiers.map((tier, i) => ({
      ...tier,
      tierLevel: i + 1
    }))
    setFormData({
      ...formData,
      tiers: renumberedTiers
    })
  }

  const updateTier = (index: number, field: keyof CommissionTier, value: any) => {
    const newTiers = [...formData.tiers]
    // Handle empty string as null, but allow 0 as a valid value
    let processedValue = value
    if (value === '' || value === undefined || (typeof value === 'number' && isNaN(value))) {
      processedValue = null
    }
    newTiers[index] = {
      ...newTiers[index],
      [field]: processedValue
    }
    setFormData({
      ...formData,
      tiers: newTiers
    })
  }

  // Calculate test commission
  const calculateTestCommission = () => {
    if (formData.tiers.length === 0) {
      alert('Please add at least one tier to test')
      return
    }

    const breakdown: string[] = []
    let tierReached = 0
    let sessionCommission = 0
    let salesCommission = 0
    let tierBonus = 0

    const sessions = typeof testScenario.sessions === 'string' ? parseInt(testScenario.sessions) || 0 : testScenario.sessions
    const sessionValue = typeof testScenario.sessionValue === 'string' ? parseFloat(testScenario.sessionValue) || 0 : testScenario.sessionValue
    const packagesSold = typeof testScenario.packagesSold === 'string' ? parseInt(testScenario.packagesSold) || 0 : testScenario.packagesSold
    const packageValue = typeof testScenario.packageValue === 'string' ? parseFloat(testScenario.packageValue) || 0 : testScenario.packageValue
    
    const totalSalesVolume = packagesSold * packageValue
    const totalSessionValue = sessions * sessionValue

    breakdown.push(`📊 Test Scenario:`)
    breakdown.push(`  • ${sessions} sessions @ $${sessionValue} = $${totalSessionValue}`)
    breakdown.push(`  • ${packagesSold} packages @ $${packageValue} = $${totalSalesVolume}`)
    breakdown.push(`  • Calculation Method: ${formData.calculationMethod}`)
    breakdown.push('')

    // Evaluate tiers based on calculation method
    if (formData.calculationMethod === 'PROGRESSIVE') {
      // Progressive: Use highest tier reached
      breakdown.push('🎯 Progressive Calculation:')
      
      for (let i = formData.tiers.length - 1; i >= 0; i--) {
        const tier = formData.tiers[i]
        const tierNum = i + 1
        let triggered = false

        // Check trigger conditions based on profile's triggerType
        switch (formData.triggerType) {
          case 'SESSION_COUNT':
            triggered = sessions >= (tier.sessionThreshold || 0)
            break
          case 'SALES_VOLUME':
            triggered = totalSalesVolume >= (tier.salesThreshold || 0)
            break
          case 'EITHER_OR':
            triggered = sessions >= (tier.sessionThreshold || 0) || 
                       totalSalesVolume >= (tier.salesThreshold || 0)
            break
          case 'BOTH_AND':
            triggered = sessions >= (tier.sessionThreshold || 0) && 
                       totalSalesVolume >= (tier.salesThreshold || 0)
            break
          case 'NONE':
            triggered = true
            break
        }

        if (triggered) {
          tierReached = tierNum
          breakdown.push(`✅ Tier ${tierNum} REACHED`)
          
          if (tier.sessionFlatFee) {
            sessionCommission = sessions * tier.sessionFlatFee
            breakdown.push(`  → Session: $${tier.sessionFlatFee} × ${sessions} = $${sessionCommission}`)
          } else if (tier.sessionCommissionPercent) {
            sessionCommission = totalSessionValue * (tier.sessionCommissionPercent / 100)
            breakdown.push(`  → Session: ${tier.sessionCommissionPercent}% × $${totalSessionValue} = $${sessionCommission.toFixed(2)}`)
          }

          if (tier.salesFlatFee) {
            salesCommission = packagesSold * tier.salesFlatFee
            breakdown.push(`  → Sales: $${tier.salesFlatFee} × ${packagesSold} = $${salesCommission}`)
          } else if (tier.salesCommissionPercent) {
            salesCommission = totalSalesVolume * (tier.salesCommissionPercent / 100)
            breakdown.push(`  → Sales: ${tier.salesCommissionPercent}% × $${totalSalesVolume} = $${salesCommission.toFixed(2)}`)
          }

          if (tier.tierBonus) {
            tierBonus = tier.tierBonus
            breakdown.push(`  → Bonus: $${tier.tierBonus}`)
          }
          break // Stop at first (highest) tier reached
        }
      }
    } else if (formData.calculationMethod === 'GRADUATED') {
      // Graduated: Add up all triggered tiers
      breakdown.push('📈 Graduated Calculation:')
      
      formData.tiers.forEach((tier, i) => {
        const tierNum = i + 1
        let triggered = false

        switch (formData.triggerType) {
          case 'SESSION_COUNT':
            triggered = sessions >= (tier.sessionThreshold || 0)
            break
          case 'SALES_VOLUME':
            triggered = totalSalesVolume >= (tier.salesThreshold || 0)
            break
          case 'EITHER_OR':
            triggered = sessions >= (tier.sessionThreshold || 0) || 
                       totalSalesVolume >= (tier.salesThreshold || 0)
            break
          case 'BOTH_AND':
            triggered = sessions >= (tier.sessionThreshold || 0) && 
                       totalSalesVolume >= (tier.salesThreshold || 0)
            break
          case 'NONE':
            triggered = true
            break
        }

        if (triggered) {
          if (tierNum > tierReached) tierReached = tierNum
          breakdown.push(`✅ Tier ${tierNum} ACTIVE`)
          
          if (tier.sessionFlatFee) {
            const comm = sessions * tier.sessionFlatFee
            sessionCommission += comm
            breakdown.push(`  → Session: $${tier.sessionFlatFee} × ${sessions} = $${comm}`)
          } else if (tier.sessionCommissionPercent) {
            const comm = totalSessionValue * (tier.sessionCommissionPercent / 100)
            sessionCommission += comm
            breakdown.push(`  → Session: ${tier.sessionCommissionPercent}% × $${totalSessionValue} = $${comm.toFixed(2)}`)
          }

          if (tier.salesFlatFee) {
            const comm = packagesSold * tier.salesFlatFee
            salesCommission += comm
            breakdown.push(`  → Sales: $${tier.salesFlatFee} × ${packagesSold} = $${comm}`)
          } else if (tier.salesCommissionPercent) {
            const comm = totalSalesVolume * (tier.salesCommissionPercent / 100)
            salesCommission += comm
            breakdown.push(`  → Sales: ${tier.salesCommissionPercent}% × $${totalSalesVolume} = $${comm.toFixed(2)}`)
          }

          if (tier.tierBonus) {
            tierBonus += tier.tierBonus
            breakdown.push(`  → Bonus: $${tier.tierBonus}`)
          }
        }
      })
    } else {
      // Flat: Use tier 1 regardless
      const tier = formData.tiers[0]
      tierReached = 1
      breakdown.push('💰 Flat Rate Calculation (Tier 1):')
      
      if (tier.sessionFlatFee) {
        sessionCommission = sessions * tier.sessionFlatFee
        breakdown.push(`  → Session: $${tier.sessionFlatFee} × ${sessions} = $${sessionCommission}`)
      } else if (tier.sessionCommissionPercent) {
        sessionCommission = totalSessionValue * (tier.sessionCommissionPercent / 100)
        breakdown.push(`  → Session: ${tier.sessionCommissionPercent}% × $${totalSessionValue} = $${sessionCommission.toFixed(2)}`)
      }

      if (tier.salesFlatFee) {
        salesCommission = packagesSold * tier.salesFlatFee
        breakdown.push(`  → Sales: $${tier.salesFlatFee} × ${packagesSold} = $${salesCommission}`)
      } else if (tier.salesCommissionPercent) {
        salesCommission = totalSalesVolume * (tier.salesCommissionPercent / 100)
        breakdown.push(`  → Sales: ${tier.salesCommissionPercent}% × $${totalSalesVolume} = $${salesCommission.toFixed(2)}`)
      }
    }

    const totalCommission = sessionCommission + salesCommission + tierBonus

    setTestResults({
      tierReached,
      sessionCommission,
      salesCommission,
      tierBonus,
      totalCommission,
      breakdown
    })
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={profile ? 'Edit Commission Profile' : 'Create Commission Profile'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="bg-error-50 text-error-600 p-3 rounded-lg text-sm">
            {errors.general}
          </div>
        )}

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-text-primary">Basic Information</h3>
          
          <div>
            <Label htmlFor="name">Profile Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Standard Trainer, Elite Performer"
              required
            />
            {errors.name && <p className="text-sm text-error-600 mt-1">{errors.name}</p>}
          </div>


          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="calculationMethod">Calculation Method</Label>
              <Select
                id="calculationMethod"
                value={formData.calculationMethod}
                onChange={(e) => setFormData({ ...formData, calculationMethod: e.target.value as any })}
              >
                <option value="PROGRESSIVE">Progressive - All at highest tier</option>
                <option value="GRADUATED">Graduated - Each tier for its range</option>
                <option value="FLAT">Flat - Same rate for all</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="triggerType">Trigger Condition</Label>
              <Select
                id="triggerType"
                value={formData.triggerType}
                onChange={(e) => setFormData({ ...formData, triggerType: e.target.value as any })}
                disabled={formData.calculationMethod === 'FLAT'}
              >
                <option value="NONE">No Conditions (Base Rate)</option>
                <option value="SESSION_COUNT">Session Count</option>
                <option value="SALES_VOLUME">Sales Volume</option>
                <option value="EITHER_OR">Either Sessions OR Sales</option>
                <option value="BOTH_AND">Both Sessions AND Sales</option>
              </Select>
            </div>
          </div>

          <div className="flex items-start">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="rounded border-border"
              />
              <span className="text-sm text-text-primary">Set as default profile</span>
            </label>
          </div>
        </div>

        {/* Reward Type Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-text-primary">Commission Structure</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Session Commission Type</Label>
              <Select
                value={sessionRewardType}
                onChange={(e) => {
                  setSessionRewardType(e.target.value as any)
                  // Clear session reward values when changing type
                  const newTiers = formData.tiers.map(tier => ({
                    ...tier,
                    sessionCommissionPercent: null,
                    sessionFlatFee: null
                  }))
                  setFormData({ ...formData, tiers: newTiers })
                }}
              >
                <option value="none">No Session Commission</option>
                <option value="percent">Percentage of Session Value</option>
                <option value="flat">Flat Fee per Session</option>
              </Select>
            </div>

            <div>
              <Label>Sales Commission Type</Label>
              <Select
                value={salesRewardType}
                onChange={(e) => {
                  setSalesRewardType(e.target.value as any)
                  // Clear sales reward values when changing type
                  const newTiers = formData.tiers.map(tier => ({
                    ...tier,
                    salesCommissionPercent: null,
                    salesFlatFee: null
                  }))
                  setFormData({ ...formData, tiers: newTiers })
                }}
              >
                <option value="none">No Sales Commission</option>
                <option value="percent">Percentage of Package Value</option>
                <option value="flat">Flat Fee per Package</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Tiers */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-text-primary">Commission Tiers</h3>
            {formData.calculationMethod !== 'FLAT' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTier}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Tier
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {formData.tiers.map((tier, index) => (
              <div key={index} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-text-primary">
                    Tier {tier.tierLevel}
                  </h4>
                  {formData.tiers.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTier(index)}
                      className="text-error-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Trigger Thresholds */}
                {formData.calculationMethod !== 'FLAT' && formData.triggerType !== 'NONE' && (
                  <div className="grid grid-cols-2 gap-3">
                    {(formData.triggerType === 'SESSION_COUNT' || 
                      formData.triggerType === 'EITHER_OR' || 
                      formData.triggerType === 'BOTH_AND') && (
                      <div>
                        <Label>Session Threshold</Label>
                        <Input
                          type="number"
                          value={tier.sessionThreshold ?? ''}
                          onChange={(e) => updateTier(index, 'sessionThreshold', e.target.value === '' ? null : parseInt(e.target.value))}
                          placeholder="Min sessions to reach tier"
                          min="0"
                        />
                      </div>
                    )}

                    {(formData.triggerType === 'SALES_VOLUME' || 
                      formData.triggerType === 'EITHER_OR' || 
                      formData.triggerType === 'BOTH_AND') && (
                      <div>
                        <Label>Sales Threshold ($)</Label>
                        <Input
                          type="number"
                          value={tier.salesThreshold ?? ''}
                          onChange={(e) => updateTier(index, 'salesThreshold', e.target.value === '' ? null : parseFloat(e.target.value))}
                          placeholder="Min sales volume"
                          min="0"
                          step="100"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Rewards */}
                <div className="grid grid-cols-2 gap-3">
                  {sessionRewardType === 'percent' && (
                    <div>
                      <Label>Session Commission (%)</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={tier.sessionCommissionPercent ?? ''}
                          onChange={(e) => updateTier(index, 'sessionCommissionPercent', e.target.value === '' ? null : parseFloat(e.target.value))}
                          placeholder="e.g., 15"
                          min="0"
                          max="100"
                          step="0.1"
                          className="pr-8"
                        />
                        <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      </div>
                    </div>
                  )}

                  {sessionRewardType === 'flat' && (
                    <div>
                      <Label>Session Flat Fee ($)</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={tier.sessionFlatFee ?? ''}
                          onChange={(e) => updateTier(index, 'sessionFlatFee', e.target.value === '' ? null : parseFloat(e.target.value))}
                          placeholder="e.g., 50"
                          min="0"
                          step="1"
                          className="pl-8"
                        />
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      </div>
                    </div>
                  )}

                  {salesRewardType === 'percent' && (
                    <div>
                      <Label>Sales Commission (%)</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={tier.salesCommissionPercent ?? ''}
                          onChange={(e) => updateTier(index, 'salesCommissionPercent', e.target.value === '' ? null : parseFloat(e.target.value))}
                          placeholder="e.g., 10"
                          min="0"
                          max="100"
                          step="0.1"
                          className="pr-8"
                        />
                        <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      </div>
                    </div>
                  )}

                  {salesRewardType === 'flat' && (
                    <div>
                      <Label>Sales Flat Fee ($)</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={tier.salesFlatFee ?? ''}
                          onChange={(e) => updateTier(index, 'salesFlatFee', e.target.value === '' ? null : parseFloat(e.target.value))}
                          placeholder="e.g., 75"
                          min="0"
                          step="1"
                          className="pl-8"
                        />
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      </div>
                    </div>
                  )}

                  <div>
                    <Label>Tier Bonus ($)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={tier.tierBonus ?? ''}
                        onChange={(e) => updateTier(index, 'tierBonus', e.target.value === '' ? null : parseFloat(e.target.value))}
                        placeholder="One-time bonus"
                        min="0"
                        step="10"
                        className="pl-8"
                      />
                      <Gift className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test Calculator */}
        <div className="border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowTestCalculator(!showTestCalculator)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              <span className="font-medium">Test Calculator</span>
              <span className="text-sm text-text-tertiary">Preview commission calculations</span>
            </div>
            {showTestCalculator ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          {showTestCalculator && (
            <div className="mt-4 space-y-4 p-4 bg-surface-secondary rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Sessions</Label>
                  <Input
                    type="number"
                    value={testScenario.sessions}
                    onChange={(e) => setTestScenario({ ...testScenario, sessions: e.target.value })}
                    min="0"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Session Value ($)</Label>
                  <Input
                    type="number"
                    value={testScenario.sessionValue}
                    onChange={(e) => setTestScenario({ ...testScenario, sessionValue: e.target.value })}
                    min="0"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Packages Sold</Label>
                  <Input
                    type="number"
                    value={testScenario.packagesSold}
                    onChange={(e) => setTestScenario({ ...testScenario, packagesSold: e.target.value })}
                    min="0"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Package Value ($)</Label>
                  <Input
                    type="number"
                    value={testScenario.packageValue}
                    onChange={(e) => setTestScenario({ ...testScenario, packageValue: e.target.value })}
                    min="0"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={calculateTestCommission}
                variant="secondary"
                size="sm"
                className="w-full"
              >
                Calculate Commission
              </Button>

              {testResults && (
                <div className="space-y-3">
                  {/* Results Summary */}
                  <div className="p-3 bg-surface-primary rounded-lg border border-border">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-text-tertiary text-xs">Tier Reached</p>
                        <p className="font-semibold">{testResults.tierReached || 'None'}</p>
                      </div>
                      <div>
                        <p className="text-text-tertiary text-xs">Session</p>
                        <p className="font-semibold text-primary-600">${testResults.sessionCommission.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-text-tertiary text-xs">Sales</p>
                        <p className="font-semibold text-primary-600">${testResults.salesCommission.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-text-tertiary text-xs">Bonus</p>
                        <p className="font-semibold text-primary-600">${testResults.tierBonus.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-text-tertiary text-xs">Total</p>
                        <p className="font-bold text-success-600 text-lg">${testResults.totalCommission.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Calculation Breakdown */}
                  <div className="p-3 bg-surface-primary rounded-lg border border-border">
                    <p className="text-xs font-medium text-text-secondary mb-2">Calculation Breakdown</p>
                    <div className="space-y-1">
                      {testResults.breakdown.map((line, idx) => (
                        <p key={idx} className="text-xs font-mono text-text-tertiary whitespace-pre">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : profile ? 'Update Profile' : 'Create Profile'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}