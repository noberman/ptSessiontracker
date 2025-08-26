'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { 
  Calendar,
  Download
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface ManagerDashboardProps {
  userId: string
  userName: string
  userRole: string
  locationId: string | null
}

interface DashboardData {
  stats: {
    totalSessions: number
    validatedSessions: number
    totalSessionValue: number
    validationRate: number
    activeTrainers: number
    activeClients: number
    period: {
      from: string
      to: string
    }
  }
  trainerStats: Array<{
    trainer: {
      id: string
      name: string
      email: string
    }
    sessionCount: number
    totalValue: number
  }>
  allTrainers?: Array<{
    id: string
    name: string
    email: string
  }>
  dailyStats: Array<{
    date: string
    count: number
    value: number
    validated_count: number
    trainerSessions?: Array<{
      trainerId: string
      count: number
    }>
  }>
}

export function ManagerDashboard({ userId, userName, userRole, locationId }: ManagerDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedTrainers, setSelectedTrainers] = useState<string[]>([])
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [period, selectedTrainers, customStartDate, customEndDate])

  const fetchDashboardData = async () => {
    try {
      let url = `/api/dashboard?period=${period}`
      if (period === 'custom' && customStartDate && customEndDate) {
        url += `&startDate=${customStartDate}&endDate=${customEndDate}`
      }
      if (selectedTrainers.length > 0) {
        url += `&trainerIds=${selectedTrainers.join(',')}`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      setData(data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTrainer = (trainerId: string) => {
    setSelectedTrainers(prev => {
      if (prev.includes(trainerId)) {
        return prev.filter(id => id !== trainerId)
      } else {
        return [...prev, trainerId]
      }
    })
  }

  const clearFilters = () => {
    setSelectedTrainers([])
    setPeriod('month')
    setCustomStartDate('')
    setCustomEndDate('')
  }

  const activeFilterCount = 
    selectedTrainers.length + 
    (period === 'custom' ? 2 : 0)

  const exportToCSV = () => {
    if (!data) return
    
    const headers = ['Trainer Name', 'Email', 'Sessions', 'Total Value', 'Avg per Session']
    const rows = data.trainerStats.map(stat => [
      stat.trainer?.name || 'Unknown',
      stat.trainer?.email || '',
      stat.sessionCount,
      stat.totalValue.toFixed(2),
      stat.sessionCount > 0 ? (stat.totalValue / stat.sessionCount).toFixed(2) : '0.00'
    ])
    
    // Add totals row
    rows.push([
      'TOTAL',
      '',
      data.stats.totalSessions,
      data.stats.totalSessionValue.toFixed(2),
      data.stats.totalSessions > 0 
        ? (data.stats.totalSessionValue / data.stats.totalSessions).toFixed(2) 
        : '0.00'
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    
    // Create filename with date range
    const startDate = new Date(data.stats.period.from).toISOString().split('T')[0]
    const endDate = new Date(data.stats.period.to).toISOString().split('T')[0]
    a.download = `trainer-report-${startDate}-to-${endDate}.csv`
    
    a.click()
    window.URL.revokeObjectURL(url)
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

  // Format daily stats for chart with cumulative trainer breakdown
  const chartData = (() => {
    // First reverse to process chronologically
    const chronologicalData = [...data.dailyStats].reverse()
    
    // Track cumulative totals
    let cumulativeTotal = 0
    let cumulativeValidated = 0
    const cumulativeByTrainer: { [key: string]: number } = {}
    
    // Initialize cumulative counters for each trainer
    data.trainerStats.forEach(trainerStat => {
      if (trainerStat.trainer?.name) {
        cumulativeByTrainer[trainerStat.trainer.name] = 0
      }
    })
    
    return chronologicalData.map(stat => {
      const dataPoint: any = {
        date: new Date(stat.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }
      
      // Add to cumulative totals
      cumulativeTotal += Number(stat.count)
      cumulativeValidated += Number(stat.validated_count)
      
      dataPoint['Total Sessions'] = cumulativeTotal
      dataPoint['Validated'] = cumulativeValidated
      
      // Add to cumulative trainer counts
      if (stat.trainerSessions) {
        stat.trainerSessions.forEach(ts => {
          const trainer = data.trainerStats.find(t => t.trainer?.id === ts.trainerId)
          if (trainer?.trainer?.name) {
            cumulativeByTrainer[trainer.trainer.name] = (cumulativeByTrainer[trainer.trainer.name] || 0) + ts.count
          }
        })
      }
      
      // Set all trainer values (including zeros for continuity)
      Object.keys(cumulativeByTrainer).forEach(trainerName => {
        dataPoint[trainerName] = cumulativeByTrainer[trainerName]
      })
      
      return dataPoint
    })
  })()

  // Get unique trainer names for the legend (top 5 by session count)
  const topTrainers = data.trainerStats
    .slice(0, 5)
    .map(t => t.trainer?.name)
    .filter(Boolean)

  // Color palette for different lines
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

  return (
    <div className="space-y-6">
      {/* Header - Only show for non-admin roles */}
      {userRole !== 'ADMIN' && (
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {userRole === 'CLUB_MANAGER' ? 'Club Manager' : 'PT Manager'} Dashboard
          </h1>
        </div>
      )}

      {/* Filter Section - Consistent with SessionFilters */}
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-4">
          <Button
            variant={isFiltersOpen ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          >
            {isFiltersOpen ? 'Hide Filters' : 'Show Filters'}
            {activeFilterCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full text-xs">
                {activeFilterCount}
              </span>
            )}
          </Button>
          
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
            >
              Clear All
            </Button>
          )}
          
          {/* Export button for managers and admin */}
          {(userRole === 'PT_MANAGER' || userRole === 'ADMIN' || userRole === 'CLUB_MANAGER') && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={!data || data.trainerStats.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>

        {isFiltersOpen && (
          <div className="bg-surface border border-border rounded-lg p-4" ref={dropdownRef}>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Date Range Presets */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Quick Select
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-text-primary bg-surface hover:bg-surface-hover focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="day">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* Custom Date Range */}
              {period === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </>
              )}

              {/* Trainer Filter - Multi-select Dropdown */}
              {data?.allTrainers && data.allTrainers.length > 0 && (
                <div className="relative">
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Trainers
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'trainers' ? null : 'trainers')}
                      className="w-full rounded-lg border border-border px-3 py-2 text-left text-text-primary bg-surface hover:bg-surface-hover focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm flex items-center justify-between"
                    >
                      <span>
                        {selectedTrainers.length === 0 
                          ? 'All Trainers' 
                          : `${selectedTrainers.length} selected`}
                      </span>
                      <svg className="h-4 w-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {openDropdown === 'trainers' && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg">
                        <div className="max-h-60 overflow-y-auto p-2">
                          {data.allTrainers.map((trainer) => (
                            <label
                              key={trainer.id}
                              className="flex items-center space-x-2 hover:bg-surface-hover p-2 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={selectedTrainers.includes(trainer.id)}
                                onChange={() => toggleTrainer(trainer.id)}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-text-primary">{trainer.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-text-secondary">Total Sessions</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {data.stats.totalSessions}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-text-secondary">Total Value</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                ${data.stats.totalSessionValue.toFixed(0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-text-secondary">Validation Rate</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {data.stats.validationRate}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-text-secondary">Active Trainers</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {data.stats.activeTrainers}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-text-secondary">Active Clients</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {data.stats.activeClients}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-text-secondary">Avg/Day</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {chartData.length > 0 
                  ? Math.round(data.stats.totalSessions / chartData.length)
                  : 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative Sessions Chart - Full width */}
      <Card>
        <CardHeader>
          <CardTitle>Cumulative Sessions by Trainer</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="Total Sessions" 
                stroke="#000000" 
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Line 
                type="monotone" 
                dataKey="Validated" 
                stroke="#10b981" 
                strokeWidth={2}
                strokeDasharray="3 3"
              />
              {/* Add lines for top trainers */}
              {topTrainers.map((trainerName, index) => (
                <Line 
                  key={trainerName}
                  type="monotone" 
                  dataKey={trainerName} 
                  stroke={colors[index % colors.length]} 
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Trainer Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Trainer Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr className="bg-background-secondary">
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Trainer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Sessions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Total Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                    Avg per Session
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.trainerStats.map((stat, idx) => (
                  <tr key={stat.trainer?.id || idx} className="hover:bg-background-secondary">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {stat.trainer?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {stat.trainer?.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-text-primary">
                        {stat.sessionCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-text-primary">
                        ${stat.totalValue.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-text-secondary">
                        ${stat.sessionCount > 0 
                          ? (stat.totalValue / stat.sessionCount).toFixed(2)
                          : '0.00'}
                      </span>
                    </td>
                  </tr>
                ))}
                {data.trainerStats.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-text-secondary">
                      No trainer data available for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}