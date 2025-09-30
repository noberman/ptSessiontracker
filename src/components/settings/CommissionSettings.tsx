'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'
import { Info, Plus, Trash2, Calculator } from 'lucide-react'

interface CommissionTier {
  id: string
  organizationId: string
  tierNumber: number
  minSessions: number
  maxSessions: number | null
  commissionPercentage: number
  createdAt: string
  updatedAt: string
}

type CalculationMethod = 'PROGRESSIVE' | 'GRADUATED'

export function CommissionSettings() {
  const [tiers, setTiers] = useState<CommissionTier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editedTiers, setEditedTiers] = useState<CommissionTier[]>([])
  const [calculationMethod, setCalculationMethod] = useState<CalculationMethod>('PROGRESSIVE')
  const [originalMethod, setOriginalMethod] = useState<CalculationMethod>('PROGRESSIVE')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      // Fetch commission tiers
      const tiersResponse = await fetch('/api/commission-tiers')
      if (tiersResponse.ok) {
        const tiersData = await tiersResponse.json()
        // Map percentage field to commissionPercentage for the component
        const mappedTiers = tiersData.map((tier: any) => ({
          ...tier,
          commissionPercentage: tier.percentage || tier.commissionPercentage
        }))
        setTiers(mappedTiers)
        setEditedTiers(mappedTiers)
      }

      // Fetch calculation method
      const methodResponse = await fetch('/api/commission/method')
      if (methodResponse.ok) {
        const methodData = await methodResponse.json()
        setCalculationMethod(methodData.method)
        setOriginalMethod(methodData.method)
      }
    } catch (error) {
      console.error('Error fetching commission settings:', error)
      toast.error('Failed to load commission settings')
    } finally {
      setLoading(false)
    }
  }

  const handleTierChange = (index: number, field: string, value: any) => {
    const updated = [...editedTiers]
    updated[index] = {
      ...updated[index],
      [field]: field === 'commissionPercentage' ? parseFloat(value) / 100 : parseInt(value)
    }
    setEditedTiers(updated)
  }

  const handleSave = async () => {
    setSaving(true)
    
    try {
      // Save tiers
      const tiersResponse = await fetch('/api/commission-tiers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedTiers),
      })

      if (!tiersResponse.ok) {
        const error = await tiersResponse.json()
        throw new Error(error.error || 'Failed to update tiers')
      }

      // Save calculation method if changed
      if (calculationMethod !== originalMethod) {
        const methodResponse = await fetch('/api/commission/method', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ method: calculationMethod }),
        })

        if (!methodResponse.ok) {
          const error = await methodResponse.json()
          throw new Error(error.error || 'Failed to update calculation method')
        }
        setOriginalMethod(calculationMethod)
      }

      const data = await tiersResponse.json()
      // Map percentage field to commissionPercentage for the component
      const mappedData = data.map((tier: any) => ({
        ...tier,
        commissionPercentage: tier.percentage || tier.commissionPercentage
      }))
      setTiers(mappedData)
      setEditedTiers(mappedData)
      toast.success('Commission settings updated successfully')
    } catch (error: any) {
      console.error('Error updating commission settings:', error)
      toast.error(error.message || 'Failed to update commission settings')
    } finally {
      setSaving(false)
    }
  }

  const addTier = () => {
    const newTier: CommissionTier = {
      id: `new-${Date.now()}`,
      organizationId: '',
      tierNumber: editedTiers.length + 1,
      minSessions: editedTiers.length > 0 
        ? (editedTiers[editedTiers.length - 1].maxSessions || 0) + 1 
        : 1,
      maxSessions: null,
      commissionPercentage: 0.5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setEditedTiers([...editedTiers, newTier])
  }

  const removeTier = (index: number) => {
    setEditedTiers(editedTiers.filter((_, i) => i !== index))
  }

  const hasChanges = () => {
    return JSON.stringify(tiers) !== JSON.stringify(editedTiers) || 
           calculationMethod !== originalMethod
  }

  if (loading) {
    return <div>Loading commission settings...</div>
  }

  return (
    <div className="space-y-6">
      {/* Calculation Method */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculation Method
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            Choose how commission rates are applied to sessions
          </p>
        </div>

        <div className="space-y-4">
          <label className="flex items-start gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-background-secondary transition-colors">
            <input
              type="radio"
              name="method"
              value="PROGRESSIVE"
              checked={calculationMethod === 'PROGRESSIVE'}
              onChange={(e) => setCalculationMethod(e.target.value as CalculationMethod)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-text-primary">Progressive</div>
              <div className="text-sm text-text-secondary mt-1">
                The achieved tier rate applies to ALL sessions in the month.
                If a trainer reaches Tier 3 (40%), all their sessions that month earn 40%.
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Example: 25 sessions at Tier 3 (40%) = 25 × session value × 40%
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 border border-border rounded-lg cursor-pointer hover:bg-background-secondary transition-colors">
            <input
              type="radio"
              name="method"
              value="GRADUATED"
              checked={calculationMethod === 'GRADUATED'}
              onChange={(e) => setCalculationMethod(e.target.value as CalculationMethod)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-text-primary">Graduated</div>
              <div className="text-sm text-text-secondary mt-1">
                Different rates apply per bracket (like tax brackets).
                First 10 sessions at 25%, next 10 at 30%, etc.
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Example: 25 sessions = (10 × 25%) + (10 × 30%) + (5 × 35%)
              </div>
            </div>
          </label>
        </div>
      </Card>

      {/* Commission Tiers */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Commission Tiers</h3>
          <p className="text-sm text-text-secondary mt-1">
            Configure commission percentages based on monthly session counts
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">How Commission Tiers Work:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
                <li>Tiers reset at the beginning of each month</li>
                <li>Only validated sessions count toward tier progression</li>
                <li>Higher tiers = higher commission percentages</li>
                <li>Trainers automatically progress through tiers as they complete more sessions</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {editedTiers.map((tier, index) => (
            <div key={tier.id} className="flex items-center gap-4 p-4 border border-border rounded-lg">
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Min Sessions
                  </label>
                  <input
                    type="number"
                    value={tier.minSessions}
                    onChange={(e) => handleTierChange(index, 'minSessions', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Max Sessions
                  </label>
                  <input
                    type="number"
                    value={tier.maxSessions || ''}
                    onChange={(e) => handleTierChange(index, 'maxSessions', e.target.value || null)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary"
                    placeholder="Unlimited"
                    min={tier.minSessions + 1}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Commission %
                  </label>
                  <input
                    type="number"
                    value={tier.commissionPercentage * 100}
                    onChange={(e) => handleTierChange(index, 'commissionPercentage', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary"
                    min="0"
                    max="100"
                    step="0.5"
                  />
                </div>
              </div>
              
              {editedTiers.length > 1 && (
                <Button
                  onClick={() => removeTier(index)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-6">
          <Button onClick={addTier} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Tier
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setEditedTiers(tiers)
                setCalculationMethod(originalMethod)
              }}
              variant="outline"
              disabled={saving || !hasChanges()}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges()}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}