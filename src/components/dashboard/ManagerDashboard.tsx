'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DatePicker } from '@/components/ui/DatePicker'
import { 
  Download,
  WifiOff
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { TrainerPerformanceTable } from './TrainerPerformanceTable'
import { SessionDetailsPanel } from './SessionDetailsPanel'
import { fromZonedTime } from 'date-fns-tz'

interface ManagerDashboardProps {
  userId: string
  userName: string
  userRole: string
  locationIds: string[]
  orgTimezone?: string
}

interface DashboardData {
  stats: {
    totalSessions: number
    validatedSessions: number
    totalSessionValue: number
    validationRate: number
    activeTrainers: number
    // Client metrics - snapshots (current state)
    clientMetrics: {
      total: number
      active: number
      notStarted: number
      atRisk: number
      lost: number
    }
    // Client metrics - period based (within time filter)
    clientMetricsPeriod: {
      newClients: number
      resoldPackages: number
      newlyLost: number
    }
    unassignedClients?: number
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
      locationId?: string
    }
    sessionCount: number
    totalValue: number
  }>
  allTrainers?: Array<{
    id: string
    name: string
    email: string
    locationId?: string  // Single location for backward compatibility
    locationIds?: string[]  // All locations the trainer has access to
  }>
  allLocations?: Array<{
    id: string
    name: string
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
  lowValidationTrainers?: Array<{
    name: string
    email: string
    validationRate: number
    totalSessions: number
    validatedSessions: number
  }>
  peakActivityHours?: Array<{
    hour: number
    count: number
  }>
  trainerClientHealth?: Array<{
    trainerId: string
    trainerName: string
    trainerEmail: string
    locationNames: string[]
    total: number
    active: number
    notStarted: number
    atRisk: number
    // Period-based metrics
    newClients: number
    resold: number
    newlyLost: number
  }>
}

export function ManagerDashboard({ userId, userName, userRole, locationIds, orgTimezone = 'Asia/Singapore' }: ManagerDashboardProps) {
  console.log('🕐 ManagerDashboard - Received props:', { userId, userName, userRole, locationIds, orgTimezone })
  console.log('🕐 ManagerDashboard - orgTimezone value:', orgTimezone)
  
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [period, setPeriod] = useState('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [selectedTrainers, setSelectedTrainers] = useState<string[]>([])
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // State for session details panel
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false)
  const [selectedTrainerName, setSelectedTrainerName] = useState('')
  const [selectedSessionValue, setSelectedSessionValue] = useState(0)
  const [selectedSessions, setSelectedSessions] = useState<any[]>([])

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

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        let url = `/api/dashboard?period=${period}`
        if (period === 'custom' && customStartDate && customEndDate) {
          url += `&startDate=${customStartDate}&endDate=${customEndDate}`
        }
        if (selectedLocation) {
          url += `&locationId=${selectedLocation}`
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
    
    fetchDashboardData()
  }, [period, selectedTrainers, selectedLocation, customStartDate, customEndDate])

  const handleLocationChange = (locationId: string) => {
    if (locationId === selectedLocation) {
      // Deselecting current location
      setSelectedLocation('')
      setSelectedTrainers([])
    } else {
      // Selecting new location - auto-select all trainers from that location
      setSelectedLocation(locationId)
      if (data?.allTrainers) {
        const locationTrainers = data.allTrainers
          .filter(t => t.locationIds?.includes(locationId) || t.locationId === locationId)
          .map(t => t.id)
        setSelectedTrainers(locationTrainers)
      }
    }
  }

  const toggleTrainer = (trainerId: string) => {
    // Only allow toggling trainers from the selected location (or all if no location selected)
    if (selectedLocation && data?.allTrainers) {
      const trainer = data.allTrainers.find(t => t.id === trainerId)
      // Check if trainer has access to the selected location
      const hasLocation = trainer?.locationIds?.includes(selectedLocation) || 
                         trainer?.locationId === selectedLocation
      if (!hasLocation) {
        return // Don't allow selecting trainers from other locations
      }
    }
    
    setSelectedTrainers(prev => {
      if (prev.includes(trainerId)) {
        return prev.filter(id => id !== trainerId)
      } else {
        return [...prev, trainerId]
      }
    })
  }

  const clearFilters = () => {
    setSelectedLocation('')
    setSelectedTrainers([])
    setPeriod('month')
    setCustomStartDate('')
    setCustomEndDate('')
  }

  const activeFilterCount = 
    (selectedLocation ? 1 : 0) +
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

  // Handler for fetching trainer session details
  const handleFetchTrainerDetails = async (trainerId: string) => {
    try {
      let url = `/api/trainers/${trainerId}/sessions`
      let startDate: Date
      let endDate: Date = new Date()
      
      if (period === 'custom' && customStartDate && customEndDate) {
        url += `?startDate=${customStartDate}&endDate=${customEndDate}`
      } else if (period === 'month') {
        // Current month in org timezone
        const now = new Date()
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
        
        // End of current month in org timezone
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        
        // Convert from org timezone to UTC for API
        const utcStartDate = fromZonedTime(startDate, orgTimezone)
        const utcEndDate = fromZonedTime(endDate, orgTimezone)
        
        url += `?startDate=${utcStartDate.toISOString()}&endDate=${utcEndDate.toISOString()}`
      } else if (period === 'week') {
        // Last 7 days in org timezone
        const now = new Date()
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(now.getDate() - 7)
        
        startDate = new Date(sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate(), 0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        
        // Convert from org timezone to UTC for API
        const utcStartDate = fromZonedTime(startDate, orgTimezone)
        const utcEndDate = fromZonedTime(endDate, orgTimezone)
        
        url += `?startDate=${utcStartDate.toISOString()}&endDate=${utcEndDate.toISOString()}`
      } else if (period === 'lastMonth' || period === 'last') {
        // Last month in org timezone
        const now = new Date()
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
        
        // Convert from org timezone to UTC for API
        const utcStartDate = fromZonedTime(startDate, orgTimezone)
        const utcEndDate = fromZonedTime(endDate, orgTimezone)
        
        url += `?startDate=${utcStartDate.toISOString()}&endDate=${utcEndDate.toISOString()}`
      } else if (period === 'day') {
        // Today only in org timezone
        const now = new Date()
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        
        // Convert from org timezone to UTC for API
        const utcStartDate = fromZonedTime(startDate, orgTimezone)
        const utcEndDate = fromZonedTime(endDate, orgTimezone)
        
        url += `?startDate=${utcStartDate.toISOString()}&endDate=${utcEndDate.toISOString()}`
      }
      // If no period matches, fetch all sessions (no date filter)
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch trainer details')
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching trainer details:', error)
      return []
    }
  }

  // Handler for opening session details panel
  const handleViewDetails = (trainerId: string, sessionValue: number, sessions: any[]) => {
    const trainer = data?.trainerStats.find(t => t.trainer?.id === trainerId)
    setSelectedTrainerName(trainer?.trainer?.name || 'Unknown')
    setSelectedSessionValue(sessionValue)
    setSelectedSessions(sessions)
    setDetailsPanelOpen(true)
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
      
      // Store totals for display but don't add to chart data
      // dataPoint['Total Sessions'] = cumulativeTotal
      // dataPoint['Validated'] = cumulativeValidated
      
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

  // Get unique trainer names for the legend (all trainers with sessions)
  const topTrainers = data.trainerStats
    .map(t => t.trainer?.name)
    .filter(Boolean)

  // Color palette for different lines
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

  return (
    <div className="space-y-6">
      {/* Header - Only show for non-admin roles */}
      {userRole !== 'ADMIN' && (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">
            {userRole === 'CLUB_MANAGER' ? 'Club Manager' : 'PT Manager'} Dashboard
          </h1>
          {isOffline && (
            <div className="flex items-center space-x-2 text-orange-600 bg-orange-50 px-3 py-1 rounded-md">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm">Offline - Data may be outdated</span>
            </div>
          )}
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
                  <option value="lastMonth">Last Month</option>
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
                    <DatePicker
                      value={customStartDate}
                      onChange={(value) => setCustomStartDate(value)}
                      className="text-sm"
                      placeholder="Select start date"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      End Date
                    </label>
                    <DatePicker
                      value={customEndDate}
                      onChange={(value) => setCustomEndDate(value)}
                      className="text-sm"
                      placeholder="Select end date"
                    />
                  </div>
                </>
              )}

              {/* Location Filter - Single select */}
              {data?.allLocations && data.allLocations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Location
                  </label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-text-primary bg-surface hover:bg-surface-hover focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  >
                    <option value="">All Locations</option>
                    {data.allLocations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                          {data.allTrainers
                            .filter(trainer => !selectedLocation || 
                              trainer.locationIds?.includes(selectedLocation) || 
                              trainer.locationId === selectedLocation)
                            .map((trainer) => (
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
                          {selectedLocation && data.allTrainers.filter(t => 
                            t.locationIds?.includes(selectedLocation) || t.locationId === selectedLocation
                          ).length === 0 && (
                            <p className="text-sm text-text-secondary p-2">No trainers in this location</p>
                          )}
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

      {/* Client Health Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Client Health by Trainer</CardTitle>
            {/* Period Summary - compact */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-text-secondary">This Period:</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium text-emerald-600">{data.stats.clientMetricsPeriod?.newClients ?? 0}</span>
                <span className="text-text-secondary">new</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium text-purple-600">{data.stats.clientMetricsPeriod?.resoldPackages ?? 0}</span>
                <span className="text-text-secondary">resold</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium text-red-600">{data.stats.clientMetricsPeriod?.newlyLost ?? 0}</span>
                <span className="text-text-secondary">lost</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.trainerClientHealth && data.trainerClientHealth.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-background-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Trainer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Active
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Not Started
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                      At Risk
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider border-l border-border">
                      New
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Resold
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Lost
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border">
                  {data.trainerClientHealth.map((trainer) => {
                    const isUnassigned = trainer.trainerId === 'unassigned'
                    return (
                    <tr key={trainer.trainerId} className={`hover:bg-surface-hover ${isUnassigned ? 'bg-amber-50' : ''}`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className={`text-sm font-medium ${isUnassigned ? 'text-amber-700 italic' : 'text-text-primary'}`}>
                            {trainer.trainerName}
                          </p>
                          {trainer.trainerEmail && (
                            <p className="text-xs text-text-secondary">{trainer.trainerEmail}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm text-text-secondary">
                          {trainer.locationNames.length > 0 ? trainer.locationNames.join(', ') : '-'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-text-primary">{trainer.total}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${trainer.active > 0 ? 'text-green-600' : 'text-text-secondary'}`}>
                          {trainer.active}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${trainer.notStarted > 0 ? 'text-amber-600' : 'text-text-secondary'}`}>
                          {trainer.notStarted}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${trainer.atRisk > 0 ? 'text-orange-600' : 'text-text-secondary'}`}>
                          {trainer.atRisk}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center border-l border-border">
                        <span className={`text-sm font-medium ${trainer.newClients > 0 ? 'text-emerald-600' : 'text-text-secondary'}`}>
                          {trainer.newClients}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${trainer.resold > 0 ? 'text-purple-600' : 'text-text-secondary'}`}>
                          {trainer.resold}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${trainer.newlyLost > 0 ? 'text-red-600' : 'text-text-secondary'}`}>
                          {trainer.newlyLost}
                        </span>
                      </td>
                    </tr>
                    )
                  })}
                  {/* Totals Row */}
                  <tr className="bg-background-secondary font-medium">
                    <td className="px-4 py-3 text-sm text-text-primary" colSpan={2}>
                      Totals
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-text-primary">
                      {data.stats.clientMetrics?.total ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-green-600">
                      {data.stats.clientMetrics?.active ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-amber-600">
                      {data.stats.clientMetrics?.notStarted ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-orange-600">
                      {data.stats.clientMetrics?.atRisk ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-emerald-600 border-l border-border">
                      {data.stats.clientMetricsPeriod?.newClients ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-purple-600">
                      {data.stats.clientMetricsPeriod?.resoldPackages ?? 0}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-red-600">
                      {data.stats.clientMetricsPeriod?.newlyLost ?? 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-text-secondary text-center py-4">
              No client data available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Alerts Section */}
      {data.stats.unassignedClients && data.stats.unassignedClients > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Unassigned Clients Alert */}
          <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-orange-600 mt-0.5">⚠️</div>
                  <div>
                    <p className="text-sm font-medium text-orange-900">Unassigned Clients</p>
                    <p className="text-sm text-orange-700 mt-1">
                      {data.stats.unassignedClients || 0} client{(data.stats.unassignedClients || 0) > 1 ? 's' : ''} need trainer assignment
                    </p>
                    <a href="/clients?filter=unassigned" className="text-sm text-orange-600 hover:text-orange-800 mt-2 inline-block">
                      View unassigned clients →
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>
      ) : null}

      {/* Cumulative Sessions Chart - Full width */}
      <Card>
        <CardHeader>
          <CardTitle>Cumulative Sessions by Trainer</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-sm">
              <span className="text-text-secondary">Total Sessions: </span>
              <span className="font-semibold text-text-primary">
                {data.stats.totalSessions}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-text-secondary">Validated Sessions: </span>
              <span className="font-semibold text-success">
                {data.stats.validatedSessions} ({data.stats.validationRate}%)
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              {/* Add lines for trainers/PT managers only */}
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
          <TrainerPerformanceTable
            trainers={data.trainerStats}
            onViewDetails={handleViewDetails}
            onFetchTrainerDetails={handleFetchTrainerDetails}
          />
        </CardContent>
      </Card>

      {/* Peak Activity Hours Chart */}
      {data.peakActivityHours && data.peakActivityHours.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Peak Activity Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.peakActivityHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="hour" 
                  fontSize={12}
                  tickFormatter={(hour) => {
                    const h = hour % 12 || 12
                    const ampm = hour < 12 ? 'AM' : 'PM'
                    return `${h}${ampm}`
                  }}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value: number) => [`${value} sessions`, 'Count']}
                  labelFormatter={(hour) => {
                    const h = hour % 12 || 12
                    const ampm = hour < 12 ? 'AM' : 'PM'
                    return `${h}:00 ${ampm}`
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      
      {/* Session Details Panel */}
      <SessionDetailsPanel
        isOpen={detailsPanelOpen}
        onClose={() => setDetailsPanelOpen(false)}
        trainerName={selectedTrainerName}
        sessionValue={selectedSessionValue}
        sessions={selectedSessions}
        orgTimezone={orgTimezone}
      />
    </div>
  )
}