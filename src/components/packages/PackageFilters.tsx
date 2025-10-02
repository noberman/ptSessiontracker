'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface PackageFiltersProps {
  clients: Array<{
    id: string
    name: string
    email: string
  }>
  locations?: Array<{
    id: string
    name: string
  }>
  currentUserRole: string
}

export function PackageFilters({ clients, locations, currentUserRole }: PackageFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Parse comma-separated values for multi-select fields
  const getArrayFromParam = (param: string | null) => {
    return param ? param.split(',').filter(Boolean) : []
  }
  
  const [filters, setFilters] = useState({
    clientIds: getArrayFromParam(searchParams.get('clientIds')),
    locationIds: getArrayFromParam(searchParams.get('locationIds')),
    activeStatuses: getArrayFromParam(searchParams.get('activeStatuses')),
    expirationStatus: searchParams.get('expirationStatus') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
  })

  const [isOpen, setIsOpen] = useState(false)
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

  const applyFilters = () => {
    const params = new URLSearchParams()
    
    // Handle array filters
    if (filters.clientIds.length > 0) {
      params.set('clientIds', filters.clientIds.join(','))
    }
    if (filters.locationIds.length > 0) {
      params.set('locationIds', filters.locationIds.join(','))
    }
    if (filters.activeStatuses.length > 0) {
      params.set('activeStatuses', filters.activeStatuses.join(','))
    }
    
    // Handle single value filters
    if (filters.expirationStatus) params.set('expirationStatus', filters.expirationStatus)
    if (filters.startDate) params.set('startDate', filters.startDate)
    if (filters.endDate) params.set('endDate', filters.endDate)
    
    // Reset to page 1 when applying filters
    // Use replace instead of push to avoid history issues
    router.replace(`/packages?${params.toString()}`)
    // Small delay before refresh to ensure URL is updated
    setTimeout(() => {
      router.refresh()
    }, 100)
  }

  const clearFilters = () => {
    setFilters({
      clientIds: [],
      locationIds: [],
      activeStatuses: [],
      expirationStatus: '',
      startDate: '',
      endDate: '',
    })
    router.replace('/packages')
    // Small delay before refresh to ensure URL is updated
    setTimeout(() => {
      router.refresh()
    }, 100)
  }

  const activeFilterCount = 
    filters.clientIds.length + 
    filters.locationIds.length + 
    filters.activeStatuses.length + 
    (filters.expirationStatus ? 1 : 0) +
    (filters.startDate ? 1 : 0) + 
    (filters.endDate ? 1 : 0)

  // Toggle functions for multi-select
  const toggleClientId = (id: string) => {
    setFilters(prev => ({
      ...prev,
      clientIds: prev.clientIds.includes(id)
        ? prev.clientIds.filter(c => c !== id)
        : [...prev.clientIds, id]
    }))
  }
  
  const toggleLocationId = (id: string) => {
    setFilters(prev => ({
      ...prev,
      locationIds: prev.locationIds.includes(id)
        ? prev.locationIds.filter(l => l !== id)
        : [...prev.locationIds, id]
    }))
  }
  
  
  const toggleActiveStatus = (status: string) => {
    setFilters(prev => ({
      ...prev,
      activeStatuses: prev.activeStatuses.includes(status)
        ? prev.activeStatuses.filter(s => s !== status)
        : [...prev.activeStatuses, status]
    }))
  }


  return (
    <div className="mb-4">
      <div className="flex items-center space-x-2 mb-4">
        <Button
          variant={isOpen ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? 'Hide Filters' : 'Show Filters'}
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
      </div>

      {isOpen && (
        <div className="bg-surface border border-border rounded-lg p-4" ref={dropdownRef}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="text-sm"
              />
            </div>

            {/* Client Filter - Multi-select Dropdown */}
            <div className="relative">
              <label className="block text-sm font-medium text-text-primary mb-1">
                Clients
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'clients' ? null : 'clients')}
                  className="w-full rounded-lg border border-border px-3 py-2 text-left text-text-primary bg-surface hover:bg-surface-hover focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm flex items-center justify-between"
                >
                  <span>
                    {filters.clientIds.length === 0 
                      ? 'All Clients' 
                      : `${filters.clientIds.length} selected`}
                  </span>
                  <svg className="h-4 w-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openDropdown === 'clients' && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg">
                    <div className="max-h-60 overflow-y-auto p-2">
                      {clients.length === 0 ? (
                        <p className="text-sm text-text-secondary p-2">No clients available</p>
                      ) : (
                        clients.map((client) => (
                          <label
                            key={client.id}
                            className="flex items-center space-x-2 hover:bg-surface-hover p-2 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={filters.clientIds.includes(client.id)}
                              onChange={() => toggleClientId(client.id)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-text-primary">{client.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Location Filter - Multi-select Dropdown */}
            {locations && locations.length > 0 && currentUserRole !== 'TRAINER' && currentUserRole !== 'CLUB_MANAGER' && (
              <div className="relative">
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Locations
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === 'locations' ? null : 'locations')}
                    className="w-full rounded-lg border border-border px-3 py-2 text-left text-text-primary bg-surface hover:bg-surface-hover focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm flex items-center justify-between"
                  >
                    <span>
                      {filters.locationIds.length === 0 
                        ? 'All Locations' 
                        : `${filters.locationIds.length} selected`}
                    </span>
                    <svg className="h-4 w-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openDropdown === 'locations' && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg">
                      <div className="max-h-60 overflow-y-auto p-2">
                        {locations.map((location) => (
                          <label
                            key={location.id}
                            className="flex items-center space-x-2 hover:bg-surface-hover p-2 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={filters.locationIds.includes(location.id)}
                              onChange={() => toggleLocationId(location.id)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-text-primary">{location.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* Active Status Filter - Multi-select Dropdown */}
            <div className="relative">
              <label className="block text-sm font-medium text-text-primary mb-1">
                Status
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                  className="w-full rounded-lg border border-border px-3 py-2 text-left text-text-primary bg-surface hover:bg-surface-hover focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm flex items-center justify-between"
                >
                  <span>
                    {filters.activeStatuses.length === 0 
                      ? 'All Status' 
                      : filters.activeStatuses.length === 2
                      ? 'All Status'
                      : filters.activeStatuses.includes('true') 
                      ? 'Active' 
                      : 'Inactive'}
                  </span>
                  <svg className="h-4 w-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openDropdown === 'status' && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg">
                    <div className="p-2">
                      <label className="flex items-center space-x-2 hover:bg-surface-hover p-2 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.activeStatuses.includes('true')}
                          onChange={() => toggleActiveStatus('true')}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-text-primary">Active</span>
                      </label>
                      <label className="flex items-center space-x-2 hover:bg-surface-hover p-2 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.activeStatuses.includes('false')}
                          onChange={() => toggleActiveStatus('false')}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-text-primary">Inactive</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Expiration Status Filter - Dropdown */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Expiration
              </label>
              <select
                value={filters.expirationStatus}
                onChange={(e) => setFilters({ ...filters, expirationStatus: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-text-primary bg-surface hover:bg-surface-hover focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">All</option>
                <option value="expired">Expired</option>
                <option value="expiring_soon">Expiring Soon (30 days)</option>
                <option value="not_expired">Not Expired</option>
                <option value="no_expiry">No Expiry Set</option>
              </select>
            </div>

            {/* Apply Button */}
            <div className="flex items-end">
              <Button
                onClick={applyFilters}
                size="sm"
                className="w-full"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}