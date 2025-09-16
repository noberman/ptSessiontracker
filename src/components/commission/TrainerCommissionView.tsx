'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { CommissionMethod, TrainerCommission, CommissionTier } from '@/lib/commission/calculator'

interface TrainerCommissionViewProps {
  commission: TrainerCommission | null
  month: string
  method: CommissionMethod
  tiers: CommissionTier[]
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
    router.push(`/my-commission?month=${newMonth}&method=${method}`)
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
  
  // Calculate progress to next tier (for progressive method)
  let nextTier: CommissionTier | null = null
  let currentTierIndex = -1
  let sessionsToNextTier = 0
  
  if (method === 'PROGRESSIVE' && commission.tierAchieved) {
    currentTierIndex = tiers.findIndex(t => t.minSessions === commission.tierAchieved?.minSessions)
    if (currentTierIndex < tiers.length - 1) {
      nextTier = tiers[currentTierIndex + 1]
      sessionsToNextTier = nextTier.minSessions - commission.totalSessions
    }
  }
  
  const progressPercentage = nextTier 
    ? ((commission.totalSessions - (commission.tierAchieved?.minSessions || 0)) / 
       (nextTier.minSessions - (commission.tierAchieved?.minSessions || 0))) * 100
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
              <div className="text-sm text-text-secondary">Calculation Method</div>
              <div className="mt-1 font-medium">
                {method === 'PROGRESSIVE' ? 'Progressive Tier' : 'Graduated Tier'}
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
            {commission.validatedSessions < commission.totalSessions && (
              <div className="text-xs text-warning-600 mt-2">
                {commission.totalSessions - commission.validatedSessions} pending validation
              </div>
            )}
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
            <div className="text-xs text-primary-600 mt-2">
              {commission.commissionRate.toFixed(1)}% rate
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tier Progress (Progressive only) */}
      {method === 'PROGRESSIVE' && commission.tierAchieved && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tier Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    Current Tier: {currentTierIndex + 1}
                  </div>
                  <div className="text-sm text-text-secondary">
                    {commission.tierAchieved.minSessions}-{commission.tierAchieved.maxSessions || '+'} sessions 
                    ({commission.tierAchieved.percentage}% commission)
                  </div>
                </div>
                {nextTier && (
                  <Badge variant="secondary">
                    {sessionsToNextTier} sessions to Tier {currentTierIndex + 2}
                  </Badge>
                )}
              </div>
              
              {nextTier && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress to next tier</span>
                      <span>{Math.round(progressPercentage)}%</span>
                    </div>
                    <div className="w-full bg-background-secondary rounded-full h-3">
                      <div 
                        className="bg-primary-500 h-3 rounded-full transition-all"
                        style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="p-3 bg-background-secondary rounded-lg">
                    <p className="text-sm">
                      💡 Complete <strong>{sessionsToNextTier} more sessions</strong> to reach Tier {currentTierIndex + 2} 
                      and earn <strong>{nextTier.percentage}%</strong> commission on ALL your sessions this month!
                    </p>
                  </div>
                </>
              )}
              
              {!nextTier && (
                <div className="p-3 bg-success-50 rounded-lg">
                  <p className="text-sm text-success-700">
                    🎉 You&apos;ve reached the highest tier! Keep up the great work!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Tier Breakdown (Graduated only) */}
      {method === 'GRADUATED' && commission.tiersApplied && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Commission Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {commission.tiersApplied.map((tier, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-background-secondary rounded">
                  <div>
                    <div className="font-medium">
                      Tier {index + 1}: {tier.sessions} sessions
                    </div>
                    <div className="text-sm text-text-secondary">
                      {tier.tier.minSessions}-{tier.tier.maxSessions || '+'} sessions @ {tier.tier.percentage}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(tier.commission)}</div>
                    <div className="text-sm text-text-secondary">
                      from {formatCurrency(tier.value)}
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-3 flex justify-between font-medium">
                <span>Total Commission:</span>
                <span className="text-primary-600">{formatCurrency(commission.commissionAmount)}</span>
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
      
      {/* Tier Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Commission Tiers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {tiers.map((tier, index) => {
              const isCurrentTier = commission.tierAchieved && 
                tier.minSessions === commission.tierAchieved.minSessions
              
              return (
                <div 
                  key={index}
                  className={`p-3 rounded-lg border ${
                    isCurrentTier 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-border bg-background-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Tier {index + 1}</div>
                      <div className="text-sm text-text-secondary">
                        {tier.minSessions}-{tier.maxSessions || '+'} sessions
                      </div>
                    </div>
                    <Badge variant={isCurrentTier ? 'primary' : 'secondary'}>
                      {tier.percentage}%
                    </Badge>
                  </div>
                  {isCurrentTier && (
                    <div className="text-xs text-primary-600 mt-1">Current</div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Add Button component if not already imported
function Button({ children, onClick, size = 'md', variant = 'primary', ...props }: any) {
  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3'
  }
  
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700',
    outline: 'border border-border hover:bg-background-secondary'
  }
  
  return (
    <button
      onClick={onClick}
      className={`rounded-lg font-medium transition-colors ${sizeClasses[size]} ${variantClasses[variant]}`}
      {...props}
    >
      {children}
    </button>
  )
}