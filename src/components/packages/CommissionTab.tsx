'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'
import { Info } from 'lucide-react'

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

export function CommissionTab() {
  const [tiers, setTiers] = useState<CommissionTier[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editedTiers, setEditedTiers] = useState<CommissionTier[]>([])

  useEffect(() => {
    fetchTiers()
  }, [])

  const fetchTiers = async () => {
    try {
      const response = await fetch('/api/commission-tiers')
      if (response.ok) {
        const data = await response.json()
        setTiers(data)
        setEditedTiers(data)
      } else {
        toast.error('Failed to load commission tiers')
      }
    } catch (error) {
      console.error('Error fetching commission tiers:', error)
      toast.error('Failed to load commission tiers')
    } finally {
      setLoading(false)
    }
  }

  const handleTierChange = (index: number, field: string, value: any) => {
    const updated = [...editedTiers]
    updated[index] = {
      ...updated[index],
      [field]: field === 'commissionPercentage' ? parseFloat(value) : parseInt(value)
    }
    setEditedTiers(updated)
  }

  const handleSave = async () => {
    setSaving(true)
    
    try {
      const response = await fetch('/api/commission-tiers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedTiers),
      })

      if (response.ok) {
        const data = await response.json()
        setTiers(data)
        setEditedTiers(data)
        toast.success('Commission tiers updated successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update commission tiers')
      }
    } catch (error) {
      console.error('Error updating commission tiers:', error)
      toast.error('Failed to update commission tiers')
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
      commissionPercentage: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setEditedTiers([...editedTiers, newTier])
  }

  const removeTier = (index: number) => {
    setEditedTiers(editedTiers.filter((_, i) => i !== index))
  }

  if (loading) {
    return <div>Loading commission tiers...</div>
  }

  return (
    <div className="space-y-6">
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
                    value={tier.commissionPercentage}
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
                  Remove
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-6">
          <Button onClick={addTier} variant="outline">
            Add Tier
          </Button>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setEditedTiers(tiers)}
              variant="outline"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || JSON.stringify(tiers) === JSON.stringify(editedTiers)}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}