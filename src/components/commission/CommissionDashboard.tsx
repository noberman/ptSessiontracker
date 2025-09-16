'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Pencil, Plus, Trash2, Save, X } from 'lucide-react'
import { CommissionMethod, TrainerCommission, CommissionTier } from '@/lib/commission/calculator'

interface CommissionDashboardProps {
  commissions: TrainerCommission[]
  totals: {
    totalSessions: number
    totalValue: number
    totalCommission: number
    trainerCount: number
  }
  month: string
  method: CommissionMethod
  tiers: CommissionTier[]
  locations: Array<{ id: string; name: string }>
  selectedLocationId?: string
  currentUserRole: string
}

export function CommissionDashboard({
  commissions,
  totals,
  month,
  method,
  tiers,
  locations,
  selectedLocationId,
  currentUserRole
}: CommissionDashboardProps) {
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)
  const [expandedTrainer, setExpandedTrainer] = useState<string | null>(null)
  const [isEditingTiers, setIsEditingTiers] = useState(false)
  const [editableTiers, setEditableTiers] = useState<CommissionTier[]>(tiers)
  const [isSavingTiers, setIsSavingTiers] = useState(false)
  
  const handleMonthChange = (newMonth: string) => {
    const params = new URLSearchParams()
    params.set('month', newMonth)
    if (selectedLocationId) params.set('locationId', selectedLocationId)
    params.set('method', method)
    router.push(`/commission?${params.toString()}`)
  }
  
  const handleMethodChange = (newMethod: CommissionMethod) => {
    const params = new URLSearchParams()
    params.set('month', month)
    if (selectedLocationId) params.set('locationId', selectedLocationId)
    params.set('method', newMethod)
    router.push(`/commission?${params.toString()}`)
  }
  
  const handleLocationChange = (locationId: string) => {
    const params = new URLSearchParams()
    params.set('month', month)
    if (locationId !== 'all') params.set('locationId', locationId)
    params.set('method', method)
    router.push(`/commission?${params.toString()}`)
  }
  
  const handleExport = async () => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      params.set('month', month)
      if (selectedLocationId) params.set('locationId', selectedLocationId)
      params.set('method', method)
      
      const response = await fetch(`/api/commission/export?${params.toString()}`)
      if (!response.ok) throw new Error('Export failed')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `commission-report-${month}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export commission report')
    } finally {
      setIsExporting(false)
    }
  }
  
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
  
  const handleEditTiers = () => {
    setIsEditingTiers(true)
    setEditableTiers([...tiers])
  }
  
  const handleCancelEdit = () => {
    setIsEditingTiers(false)
    setEditableTiers(tiers)
  }
  
  const handleAddTier = () => {
    const lastTier = editableTiers[editableTiers.length - 1]
    const newMinSessions = lastTier ? (lastTier.maxSessions || lastTier.minSessions) + 1 : 0
    setEditableTiers([
      ...editableTiers,
      {
        minSessions: newMinSessions,
        maxSessions: null,
        percentage: 25
      }
    ])
  }
  
  const handleRemoveTier = (index: number) => {
    setEditableTiers(editableTiers.filter((_, i) => i !== index))
  }
  
  const handleTierChange = (index: number, field: keyof CommissionTier, value: any) => {
    const newTiers = [...editableTiers]
    if (field === 'minSessions' || field === 'maxSessions') {
      newTiers[index][field] = value === '' ? null : parseInt(value)
    } else if (field === 'percentage') {
      newTiers[index][field] = value === '' ? 0 : parseFloat(value)
    }
    setEditableTiers(newTiers)
  }
  
  const handleSaveTiers = async () => {
    setIsSavingTiers(true)
    try {
      const response = await fetch('/api/commission/tiers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tiers: editableTiers })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save tiers')
      }
      
      setIsEditingTiers(false)
      // Refresh the page to get updated calculations
      router.refresh()
    } catch (error) {
      console.error('Failed to save tiers:', error)
      alert('Failed to save commission tiers. Please try again.')
    } finally {
      setIsSavingTiers(false)
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Month selector */}
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="rounded-lg border border-border px-3 py-2"
              />
            </div>
            
            {/* Method selector */}
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Calculation Method</label>
              <select
                value={method}
                onChange={(e) => handleMethodChange(e.target.value as CommissionMethod)}
                className="rounded-lg border border-border px-3 py-2"
              >
                <option value="PROGRESSIVE">Progressive Tier (All at achieved rate)</option>
                <option value="GRADUATED">Graduated Tier (Different per bracket)</option>
              </select>
            </div>
            
            {/* Location filter (if applicable) */}
            {locations.length > 0 && (
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Location</label>
                <select
                  value={selectedLocationId || 'all'}
                  onChange={(e) => handleLocationChange(e.target.value)}
                  className="rounded-lg border border-border px-3 py-2"
                >
                  <option value="all">All Locations</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Export button */}
            <div className="ml-auto">
              <Button
                onClick={handleExport}
                disabled={isExporting}
                variant="primary"
              >
                {isExporting ? 'Exporting...' : 'Export to Excel'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Current Tier Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {method === 'PROGRESSIVE' ? 'Progressive' : 'Graduated'} Tier Configuration
            </CardTitle>
            {(currentUserRole === 'ADMIN' || currentUserRole === 'PT_MANAGER') && (
              <div>
                {!isEditingTiers ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEditTiers}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit Tiers
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleSaveTiers}
                      disabled={isSavingTiers}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {isSavingTiers ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={isSavingTiers}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!isEditingTiers ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {tiers.map((tier, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-background-secondary rounded">
                    <span className="font-medium">
                      Tier {index + 1}: {tier.minSessions}-{tier.maxSessions || '+'} sessions
                    </span>
                    <Badge variant="secondary">{tier.percentage}%</Badge>
                  </div>
                ))}
              </div>
              {method === 'PROGRESSIVE' && (
                <p className="text-xs text-text-secondary mt-3">
                  * Achieved tier rate applies to ALL sessions
                </p>
              )}
              {method === 'GRADUATED' && (
                <p className="text-xs text-text-secondary mt-3">
                  * Different rates apply per bracket (like tax brackets)
                </p>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {editableTiers.map((tier, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-background-secondary rounded">
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-text-secondary">Min Sessions</label>
                        <Input
                          type="number"
                          value={tier.minSessions}
                          onChange={(e) => handleTierChange(index, 'minSessions', e.target.value)}
                          min="0"
                          className="mt-1"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-text-secondary">Max Sessions</label>
                        <Input
                          type="number"
                          value={tier.maxSessions || ''}
                          onChange={(e) => handleTierChange(index, 'maxSessions', e.target.value)}
                          min={tier.minSessions + 1}
                          className="mt-1"
                          placeholder="No limit"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-text-secondary">Commission %</label>
                        <Input
                          type="number"
                          value={tier.percentage}
                          onChange={(e) => handleTierChange(index, 'percentage', e.target.value)}
                          min="0"
                          max="100"
                          step="0.5"
                          className="mt-1"
                          placeholder="25"
                        />
                      </div>
                    </div>
                    {editableTiers.length > 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveTier(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddTier}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Tier
              </Button>
              <p className="text-xs text-text-secondary">
                {method === 'PROGRESSIVE' 
                  ? '* The achieved tier rate will apply to ALL sessions'
                  : '* Different rates will apply per bracket (like tax brackets)'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totals.trainerCount}</div>
            <div className="text-sm text-text-secondary">Active Trainers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totals.totalSessions}</div>
            <div className="text-sm text-text-secondary">Total Sessions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{formatCurrency(totals.totalValue)}</div>
            <div className="text-sm text-text-secondary">Total Value</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary-600">
              {formatCurrency(totals.totalCommission)}
            </div>
            <div className="text-sm text-text-secondary">Total Commission</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Commission Table */}
      <Card>
        <CardHeader>
          <CardTitle>Trainer Commissions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-secondary border-b border-border">
                <tr>
                  <th className="text-left p-4 text-sm font-medium">Trainer</th>
                  <th className="text-center p-4 text-sm font-medium">Location</th>
                  <th className="text-center p-4 text-sm font-medium">Sessions</th>
                  <th className="text-center p-4 text-sm font-medium">
                    {method === 'PROGRESSIVE' ? 'Tier Achieved' : 'Effective Rate'}
                  </th>
                  <th className="text-right p-4 text-sm font-medium">Total Value</th>
                  <th className="text-right p-4 text-sm font-medium">Commission</th>
                  <th className="text-center p-4 text-sm font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((commission) => (
                  <>
                    <tr key={commission.trainerId} className="border-b border-border hover:bg-background-secondary">
                      <td className="p-4">
                        <div>
                          <div className="font-medium">{commission.trainerName}</div>
                          <div className="text-sm text-text-secondary">{commission.trainerEmail}</div>
                        </div>
                      </td>
                      <td className="p-4 text-center text-sm">
                        {commission.locationName || 'N/A'}
                      </td>
                      <td className="p-4 text-center">
                        <div>{commission.totalSessions}</div>
                        <div className="text-xs text-text-secondary">
                          {commission.validatedSessions} validated
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {method === 'PROGRESSIVE' && commission.tierAchieved ? (
                          <div>
                            <Badge variant="secondary">
                              Tier {tiers.findIndex(t => t.minSessions === commission.tierAchieved?.minSessions) + 1}
                            </Badge>
                            <div className="text-xs text-text-secondary mt-1">
                              {commission.tierAchieved.percentage}%
                            </div>
                          </div>
                        ) : (
                          <div>
                            <Badge variant="secondary">
                              {commission.commissionRate.toFixed(1)}%
                            </Badge>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right font-medium">
                        {formatCurrency(commission.totalValue)}
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-bold text-primary-600">
                          {formatCurrency(commission.commissionAmount)}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExpandedTrainer(
                            expandedTrainer === commission.trainerId ? null : commission.trainerId
                          )}
                        >
                          {expandedTrainer === commission.trainerId ? 'Hide' : 'Show'}
                        </Button>
                      </td>
                    </tr>
                    
                    {/* Expanded details for Graduated tier */}
                    {expandedTrainer === commission.trainerId && method === 'GRADUATED' && commission.tiersApplied && (
                      <tr>
                        <td colSpan={7} className="p-4 bg-background-secondary">
                          <div className="space-y-2">
                            <div className="text-sm font-medium mb-2">Tier Breakdown:</div>
                            {commission.tiersApplied.map((tier, index) => (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span>
                                  Tier {index + 1}: {tier.sessions} sessions × {tier.tier.percentage}%
                                </span>
                                <span>
                                  {formatCurrency(tier.value)} → {formatCurrency(tier.commission)}
                                </span>
                              </div>
                            ))}
                            <div className="border-t pt-2 flex justify-between font-medium">
                              <span>Total:</span>
                              <span>{formatCurrency(commission.commissionAmount)}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
                
                {commissions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-text-secondary">
                      No commission data for this period
                    </td>
                  </tr>
                )}
              </tbody>
              
              {/* Totals row */}
              {commissions.length > 0 && (
                <tfoot className="bg-background-secondary border-t-2 border-border">
                  <tr>
                    <td className="p-4 font-bold">TOTAL</td>
                    <td className="p-4 text-center text-sm">{totals.trainerCount} trainers</td>
                    <td className="p-4 text-center font-bold">{totals.totalSessions}</td>
                    <td className="p-4"></td>
                    <td className="p-4 text-right font-bold">{formatCurrency(totals.totalValue)}</td>
                    <td className="p-4 text-right font-bold text-primary-600">
                      {formatCurrency(totals.totalCommission)}
                    </td>
                    <td className="p-4"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}