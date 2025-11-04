'use client'

import { X, Calendar, User, Package, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface Session {
  id: string
  clientName: string
  sessionDate: string
  validated: boolean
  packageName?: string
}

interface SessionDetailsPanelProps {
  isOpen: boolean
  onClose: () => void
  trainerName: string
  sessionValue: number
  sessions: Session[]
}

export function SessionDetailsPanel({
  isOpen,
  onClose,
  trainerName,
  sessionValue,
  sessions
}: SessionDetailsPanelProps) {
  if (!isOpen) return null

  const formatDate = (dateString: string) => {
    // Treat the date string as local time, not UTC
    // If it doesn't end with 'Z', append local timezone offset
    const date = dateString.endsWith('Z') 
      ? new Date(dateString) 
      : new Date(dateString + 'Z') // Treat as UTC to prevent double conversion
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  // Group sessions by month for better organization
  const sessionsByMonth = sessions.reduce((acc, session) => {
    const date = new Date(session.sessionDate)
    const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    
    if (!acc[monthKey]) {
      acc[monthKey] = []
    }
    acc[monthKey].push(session)
    return acc
  }, {} as Record<string, Session[]>)

  const validatedCount = sessions.filter(s => s.validated).length
  const validationRate = sessions.length > 0 ? Math.round((validatedCount / sessions.length) * 100) : 0

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[60] transition-opacity"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-background shadow-xl z-[70] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-surface border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                Session Details
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                {trainerName} • {formatCurrency(sessionValue)}/session
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-background-secondary border-b">
          <div>
            <p className="text-sm text-text-secondary">Total Sessions</p>
            <p className="text-2xl font-bold text-text-primary">{sessions.length}</p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Total Value</p>
            <p className="text-2xl font-bold text-text-primary">
              {formatCurrency(sessions.length * sessionValue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Validation Rate</p>
            <p className="text-2xl font-bold text-text-primary">{validationRate}%</p>
            <p className="text-xs text-text-secondary">
              {validatedCount} of {sessions.length} validated
            </p>
          </div>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {Object.entries(sessionsByMonth)
              .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
              .map(([month, monthSessions]) => (
                <div key={month}>
                  <h3 className="text-sm font-medium text-text-secondary mb-3 sticky top-0 bg-background py-2">
                    {month} ({monthSessions.length} sessions)
                  </h3>
                  <div className="space-y-2">
                    {monthSessions
                      .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
                      .map((session) => (
                        <div
                          key={session.id}
                          className="bg-surface rounded-lg p-4 hover:bg-surface-hover transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-3">
                                <User className="w-4 h-4 text-text-secondary" />
                                <span className="font-medium text-text-primary">
                                  {session.clientName}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-3">
                                <Calendar className="w-4 h-4 text-text-secondary" />
                                <span className="text-sm text-text-secondary">
                                  {formatDate(session.sessionDate)}
                                </span>
                              </div>
                              
                              {session.packageName && (
                                <div className="flex items-center space-x-3">
                                  <Package className="w-4 h-4 text-text-secondary" />
                                  <span className="text-sm text-text-secondary">
                                    {session.packageName}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <Badge 
                              variant={session.validated ? 'success' : 'warning'}
                              size="sm"
                              className="flex items-center"
                            >
                              {session.validated ? (
                                <>
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Validated
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Pending
                                </>
                              )}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  )
}