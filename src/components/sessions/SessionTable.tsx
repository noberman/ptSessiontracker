'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface Session {
  id: string
  sessionDate: string
  sessionValue: number
  validated: boolean
  validatedAt?: string | null
  validationExpiry?: string | null
  notes?: string | null
  client: {
    name: string
    email: string
  }
  trainer: {
    name: string
    email: string
  }
  package?: {
    name: string
    packageType: string
  } | null
  location?: {
    name: string
  } | null
}

interface SessionTableProps {
  sessions: Session[]
  currentUserRole: string
}

export function SessionTable({ sessions, currentUserRole }: SessionTableProps) {
  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set())

  const handleResendValidation = async (sessionId: string) => {
    setResendingIds(prev => new Set(prev).add(sessionId))
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/resend-validation`, {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (response.ok) {
        alert(`Validation email resent successfully to ${data.message}`)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      alert('Failed to resend validation email')
    } finally {
      setResendingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(sessionId)
        return newSet
      })
    }
  }

  const canResendValidation = (session: Session) => {
    // Can't resend if already validated or expired
    if (session.validated) return false
    
    // Check role permissions
    return ['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER', 'TRAINER'].includes(currentUserRole)
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead>
          <tr className="bg-background-secondary">
            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Client
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Trainer
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Package
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Location
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Value
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sessions.map((session) => {
            const isExpired = session.validationExpiry && new Date(session.validationExpiry) < new Date()
            const daysLeft = session.validationExpiry 
              ? Math.ceil((new Date(session.validationExpiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
              : 0
            
            return (
              <tr key={session.id} className="hover:bg-background-secondary">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm text-text-primary">
                      {new Date(session.sessionDate).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {new Date(session.sessionDate).toLocaleTimeString()}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      {session.client.name}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {session.client.email}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm text-text-primary">
                      {session.trainer.name}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {session.package ? (
                    <div>
                      <div className="text-sm text-text-primary">
                        {session.package.name}
                      </div>
                      <Badge variant="gray" size="xs" className="mt-1">
                        {session.package.packageType}
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-sm text-text-secondary">No package</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-text-primary">
                    {session.location?.name || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-text-primary">
                    ${session.sessionValue?.toFixed(2) || '0.00'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {session.validated ? (
                    <div className="flex flex-col space-y-1">
                      <Badge variant="success" size="sm">
                        ✅ Validated
                      </Badge>
                      {session.validatedAt && (
                        <span className="text-xs text-text-secondary">
                          {new Date(session.validatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ) : isExpired ? (
                    <Badge variant="error" size="sm">
                      ❌ Expired
                    </Badge>
                  ) : (
                    <div className="flex flex-col space-y-1">
                      <Badge variant="warning" size="sm">
                        ⏳ Pending
                      </Badge>
                      {session.validationExpiry && daysLeft > 0 && (
                        <span className="text-xs text-text-secondary">
                          {daysLeft}d left
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex space-x-2">
                    <Link href={`/sessions/${session.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                    {!session.validated && !isExpired && canResendValidation(session) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendValidation(session.id)}
                        disabled={resendingIds.has(session.id)}
                      >
                        {resendingIds.has(session.id) ? 'Sending...' : 'Resend Email'}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
          {sessions.length === 0 && (
            <tr>
              <td colSpan={8} className="px-6 py-8 text-center text-text-secondary">
                No sessions found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}