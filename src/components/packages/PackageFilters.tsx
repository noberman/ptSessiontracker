'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { SearchableMultiSelect } from '@/components/ui/SearchableMultiSelect'

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
  packageTypes?: Array<{
    id: string
    name: string
  }>
  currentUserRole: string
}

export function PackageFilters({ clients, locations, packageTypes, currentUserRole }: PackageFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Parse comma-separated values for multi-select fields
  const getArrayFromParam = (param: string | null) => {
    return param ? param.split(',').filter(Boolean) : []
  }
  
  // Only use local state for UI state, not filter values
  const [isOpen, setIsOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [localChanges, setLocalChanges] = useState<Record<string, any>>({})

  // Get current filter values - either from local changes or URL
  const getFilterValue = (key: string, isArray = false) => {
    if (key in localChanges) {
      return localChanges[key]
    }
    if (isArray) {
      return getArrayFromParam(searchParams.get(key))
    }
    return searchParams.get(key) || ''
  }

  const currentFilters = {
    clientIds: getFilterValue('clientIds', true) as string[],
    locationIds: getFilterValue('locationIds', true) as string[],
    packageTypes: getFilterValue('packageTypes', true) as string[],
    activeStatuses: getFilterValue('activeStatuses', true) as string[],
    expirationStatus: getFilterValue('expirationStatus') as string,
    startDate: getFilterValue('startDate') as string,
    endDate: getFilterValue('endDate') as string,
  }


  const applyFilters = () => {
    
    const params = new URLSearchParams()
    
    // Handle array filters
    if (currentFilters.clientIds.length > 0) {
      params.set('clientIds', currentFilters.clientIds.join(','))
    }
    if (currentFilters.locationIds.length > 0) {
      params.set('locationIds', currentFilters.locationIds.join(','))
    }
    if (currentFilters.packageTypes.length > 0) {
      params.set('packageTypes', currentFilters.packageTypes.join(','))
    }
    if (currentFilters.activeStatuses.length > 0) {
      params.set('activeStatuses', currentFilters.activeStatuses.join(','))
    }
    
    // Handle single value filters
    if (currentFilters.expirationStatus) params.set('expirationStatus', currentFilters.expirationStatus)
    if (currentFilters.startDate) params.set('startDate', currentFilters.startDate)
    if (currentFilters.endDate) params.set('endDate', currentFilters.endDate)
    
    const newUrl = `/packages?${params.toString()}`
    
    // Clear local changes when applying
    setLocalChanges({})
    
    // Reset to page 1 when applying filters
    router.push(newUrl)
    router.refresh() // Force server component to re-fetch with new filters
  }

  const clearFilters = () => {
    setLocalChanges({})
    router.push('/packages')
    router.refresh() // Force refresh to clear filters
  }

  const activeFilterCount = 
    currentFilters.clientIds.length + 
    currentFilters.locationIds.length + 
    currentFilters.packageTypes.length +
    currentFilters.activeStatuses.length + 
    (currentFilters.expirationStatus ? 1 : 0) +
    (currentFilters.startDate ? 1 : 0) + 
    (currentFilters.endDate ? 1 : 0)

  // Toggle function for status (still using dropdown)
  const toggleActiveStatus = (status: string) => {
    const current = currentFilters.activeStatuses
    setLocalChanges(prev => ({
      ...prev,
      activeStatuses: current.includes(status)
        ? current.filter(s => s !== status)
        : [...current, status]
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
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range - Flowbite Style */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-text-primary mb-1">
                Date Range
              </label>
              <div className="flex items-center">
                <DatePicker
                  value={currentFilters.startDate}
                  onChange={(value) => setLocalChanges(prev => ({ ...prev, startDate: value }))}
                  placeholder="Start date"
                  className="flex-1"
                />
                <span className="mx-2 text-text-secondary">to</span>
                <DatePicker
                  value={currentFilters.endDate}
                  onChange={(value) => setLocalChanges(prev => ({ ...prev, endDate: value }))}
                  placeholder="End date"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Client Filter - Searchable Multi-select */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Clients
              </label>
              <SearchableMultiSelect
                options={clients.map(client => ({
                  value: client.id,
                  label: client.name,
                  subLabel: client.email
                }))}
                value={currentFilters.clientIds}
                onChange={(ids) => setLocalChanges(prev => ({ ...prev, clientIds: ids }))}
                placeholder="All Clients"
                searchPlaceholder="Search by name or email..."
              />
            </div>

            {/* Location Filter - Searchable Multi-select */}
            {locations && locations.length > 0 && currentUserRole !== 'TRAINER' && currentUserRole !== 'CLUB_MANAGER' && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Locations
                </label>
                <SearchableMultiSelect
                  options={locations.map(location => ({
                    value: location.id,
                    label: location.name
                  }))}
                  value={currentFilters.locationIds}
                  onChange={(ids) => setLocalChanges(prev => ({ ...prev, locationIds: ids }))}
                  placeholder="All Locations"
                  searchPlaceholder="Search locations..."
                />
              </div>
            )}

            {/* Package Type Filter - Searchable Multi-select */}
            {packageTypes && packageTypes.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Package Types
                </label>
                <SearchableMultiSelect
                  options={packageTypes.map(type => ({
                    value: type.name,  // Using name as value since we filter by packageType string
                    label: type.name
                  }))}
                  value={currentFilters.packageTypes}
                  onChange={(types) => setLocalChanges(prev => ({ ...prev, packageTypes: types }))}
                  placeholder="All Package Types"
                  searchPlaceholder="Search package types..."
                />
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
                    {currentFilters.activeStatuses.length === 0 
                      ? 'All Status' 
                      : currentFilters.activeStatuses.length === 2
                      ? 'All Status'
                      : currentFilters.activeStatuses.includes('true') 
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
                          checked={currentFilters.activeStatuses.includes('true')}
                          onChange={() => toggleActiveStatus('true')}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-text-primary">Active</span>
                      </label>
                      <label className="flex items-center space-x-2 hover:bg-surface-hover p-2 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentFilters.activeStatuses.includes('false')}
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
                value={currentFilters.expirationStatus}
                onChange={(e) => setLocalChanges(prev => ({ ...prev, expirationStatus: e.target.value }))}
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