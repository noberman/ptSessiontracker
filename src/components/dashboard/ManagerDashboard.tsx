'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { DatePicker } from '@/components/ui/DatePicker'
import {
  Download,
  WifiOff,
  Info,
  Bell
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
    totalSales: number
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
    renewalSales: number
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
  const [openTooltip, setOpenTooltip] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  
  // State for session details panel
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false)
  const [selectedTrainerName, setSelectedTrainerName] = useState('')
  const [selectedSessionValue, setSelectedSessionValue] = useState(0)
  const [selectedSessions, setSelectedSessions] = useState<any[]>([])

  // State for client metric modal
  const [clientModalOpen, setClientModalOpen] = useState(false)
  const [clientModalLoading, setClientModalLoading] = useState(false)
  const [clientModalData, setClientModalData] = useState<{
    metric: string
    metricLabel: string
    trainerName: string
    clients: Array<{
      id: string
      name: string
      email: string
      packages: Array<{
        id: string
        name: string
        remainingSessions: number
        totalSessions: number
        expiresAt: string | null
      }>
    }>
  } | null>(null)

  // State for alerts dropdown
  const [alertsOpen, setAlertsOpen] = useState(false)
  const alertsRef = useRef<HTMLDivElement>(null)

  // Close dropdown and tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
      // Close alerts dropdown if clicking outside
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setAlertsOpen(false)
      }
      // Close tooltip if clicking outside
      const target = event.target as HTMLElement
      if (!target.closest('[data-tooltip]')) {
        setOpenTooltip(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Simple info tooltip component
  const InfoTooltip = ({ id, text, position = 'center' }: { id: string; text: string; position?: 'center' | 'left' }) => (
    <span className="relative inline-flex" data-tooltip>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpenTooltip(openTooltip === id ? null : id)
        }}
        className="text-text-tertiary hover:text-text-secondary focus:outline-none"
      >
        <Info className="h-3 w-3" />
      </button>
      {openTooltip === id && (
        <div className={`absolute z-50 top-full mt-2 px-3 py-2 text-xs font-normal normal-case tracking-normal text-left text-white bg-gray-900 rounded-lg shadow-lg whitespace-normal w-48 ${
          position === 'left' ? 'right-0' : 'left-1/2 -translate-x-1/2'
        }`}>
          {text}
          <div className={`absolute bottom-full border-4 border-transparent border-b-gray-900 ${
            position === 'left' ? 'right-2' : 'left-1/2 -translate-x-1/2'
          }`} />
        </div>
      )}
    </span>
  )

  // Metric labels for modal
  const metricLabels: Record<string, string> = {
    total: 'Total Clients',
    active: 'Active Clients',
    notStarted: 'Not Started Clients',
    atRisk: 'At Risk Clients',
    newClients: 'New Clients',
    resold: 'Resold Packages',
    newlyLost: 'Lost Clients'
  }

  // Fetch clients for a specific metric
  const fetchClientsForMetric = async (
    trainerId: string,
    trainerName: string,
    metric: string,
    count: number
  ) => {
    if (count === 0) return // Don't open modal for zero

    setClientModalLoading(true)
    setClientModalOpen(true)
    setClientModalData({
      metric,
      metricLabel: metricLabels[metric] || metric,
      trainerName,
      clients: []
    })

    try {
      const params = new URLSearchParams({
        trainerId,
        metric: metric === 'newClients' ? 'new' : metric === 'newlyLost' ? 'lost' : metric
      })

      // Add date params for period metrics
      if (['newClients', 'resold', 'newlyLost', 'new', 'lost'].includes(metric) && data?.stats.period) {
        params.append('dateFrom', data.stats.period.from)
        params.append('dateTo', data.stats.period.to)
      }

      const response = await fetch(`/api/dashboard/clients?${params}`)
      const result = await response.json()

      if (response.ok) {
        setClientModalData({
          metric,
          metricLabel: metricLabels[metric] || metric,
          trainerName,
          clients: result.clients
        })
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setClientModalLoading(false)
    }
  }

  // Clickable metric number component
  const MetricNumber = ({
    value,
    trainerId,
    trainerName,
    metric,
    colorClass
  }: {
    value: number
    trainerId: string
    trainerName: string
    metric: string
    colorClass: string
  }) => (
    <button
      type="button"
      onClick={() => fetchClientsForMetric(trainerId, trainerName, metric, value)}
      className={`text-sm font-medium ${colorClass} ${value > 0 ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
      disabled={value === 0}
    >
      {value}
    </button>
  )

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
    } else {
      // Selecting new location - clear trainer selection to let location filter work alone
      // This prevents double-filtering (by location AND trainer) which causes data mismatches
      setSelectedLocation(locationId)
    }
    // Clear trainer selection when changing location to avoid data inconsistency
    setSelectedTrainers([])
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
    
    const headers = ['Trainer Name', 'Email', 'Sessions', 'Session Value', 'Avg per Session']
    const rows = data.trainerStats.map(stat => [
      stat.trainer?.name || 'Unknown',
      stat.trainer?.email || '',
      stat.sessionCount,
      stat.totalValue.toFixed(2),
      stat.sessionCount > 0 ? (stat.totalValue / stat.sessionCount).toFixed(2) : '0.00'
    ])

    // Calculate totals from trainer stats
    const totalSessionValue = data.trainerStats.reduce((sum, stat) => sum + stat.totalValue, 0)

    // Add totals row
    rows.push([
      'TOTAL',
      '',
      data.stats.totalSessions,
      totalSessionValue.toFixed(2),
      data.stats.totalSessions > 0
        ? (totalSessionValue / data.stats.totalSessions).toFixed(2)
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

          {/* Spacer to push alerts to the right */}
          <div className="flex-1" />

          {/* Alerts Bell */}
          {data.stats.unassignedClients && data.stats.unassignedClients > 0 && (
            <div className="relative" ref={alertsRef}>
              <button
                type="button"
                onClick={() => setAlertsOpen(!alertsOpen)}
                className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-orange-500 rounded-full">
                  1
                </span>
              </button>

              {/* Alerts Dropdown */}
              {alertsOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-border z-50">
                  <div className="px-4 py-3 border-b border-border">
                    <h3 className="text-sm font-semibold text-text-primary">Alerts</h3>
                  </div>
                  <div className="py-2">
                    <a
                      href="/clients?trainerIds=unassigned"
                      className="flex items-start space-x-3 px-4 py-3 hover:bg-surface-hover transition-colors"
                      onClick={() => setAlertsOpen(false)}
                    >
                      <span className="text-orange-500 mt-0.5">⚠️</span>
                      <div>
                        <p className="text-sm font-medium text-text-primary">Unassigned Clients</p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {data.stats.unassignedClients} client{data.stats.unassignedClients > 1 ? 's' : ''} need trainer assignment
                        </p>
                      </div>
                    </a>
                  </div>
                </div>
              )}
            </div>
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
              <p className="text-sm text-text-secondary">Total Sales</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                ${data.stats.totalSales.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div>
              <p className="text-sm text-text-secondary">Renewal Sales</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                ${(data.stats.renewalSales ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
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
                      <div className="flex items-center justify-center gap-1">
                        Total
                        <InfoTooltip id="total" text="Total clients assigned to this trainer" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1">
                        Active
                        <InfoTooltip id="active" text="Clients with at least one active package (sessions remaining, not expired)" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1">
                        Not Started
                        <InfoTooltip id="notStarted" text="Clients with active package but no sessions logged yet - need onboarding" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1">
                        At Risk
                        <InfoTooltip id="atRisk" text="Clients with package expiring within 14 days - follow up for renewal" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider border-l border-border">
                      <div className="flex items-center justify-center gap-1">
                        New
                        <InfoTooltip id="new" text="New clients this period - purchased package with no prior sessions in last 30 days" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1">
                        Resold
                        <InfoTooltip id="resold" text="Package resales this period - client had active package or recent sessions before purchase" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                      <div className="flex items-center justify-center gap-1">
                        Lost
                        <InfoTooltip id="lost" text="Clients lost this period - package ended with no replacement purchased" position="left" />
                      </div>
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
                        <MetricNumber
                          value={trainer.total}
                          trainerId={trainer.trainerId}
                          trainerName={trainer.trainerName}
                          metric="total"
                          colorClass="text-text-primary"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <MetricNumber
                          value={trainer.active}
                          trainerId={trainer.trainerId}
                          trainerName={trainer.trainerName}
                          metric="active"
                          colorClass={trainer.active > 0 ? 'text-green-600' : 'text-text-secondary'}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <MetricNumber
                          value={trainer.notStarted}
                          trainerId={trainer.trainerId}
                          trainerName={trainer.trainerName}
                          metric="notStarted"
                          colorClass={trainer.notStarted > 0 ? 'text-amber-600' : 'text-text-secondary'}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <MetricNumber
                          value={trainer.atRisk}
                          trainerId={trainer.trainerId}
                          trainerName={trainer.trainerName}
                          metric="atRisk"
                          colorClass={trainer.atRisk > 0 ? 'text-orange-600' : 'text-text-secondary'}
                        />
                      </td>
                      <td className="px-4 py-3 text-center border-l border-border">
                        <MetricNumber
                          value={trainer.newClients}
                          trainerId={trainer.trainerId}
                          trainerName={trainer.trainerName}
                          metric="newClients"
                          colorClass={trainer.newClients > 0 ? 'text-emerald-600' : 'text-text-secondary'}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <MetricNumber
                          value={trainer.resold}
                          trainerId={trainer.trainerId}
                          trainerName={trainer.trainerName}
                          metric="resold"
                          colorClass={trainer.resold > 0 ? 'text-purple-600' : 'text-text-secondary'}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <MetricNumber
                          value={trainer.newlyLost}
                          trainerId={trainer.trainerId}
                          trainerName={trainer.trainerName}
                          metric="newlyLost"
                          colorClass={trainer.newlyLost > 0 ? 'text-red-600' : 'text-text-secondary'}
                        />
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
              <Tooltip wrapperStyle={{ zIndex: 1000 }} />
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

      {/* Client Metric Modal */}
      {clientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setClientModalOpen(false)}
          />
          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  {clientModalData?.metricLabel} ({clientModalData?.clients.length || 0})
                </h3>
                <p className="text-sm text-text-secondary">{clientModalData?.trainerName}</p>
              </div>
              <button
                type="button"
                onClick={() => setClientModalOpen(false)}
                className="text-text-secondary hover:text-text-primary p-1"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {clientModalLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : clientModalData?.clients.length === 0 ? (
                <p className="text-center text-text-secondary py-8">No clients found</p>
              ) : (
                <div className="space-y-3">
                  {clientModalData?.clients.map((client) => (
                    <div key={client.id} className="border border-border rounded-lg p-3 hover:bg-surface-hover">
                      <a
                        href={`/clients/${client.id}`}
                        className="text-sm font-medium text-text-primary hover:text-primary-600 hover:underline"
                      >
                        {client.name}
                      </a>
                      <p className="text-xs text-text-secondary">{client.email}</p>
                      {client.packages && client.packages.length > 0 && (
                        <div className="mt-2">
                          {client.packages.map((pkg) => (
                            <a
                              key={pkg.id}
                              href={`/packages/${pkg.id}`}
                              className="flex items-center justify-between text-xs text-text-secondary hover:text-primary-600 group"
                            >
                              <span className="group-hover:underline">{pkg.name}</span>
                              <span className="text-text-tertiary">
                                {pkg.remainingSessions}/{pkg.totalSessions} sessions
                                {pkg.expiresAt && (
                                  <> · Expires {new Date(pkg.expiresAt).toLocaleDateString()}</>
                                )}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}