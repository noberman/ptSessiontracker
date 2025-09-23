'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { PageSizeSelector } from '@/components/ui/PageSizeSelector'
import { Mail, RefreshCw } from 'lucide-react'

interface Session {
  id: string
  sessionDate: string | Date
  sessionValue: number
  validated: boolean
  validatedAt: string | Date | null
  cancelled: boolean
  cancelledAt?: string | Date | null
  trainer: {
    id: string
    name: string
    email: string
  }
  client: {
    id: string
    name: string
    email: string
  }
  location?: {
    id: string
    name: string
  } | null
  package?: {
    id: string
    name: string
  } | null
}

interface SessionTableProps {
  initialSessions: Session[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  canEdit?: boolean
  userRole?: string
  currentUserId?: string
}

export function SessionTable({ 
  initialSessions, 
  pagination: initialPagination,
  canEdit = false,
  userRole,
  currentUserId
}: SessionTableProps) {
  const [sessions, setSessions] = useState(initialSessions)
  const [pagination, setPagination] = useState(initialPagination)
  const [loading, setLoading] = useState(false)
  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set())
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Fetch sessions when page or limit changes
  const fetchSessions = async (targetPage: number, targetLimit?: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', String(targetPage))
      if (targetLimit) {
        params.set('limit', String(targetLimit))
      }
      
      const response = await fetch(`/api/sessions/list?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch sessions')
      
      const data = await response.json()
      setSessions(data.sessions)
      setPagination(data.pagination)
      
      // Update URL without page refresh
      router.push(`/sessions?${params.toString()}`, { scroll: false })
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePageSizeChange = (newLimit: number) => {
    // Reset to page 1 when changing page size
    fetchSessions(1, newLimit)
  }

  const handleResendValidation = async (sessionId: string, clientEmail: string) => {
    setResendingIds(prev => new Set(prev).add(sessionId))
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/resend-validation`, {
        method: 'POST',
      })
      
      if (response.ok) {
        alert(`Validation email sent successfully to ${clientEmail}!`)
        // Optionally refresh the sessions to update any status
        const currentParams = new URLSearchParams(searchParams.toString())
        fetchSessions(pagination.page)
      } else {
        const data = await response.json()
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

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getStatusBadge = (session: Session) => {
    if (session.cancelled) {
      return <Badge variant="gray" size="sm">Cancelled</Badge>
    }
    if (session.validated) {
      return <Badge variant="success" size="sm">Validated</Badge>
    }
    return <Badge variant="warning" size="sm">Pending</Badge>
  }

  // Check if user can resend validation for a specific session
  const canResendValidation = (session: Session) => {
    if (!userRole || !currentUserId) return false
    
    // Admins and PT Managers can resend for any session
    if (userRole === 'ADMIN' || userRole === 'PT_MANAGER') return true
    
    // Trainers can resend for their own sessions
    if (userRole === 'TRAINER' && session.trainer.id === currentUserId) return true
    
    // Club managers would need location check but we don't have location in session here
    // For now, we'll rely on backend to check this permission
    if (userRole === 'CLUB_MANAGER') return true
    
    return false
  }

  return (
    <Card padding="none">
      <div className="overflow-x-auto relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <div className="text-sm text-text-secondary">Loading...</div>
          </div>
        )}
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-background-secondary">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Trainer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Package
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Status
              </th>
              {canEdit && (
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border">
            {sessions.map((session) => (
              <tr key={session.id} className="hover:bg-surface-hover transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                  {formatDate(session.sessionDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-text-primary">
                    {session.trainer.name}
                  </div>
                  <div className="text-sm text-text-secondary">
                    {session.trainer.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-text-primary">
                    {session.client.name}
                  </div>
                  <div className="text-sm text-text-secondary">
                    {session.client.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                  {session.location?.name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                  {session.package?.name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                  {formatCurrency(session.sessionValue)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(session)}
                </td>
                {canEdit && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <Link href={`/sessions/${session.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                      {!session.validated && !session.cancelled && (
                        <>
                          <Link href={`/sessions/${session.id}/edit`}>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </Link>
                          {canResendValidation(session) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendValidation(session.id, session.client.email)}
                              disabled={resendingIds.has(session.id)}
                              title="Resend validation email"
                            >
                              {resendingIds.has(session.id) ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Mail className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="px-6 py-3 flex items-center justify-between border-t border-border bg-background-secondary">
        <div className="text-sm text-text-secondary">
          Showing {sessions.length > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
          {pagination.total} results
        </div>
        <div className="flex items-center gap-4">
          <PageSizeSelector
            value={pagination.limit}
            onChange={handlePageSizeChange}
            disabled={loading}
          />
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1 || loading}
              onClick={() => fetchSessions(pagination.page - 1)}
            >
              {loading ? 'Loading...' : 'Previous'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages || loading}
              onClick={() => fetchSessions(pagination.page + 1)}
            >
              {loading ? 'Loading...' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}