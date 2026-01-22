'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SearchableMultiSelect } from '@/components/ui/SearchableMultiSelect'
import { SessionDetailsPanel } from '@/components/dashboard/SessionDetailsPanel'
import { ChevronDown, ChevronRight, Eye } from 'lucide-react'
import React from 'react'

// Session interface for the details panel
interface Session {
  id: string
  clientName: string
  sessionDate: string
  createdAt?: string
  validated: boolean
  packageName?: string
  locationName?: string
}

// Session group interface
interface SessionGroup {
  sessionValue: number
  count: number
  totalValue: number
  sessions: Session[]
}

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
  orgTimezone?: string
}

export function CommissionDashboard({
  commissions,
  totals,
  month,
  locations,
  selectedLocationIds = [],
  currentUserRole,
  orgTimezone = 'Asia/Singapore'
}: CommissionDashboardProps) {
  const router = useRouter()
  const [isExporting, setIsExporting] = useState(false)
  const [expandedTrainer, setExpandedTrainer] = useState<string | null>(null)
  const [selectedLocations, setSelectedLocations] = useState<string[]>(selectedLocationIds)

  // State for session details
  const [trainerDetails, setTrainerDetails] = useState<Map<string, SessionGroup[]>>(new Map())
  const [loadingTrainers, setLoadingTrainers] = useState<Set<string>>(new Set())

  // State for session details panel
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false)
  const [selectedTrainerName, setSelectedTrainerName] = useState('')
  const [selectedSessionValue, setSelectedSessionValue] = useState(0)
  const [selectedSessions, setSelectedSessions] = useState<Session[]>([])

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

  // Fetch trainer session details grouped by value
  const fetchTrainerDetails = async (trainerId: string) => {
    try {
      // Parse month to get date range
      const [year, monthNum] = month.split('-').map(Number)
      const startDate = new Date(year, monthNum - 1, 1)
      const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999)

      let url = `/api/trainers/${trainerId}/sessions?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`

      // Add location filter if selected
      if (selectedLocations.length > 0) {
        url += `&locationIds=${selectedLocations.join(',')}`
      }

      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch trainer details')

      return await response.json()
    } catch (error) {
      console.error('Error fetching trainer details:', error)
      return []
    }
  }

  // Handle trainer row click to expand/collapse
  const handleTrainerClick = async (trainerId: string) => {
    if (expandedTrainer === trainerId) {
      setExpandedTrainer(null)
      return
    }

    setExpandedTrainer(trainerId)

    // Fetch details if not already loaded
    if (!trainerDetails.has(trainerId)) {
      setLoadingTrainers(prev => new Set(prev).add(trainerId))
      try {
        const details = await fetchTrainerDetails(trainerId)
        setTrainerDetails(prev => new Map(prev).set(trainerId, details))
      } catch (error) {
        console.error('Failed to fetch trainer details:', error)
      } finally {
        setLoadingTrainers(prev => {
          const next = new Set(prev)
          next.delete(trainerId)
          return next
        })
      }
    }
  }

  // Handle View Details click
  const handleViewDetails = (trainerName: string, sessionValue: number, sessions: Session[]) => {
    setSelectedTrainerName(trainerName)
    setSelectedSessionValue(sessionValue)
    setSelectedSessions(sessions)
    setDetailsPanelOpen(true)
  }

  // Calculate commission for a session group (proportional based on total)
  const calculateGroupCommission = (
    commission: TrainerCommission,
    groupTotalValue: number
  ) => {
    if (!commission.breakdown || commission.totalValue === 0) return 0
    // Proportional commission based on value contribution
    const proportion = groupTotalValue / commission.totalValue
    return commission.breakdown.sessionCommission * proportion
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
                    <td colSpan={5} className="py-8 text-center text-text-secondary">
                      No commission data for the selected period
                    </td>
                  </tr>
                ) : (
                  commissions.map((commission) => {
                    const isExpanded = expandedTrainer === commission.trainerId
                    const isLoading = loadingTrainers.has(commission.trainerId)
                    const details = trainerDetails.get(commission.trainerId)

                    return (
                      <React.Fragment key={commission.trainerId}>
                        <tr
                          className="border-b border-border hover:bg-background-secondary cursor-pointer"
                          onClick={() => handleTrainerClick(commission.trainerId)}
                        >
                          <td className="py-4">
                            <div className="flex items-center">
                              <button className="mr-2 p-1">
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-text-secondary" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-text-secondary" />
                                )}
                              </button>
                              <div>
                                <div className="font-medium text-text-primary">{commission.trainerName}</div>
                                <div className="text-xs text-text-secondary">{commission.trainerEmail}</div>
                              </div>
                            </div>
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
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="p-4 bg-background-secondary">
                              {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {/* Sessions by Value Type */}
                                  {details && details.length > 0 && (
                                    <div>
                                      <p className="text-sm font-medium text-text-primary mb-3">
                                        Sessions by Rate
                                      </p>
                                      <div className="overflow-x-auto">
                                        <table className="w-full">
                                          <thead>
                                            <tr className="text-left text-xs text-text-secondary border-b border-border">
                                              <th className="pb-2 font-medium">Session Rate</th>
                                              <th className="pb-2 font-medium text-center">Count</th>
                                              <th className="pb-2 font-medium text-right">Total Value</th>
                                              <th className="pb-2 font-medium text-right">Commission</th>
                                              <th className="pb-2 font-medium text-right">Action</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {details.map((group) => {
                                              const groupCommission = calculateGroupCommission(commission, group.totalValue)
                                              return (
                                                <tr key={group.sessionValue} className="border-b border-border/50">
                                                  <td className="py-3">
                                                    <span className="font-medium text-text-primary">
                                                      {formatCurrency(group.sessionValue)}/session
                                                    </span>
                                                  </td>
                                                  <td className="py-3 text-center">
                                                    <Badge variant="default" size="sm">
                                                      {group.count}
                                                    </Badge>
                                                  </td>
                                                  <td className="py-3 text-right text-text-primary">
                                                    {formatCurrency(group.totalValue)}
                                                  </td>
                                                  <td className="py-3 text-right text-text-primary">
                                                    {formatCurrency(groupCommission)}
                                                  </td>
                                                  <td className="py-3 text-right">
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleViewDetails(
                                                          commission.trainerName,
                                                          group.sessionValue,
                                                          group.sessions
                                                        )
                                                      }}
                                                      className="flex items-center ml-auto"
                                                    >
                                                      <Eye className="w-4 h-4 mr-1" />
                                                      View Details
                                                    </Button>
                                                  </td>
                                                </tr>
                                              )
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}

                                  {/* Commission Breakdown */}
                                  {commission.breakdown && (
                                    <div className="border-t pt-4">
                                      <p className="text-sm font-medium text-text-primary mb-3">
                                        Commission Summary
                                      </p>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                          <p className="text-xs text-text-secondary mb-1">Profile</p>
                                          <p className="font-medium">{commission.profileName || 'Default'}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-text-secondary mb-1">Tier Reached</p>
                                          <p className="font-medium">Tier {commission.tierReached || 1}</p>
                                        </div>
                                      </div>

                                      <div className="bg-background rounded-lg p-4 space-y-2">
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

                                        {/* Calculation Overview */}
                                        <div className="pt-3 mt-2 border-t border-border/50">
                                          <p className="text-xs font-medium text-text-secondary mb-2">Calculation Overview</p>
                                          <div className="space-y-1 text-xs text-text-secondary">
                                            <p>
                                              Session Commission: {formatCurrency(commission.totalValue)} × {commission.totalValue > 0 ? ((commission.breakdown.sessionCommission / commission.totalValue) * 100).toFixed(1) : 0}% (Tier {commission.tierReached || 1} rate) = {formatCurrency(commission.breakdown.sessionCommission)}
                                            </p>
                                            {commission.breakdown.salesCommission > 0 && (
                                              <p>
                                                Sales Commission: Package sales = {formatCurrency(commission.breakdown.salesCommission)}
                                              </p>
                                            )}
                                            {commission.breakdown.tierBonus > 0 && (
                                              <p>
                                                Tier Bonus: Tier {commission.tierReached || 1} bonus = {formatCurrency(commission.breakdown.tierBonus)}
                                              </p>
                                            )}
                                            <p className="font-medium text-text-primary">
                                              Total: {formatCurrency(commission.breakdown.sessionCommission)}
                                              {commission.breakdown.salesCommission > 0 && ` + ${formatCurrency(commission.breakdown.salesCommission)}`}
                                              {commission.breakdown.tierBonus > 0 && ` + ${formatCurrency(commission.breakdown.tierBonus)}`}
                                              {' '}= {formatCurrency(commission.commissionAmount)}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Session Details Panel */}
      <SessionDetailsPanel
        isOpen={detailsPanelOpen}
        onClose={() => setDetailsPanelOpen(false)}
        trainerName={selectedTrainerName}
        sessionValue={selectedSessionValue}
        sessions={selectedSessions}
        orgTimezone={orgTimezone}
      />
    </>
  )
}
