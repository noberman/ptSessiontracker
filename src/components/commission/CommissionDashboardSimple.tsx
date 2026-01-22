'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SearchableMultiSelect } from '@/components/ui/SearchableMultiSelect'
import React from 'react'

// Updated interface to match v2 data structure
interface TrainerCommission {
  trainerId: string
  trainerName: string
  totalSessions: number
  totalValue: number
  commissionAmount: number
  tierReached?: number
  profileName?: string
  breakdown?: {
    sessionCommission: number
    salesCommission: number
    tierBonus: number
  }
  trainerEmail?: string
  commissionRate?: number
  tiersApplied?: any[]
}

interface CommissionDashboardProps {
  commissions: TrainerCommission[]
  totals: {
    totalSessions: number
    totalValue: number
    totalCommission: number
    trainerCount: number
  }
  month: string
  locations: Array<{ id: string; name: string }>
  selectedLocationIds?: string[]
  currentUserRole: string
}

export function CommissionDashboard({
  commissions,
  totals,
  month,
  locations,
  selectedLocationIds = [],
  currentUserRole
}: CommissionDashboardProps) {
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)
  const [expandedTrainer, setExpandedTrainer] = useState<string | null>(null)
  const [selectedLocations, setSelectedLocations] = useState<string[]>(selectedLocationIds)
  
  const handleMonthChange = (newMonth: string) => {
    const params = new URLSearchParams()
    params.set('month', newMonth)
    if (selectedLocations.length > 0) params.set('locationIds', selectedLocations.join(','))
    router.push(`/commission?${params.toString()}`)
  }
  
  const handleLocationChange = (locationIds: string[]) => {
    setSelectedLocations(locationIds)
    const params = new URLSearchParams()
    params.set('month', month)
    // Send all selected locations as comma-separated string
    if (locationIds.length > 0) params.set('locationIds', locationIds.join(','))
    router.push(`/commission?${params.toString()}`)
  }
  
  const handleExport = async () => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams()
      params.set('month', month)
      if (selectedLocations.length > 0) params.set('locationIds', selectedLocations.join(','))
      
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
  
  const formatCurrency = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  
  return (
    <>
      {/* Filters - Moved to top */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Month selector */}
            <div>
              <label className="text-sm text-text-secondary mr-2">Month:</label>
              <input
                type="month"
                value={month}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="rounded-lg border border-border px-3 py-2"
              />
            </div>
            
            {/* Location filter */}
            {locations.length > 0 && (currentUserRole === 'ADMIN' || currentUserRole === 'PT_MANAGER') && (
              <div className="min-w-[200px]">
                <label className="text-sm text-text-secondary block mb-1">Location:</label>
                <SearchableMultiSelect
                  options={locations.map(loc => ({
                    value: loc.id,
                    label: loc.name
                  }))}
                  value={selectedLocations}
                  onChange={handleLocationChange}
                  placeholder="All Locations"
                  searchPlaceholder="Search locations..."
                />
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
      
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-text-primary">
              {totals.trainerCount}
            </div>
            <p className="text-sm text-text-secondary mt-1">Active Trainers</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-text-primary">
              {totals.totalSessions}
            </div>
            <p className="text-sm text-text-secondary mt-1">Total Sessions</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-text-primary">
              {formatCurrency(totals.totalValue)}
            </div>
            <p className="text-sm text-text-secondary mt-1">Session Value</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-text-primary">
              {formatCurrency(totals.totalCommission)}
            </div>
            <p className="text-sm text-text-secondary mt-1">Total Commission</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Commission Table */}
      <Card>
        <CardHeader>
          <CardTitle>Trainer Commissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr className="text-left text-sm text-text-secondary">
                  <th className="pb-3 font-medium">Trainer</th>
                  <th className="pb-3 font-medium text-center">Sessions</th>
                  <th className="pb-3 font-medium text-center">Tier</th>
                  <th className="pb-3 font-medium text-right">Session Value</th>
                  <th className="pb-3 font-medium text-right">Commission</th>
                </tr>
              </thead>
              <tbody>
                {commissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-text-secondary">
                      No commission data for the selected period
                    </td>
                  </tr>
                ) : (
                  commissions.map((commission) => (
                    <React.Fragment key={commission.trainerId}>
                      <tr 
                        className="border-b border-border hover:bg-background-secondary cursor-pointer"
                        onClick={() => setExpandedTrainer(
                          expandedTrainer === commission.trainerId ? null : commission.trainerId
                        )}
                      >
                        <td className="py-4">
                          <div className="font-medium text-text-primary">{commission.trainerName}</div>
                          <div className="text-xs text-text-secondary">{commission.trainerEmail}</div>
                        </td>
                        <td className="py-4 text-center">
                          <Badge>{commission.totalSessions}</Badge>
                        </td>
                        <td className="py-4 text-center">
                          <Badge variant="secondary">Tier {commission.tierReached || 1}</Badge>
                        </td>
                        <td className="py-4 text-right text-text-primary">
                          {formatCurrency(commission.totalValue)}
                        </td>
                        <td className="py-4 text-right font-semibold text-text-primary">
                          {formatCurrency(commission.commissionAmount)}
                        </td>
                      </tr>
                      
                      {/* Expanded Details */}
                      {expandedTrainer === commission.trainerId && commission.breakdown && (
                        <tr>
                          <td colSpan={5} className="p-4 bg-background-secondary">
                            <div className="space-y-3">
                              <div className="text-sm font-medium text-text-primary mb-2">
                                Commission Breakdown:
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-text-secondary mb-1">Profile</p>
                                  <p className="font-medium">{commission.profileName || 'Default'}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-text-secondary mb-1">Tier Reached</p>
                                  <p className="font-medium">Tier {commission.tierReached || 1}</p>
                                </div>
                              </div>
                              
                              <div className="border-t pt-3 space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-text-secondary">Session Commission:</span>
                                  <span className="font-medium text-text-primary">
                                    {formatCurrency(commission.breakdown.sessionCommission)}
                                  </span>
                                </div>
                                {commission.breakdown.salesCommission > 0 && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-text-secondary">Sales Commission:</span>
                                    <span className="font-medium text-text-primary">
                                      {formatCurrency(commission.breakdown.salesCommission)}
                                    </span>
                                  </div>
                                )}
                                {commission.breakdown.tierBonus > 0 && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-text-secondary">Tier Bonus:</span>
                                    <span className="font-medium text-success-600">
                                      {formatCurrency(commission.breakdown.tierBonus)}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm pt-2 border-t">
                                  <span className="font-medium text-text-primary">Total Commission:</span>
                                  <span className="font-bold text-text-primary">
                                    {formatCurrency(commission.commissionAmount)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

