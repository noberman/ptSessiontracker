'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { format } from 'date-fns'

// Updated interface to match v2 commission structure
interface CommissionData {
  trainerId: string
  trainerName: string
  totalSessions: number
  totalValue: number
  commissionAmount: number
  tierReached?: number
  breakdown?: {
    sessionCommission: number
    salesCommission: number
    tierBonus: number
  }
  profileName?: string
  calculationMethod?: string
}

interface TrainerCommissionViewProps {
  commission: CommissionData | null
  month: string
  method: string
  tiers: Array<{
    minSessions: number
    maxSessions: number | null
    percentage: number
    flatFee?: number | null
    tierBonus?: number | null
    tierLevel?: number
  }>
  recentSessions: Array<{
    id: string
    sessionDate: string
    clientName: string
    packageName: string
    sessionValue: number
    validated: boolean
  }>
}

export function TrainerCommissionView({
  commission,
  month,
  method,
  tiers,
  recentSessions
}: TrainerCommissionViewProps) {
  const router = useRouter()
  const [showDetails, setShowDetails] = useState(false)
  
  const handleMonthChange = (newMonth: string) => {
    router.push(`/my-commission?month=${newMonth}`)
  }
  
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`
  
  if (!commission) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-text-secondary">No commission data available for this period.</p>
        </CardContent>
      </Card>
    )
  }
  
  // Calculate progress to next tier
  const currentTier = commission.tierReached || 1
  const nextTierData = tiers.find(t => (t.tierLevel || 1) === currentTier + 1)
  const currentTierData = tiers.find(t => (t.tierLevel || 1) === currentTier)
  
  const sessionsToNextTier = nextTierData && nextTierData.minSessions 
    ? Math.max(0, nextTierData.minSessions - commission.totalSessions)
    : 0
  
  const progressPercentage = nextTierData && currentTierData
    ? Math.min(100, ((commission.totalSessions - currentTierData.minSessions) / 
       (nextTierData.minSessions - currentTierData.minSessions)) * 100)
    : 100
  
  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm text-text-secondary">Commission Period</label>
              <div className="mt-1">
                <input
                  type="month"
                  value={month}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="rounded-lg border border-border px-3 py-2"
                />
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-text-secondary">Profile</div>
              <div className="mt-1 font-medium">
                {commission.profileName || 'Default'}
              </div>
              <div className="text-xs text-text-secondary mt-1">
                {commission.calculationMethod || method}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Commission Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold">{commission.totalSessions}</div>
            <div className="text-sm text-text-secondary mt-1">Sessions Completed</div>
            <div className="text-xs text-primary-600 mt-2">
              Tier {currentTier}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold">{formatCurrency(commission.totalValue)}</div>
            <div className="text-sm text-text-secondary mt-1">Total Session Value</div>
          </CardContent>
        </Card>
        
        <Card className="border-primary-500 bg-primary-50">
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-primary-600">
              {formatCurrency(commission.commissionAmount)}
            </div>
            <div className="text-sm text-text-secondary mt-1">Your Commission</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tier Progress */}
      {nextTierData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tier Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-text-secondary">
                    Current: Tier {currentTier}
                  </span>
                  <span className="text-sm text-text-secondary">
                    Next: Tier {currentTier + 1}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  />
                </div>
                <div className="mt-2 text-sm text-text-secondary">
                  {sessionsToNextTier} more sessions to reach Tier {currentTier + 1}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Validated Sessions</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          </div>
        </CardHeader>
        {showDetails && (
          <CardContent>
            <div className="space-y-2">
              {recentSessions.map(session => (
                <div key={session.id} className="flex items-center justify-between p-2 hover:bg-background-secondary rounded">
                  <div>
                    <div className="font-medium">{session.clientName}</div>
                    <div className="text-sm text-text-secondary">
                      {format(new Date(session.sessionDate), 'MMM d, yyyy')} • {session.packageName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(session.sessionValue)}</div>
                    {session.validated && (
                      <Badge variant="success" size="xs">Validated</Badge>
                    )}
                  </div>
                </div>
              ))}
              
              {recentSessions.length === 0 && (
                <p className="text-center text-text-secondary py-4">
                  No validated sessions this month yet.
                </p>
              )}
              
              <div className="pt-2 text-center">
                <a 
                  href={`/sessions?trainerId=${commission.trainerId}&month=${month}`}
                  className="text-sm text-primary-600 hover:underline"
                >
                  View all sessions →
                </a>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
      
      {/* Commission Breakdown - Moved to bottom */}
      {commission.breakdown && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Commission Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-background-secondary rounded">
                <span className="text-sm">Session Commission</span>
                <span className="font-medium">{formatCurrency(commission.breakdown.sessionCommission)}</span>
              </div>
              
              {commission.breakdown.salesCommission > 0 && (
                <div className="flex justify-between p-3 bg-background-secondary rounded">
                  <span className="text-sm">Sales Commission</span>
                  <span className="font-medium">{formatCurrency(commission.breakdown.salesCommission)}</span>
                </div>
              )}
              
              {commission.breakdown.tierBonus > 0 && (
                <div className="flex justify-between p-3 bg-success-50 rounded">
                  <span className="text-sm text-success-700">Tier Bonus</span>
                  <span className="font-medium text-success-700">{formatCurrency(commission.breakdown.tierBonus)}</span>
                </div>
              )}
              
              <div className="border-t pt-3 flex justify-between font-medium">
                <span>Total Commission:</span>
                <span className="text-primary-600">{formatCurrency(commission.commissionAmount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}