'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface Session {
  id: string
  clientName: string
  sessionDate: string
  validated: boolean
  packageName?: string
}

interface SessionGroup {
  sessionValue: number
  count: number
  totalValue: number
  sessions: Session[]
}

interface TrainerData {
  trainerId: string
  trainerName: string
  trainerEmail: string
  totalSessions: number
  totalValue: number
  sessionGroups: SessionGroup[]
}

interface TrainerPerformanceTableProps {
  trainers: Array<{
    trainer: {
      id: string
      name: string
      email: string
    } | null
    sessionCount: number
    totalValue: number
  }>
  onViewDetails: (trainerId: string, sessionValue: number, sessions: Session[]) => void
  onFetchTrainerDetails: (trainerId: string) => Promise<SessionGroup[]>
}

export function TrainerPerformanceTable({ 
  trainers, 
  onViewDetails, 
  onFetchTrainerDetails 
}: TrainerPerformanceTableProps) {
  const [expandedTrainers, setExpandedTrainers] = useState<Set<string>>(new Set())
  const [trainerDetails, setTrainerDetails] = useState<Map<string, SessionGroup[]>>(new Map())
  const [loadingTrainers, setLoadingTrainers] = useState<Set<string>>(new Set())

  const toggleTrainerExpansion = async (trainerId: string) => {
    const newExpanded = new Set(expandedTrainers)
    
    if (newExpanded.has(trainerId)) {
      newExpanded.delete(trainerId)
    } else {
      newExpanded.add(trainerId)
      
      // Fetch details if not already loaded
      if (!trainerDetails.has(trainerId)) {
        setLoadingTrainers(prev => new Set(prev).add(trainerId))
        try {
          const details = await onFetchTrainerDetails(trainerId)
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
    
    setExpandedTrainers(newExpanded)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (trainers.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary">
        No trainer data available for this period
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 text-sm font-medium text-text-secondary">
              Trainer
            </th>
            <th className="text-right py-2 px-3 text-sm font-medium text-text-secondary">
              Sessions
            </th>
            <th className="text-right py-2 px-3 text-sm font-medium text-text-secondary">
              Total Value
            </th>
            <th className="text-right py-2 px-3 text-sm font-medium text-text-secondary">
              Avg per Session
            </th>
          </tr>
        </thead>
        <tbody>
          {trainers.map(({ trainer, sessionCount, totalValue }) => {
            if (!trainer) return null
            const isExpanded = expandedTrainers.has(trainer.id)
            const isLoading = loadingTrainers.has(trainer.id)
            const details = trainerDetails.get(trainer.id)
            
            return (
              <React.Fragment key={trainer.id}>
                <tr 
                  className="border-b hover:bg-background-secondary cursor-pointer transition-colors"
                  onClick={() => toggleTrainerExpansion(trainer.id)}
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center">
                      <button className="mr-2 p-1">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-text-secondary" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-text-secondary" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-text-primary">{trainer.name}</p>
                        </div>
                        <p className="text-sm text-text-secondary">{trainer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-right py-3 px-3 text-text-primary">
                    {sessionCount}
                  </td>
                  <td className="text-right py-3 px-3 text-text-primary font-medium">
                    {formatCurrency(totalValue)}
                  </td>
                  <td className="text-right py-3 px-3 text-text-secondary">
                    {formatCurrency(totalValue / sessionCount)}
                  </td>
                </tr>
                
                {isExpanded && (
                  <tr>
                    <td colSpan={4} className="bg-background-secondary p-4">
                      {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                        </div>
                      ) : details ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-text-secondary mb-3">
                            Sessions by Value
                          </p>
                          {details.map((group) => (
                            <div 
                              key={group.sessionValue}
                              className="flex items-center justify-between bg-background rounded-lg p-3"
                            >
                              <div className="flex items-center space-x-4">
                                <div>
                                  <p className="font-medium text-text-primary">
                                    {formatCurrency(group.sessionValue)}/session
                                  </p>
                                  <p className="text-sm text-text-secondary">
                                    {group.count} {group.count === 1 ? 'session' : 'sessions'}
                                  </p>
                                </div>
                                <Badge variant="default" size="sm">
                                  {formatCurrency(group.totalValue)}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onViewDetails(trainer.id, group.sessionValue, group.sessions)
                                }}
                                className="flex items-center"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-text-secondary py-4">
                          No session details available
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}