'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle,
  Plus,
  RefreshCw,
  Mail
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

interface TrainerDashboardProps {
  userId: string
  userName: string
  orgTimezone?: string
}

interface DashboardData {
  stats: {
    totalSessions: number
    validatedSessions: number
    pendingValidations: number
    totalSessionValue: number
    validationRate: number
    period: {
      from: string
      to: string
    }
  }
  todaysSessions: Array<{
    id: string
    sessionDate: string
    validated: boolean
    createdAt?: string  // Add createdAt for correct time display
    client: {
      name: string
      email: string
    }
    package?: {
      name: string
    }
  }>
  myClients: Array<{
    id: string
    name: string
    email: string
    packages: Array<{
      id: string
      name: string
      remainingSessions: number
      totalSessions: number
    }>
  }>
  pendingValidationSessions: Array<{
    id: string
    sessionDate: string
    client: {
      name: string
      email: string
    }
  }>
}

export function TrainerDashboard({ userName, orgTimezone = 'Asia/Singapore' }: TrainerDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set())
  const [period, setPeriod] = useState('month')

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/dashboard?period=${period}`)
      const data = await response.json()
      setData(data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [period])


  const handleResendValidation = async (sessionId: string) => {
    setResendingIds(prev => new Set(prev).add(sessionId))
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/resend-validation`, {
        method: 'POST',
      })
      
      if (response.ok) {
        alert('Validation email sent successfully!')
        fetchData() // Refresh data
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-text-secondary">Failed to load dashboard data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Period Filter - Consistent with other pages */}
      <div className="bg-surface rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-text-secondary">Period:</span>
            <div className="flex space-x-2">
              <Button
                variant={period === 'day' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setPeriod('day')}
              >
                Today
              </Button>
              <Button
                variant={period === 'week' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setPeriod('week')}
              >
                This Week
              </Button>
              <Button
                variant={period === 'lastMonth' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setPeriod('lastMonth')}
              >
                Last Month
              </Button>
              <Button
                variant={period === 'month' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setPeriod('month')}
              >
                This Month
              </Button>
            </div>
          </div>
          {/* Desktop Add Session button */}
          <Link href="/sessions/new" className="hidden md:block">
            <Button className="flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Add Session
            </Button>
          </Link>
        </div>
      </div>

      {/* Welcome Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">Welcome back, {userName}!</h1>
        <p className="text-sm text-text-secondary mt-1">
          Here&apos;s your performance for {period === 'month' ? 'this month' : period === 'lastMonth' ? 'last month' : period === 'week' ? 'this week' : 'today'}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Total Sessions</p>
                <p className="text-2xl font-bold text-text-primary mt-1">
                  {data.stats.totalSessions}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-primary-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Total Earnings</p>
                <p className="text-2xl font-bold text-text-primary mt-1">
                  ${data.stats.totalSessionValue.toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-success-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Validation Rate</p>
                <p className="text-2xl font-bold text-text-primary mt-1">
                  {data.stats.validationRate}%
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  {data.stats.validatedSessions} of {data.stats.totalSessions}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-success-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Pending</p>
                <p className="text-2xl font-bold text-text-primary mt-1">
                  {data.stats.pendingValidations}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Awaiting validation
                </p>
              </div>
              <Clock className="w-8 h-8 text-warning-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Sessions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Today&apos;s Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {data.todaysSessions.length > 0 ? (
              <div className="space-y-3">
                {data.todaysSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
                    <div>
                      <p className="font-medium text-text-primary">{session.client.name}</p>
                      <p className="text-sm text-text-secondary">
                        {(() => {
                          const dateToUse = session.createdAt || session.sessionDate
                          const sessionDate = typeof dateToUse === 'string' 
                            ? parseISO(dateToUse)
                            : dateToUse
                          const zonedDate = toZonedTime(sessionDate, orgTimezone)
                          return format(zonedDate, 'hh:mm a')
                        })()}
                        {session.package && ` - ${session.package.name}`}
                      </p>
                    </div>
                    <Badge variant={session.validated ? 'success' : 'warning'} size="sm">
                      {session.validated ? 'Validated' : 'Pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-secondary text-center py-8">No sessions today</p>
            )}
          </CardContent>
        </Card>

        {/* Pending Validations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Pending Validations</span>
              {data.pendingValidationSessions.length > 0 && (
                <Badge variant="warning" size="sm">
                  {data.pendingValidationSessions.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.pendingValidationSessions.length > 0 ? (
              <div className="space-y-3">
                {data.pendingValidationSessions.map((session) => (
                  <div key={session.id} className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-text-primary text-sm">
                          {session.client.name}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {(() => {
                            const sessionDate = typeof session.sessionDate === 'string' 
                              ? parseISO(session.sessionDate)
                              : session.sessionDate
                            const zonedDate = toZonedTime(sessionDate, orgTimezone)
                            return format(zonedDate, 'MMM d, yyyy')
                          })()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResendValidation(session.id)}
                        disabled={resendingIds.has(session.id)}
                        className="ml-2"
                      >
                        {resendingIds.has(session.id) ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Mail className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-8 h-8 text-success-500 mx-auto mb-2" />
                <p className="text-sm text-text-secondary">All sessions validated!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* My Clients */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>My Clients</span>
            <Badge variant="default" size="sm">{data.myClients.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.myClients.map((client) => (
              <Link key={client.id} href={`/clients/${client.id}`}>
                <div className="p-4 bg-background-secondary rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                  <p className="font-medium text-text-primary">{client.name}</p>
                  <p className="text-sm text-text-secondary">{client.email}</p>
                  {client.packages.length > 0 && (
                    <div className="mt-2">
                      {client.packages.map((pkg) => (
                        <div key={pkg.id} className="text-xs text-text-secondary">
                          {pkg.name}: {pkg.remainingSessions}/{pkg.totalSessions} sessions
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mobile Floating Action Button */}
      <Link href="/sessions/new" className="md:hidden">
        <Button 
          className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg w-14 h-14 p-0 flex items-center justify-center"
          size="lg"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </Link>
    </div>
  )
}