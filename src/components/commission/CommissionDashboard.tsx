'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
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
          <CardTitle className="text-lg">
            {method === 'PROGRESSIVE' ? 'Progressive' : 'Graduated'} Tier Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {tiers.map((tier, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-background-secondary rounded">
                <span className="font-medium">
                  Tier {index + 1}: {tier.minSessions}-{tier.maxSessions || '+'} sessions
                </span>
                <Badge variant="secondary">{tier.percentage}%</Badge>
              </div>
            ))}
          </div>
          {method === 'PROGRESSIVE' && (
            <p className="text-xs text-text-secondary mt-2">
              * Achieved tier rate applies to ALL sessions
            </p>
          )}
          {method === 'GRADUATED' && (
            <p className="text-xs text-text-secondary mt-2">
              * Different rates apply per bracket (like tax brackets)
            </p>
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