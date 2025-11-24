'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { DatePicker } from '@/components/ui/DatePicker'
import { SearchableMultiSelect } from '@/components/ui/SearchableMultiSelect'
import { useFilterPersistence } from '@/hooks/useFilterPersistence'

interface SessionFiltersProps {
  clients: Array<{
    id: string
    name: string
  }>
  trainers: Array<{
    id: string
    name: string
  }>
  locations: Array<{
    id: string
    name: string
  }>
}

export function SessionFilters({ clients, trainers, locations }: SessionFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { saveFilters, syncWithUrl } = useFilterPersistence('session-filters')
  
  // Parse comma-separated values for multi-select fields
  const getArrayFromParam = (param: string | null) => {
    return param ? param.split(',').filter(Boolean) : []
  }
  
  // Read filter values directly from URL params
  const currentFilters = {
    clientIds: getArrayFromParam(searchParams.get('clientIds')),
    trainerIds: getArrayFromParam(searchParams.get('trainerIds')),
    locationIds: getArrayFromParam(searchParams.get('locationIds')),
    validatedStatuses: getArrayFromParam(searchParams.get('validatedStatuses')),
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
  }

  // Initialize state with stored or URL filters
  const [tempFilters, setTempFilters] = useState(currentFilters)
  const [isOpen, setIsOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  
  // On mount, sync with stored filters if no URL filters present
  useEffect(() => {
    if (!hasInitialized) {
      const storedState = syncWithUrl(currentFilters)
      if (storedState) {
        setTempFilters(storedState.filters)
        setIsOpen(storedState.isOpen)
        
        // If we restored filters from storage, apply them to URL
        const hasStoredFilters = Object.values(storedState.filters).some(value => 
          Array.isArray(value) ? value.length > 0 : !!value
        )
        if (hasStoredFilters) {
          // Apply stored filters to URL
          const params = new URLSearchParams()
          const filters = storedState.filters
          
          if (filters.clientIds?.length > 0) {
            params.set('clientIds', filters.clientIds.join(','))
          }
          if (filters.trainerIds?.length > 0) {
            params.set('trainerIds', filters.trainerIds.join(','))
          }
          if (filters.locationIds?.length > 0) {
            params.set('locationIds', filters.locationIds.join(','))
          }
          if (filters.validatedStatuses?.length > 0) {
            params.set('validatedStatuses', filters.validatedStatuses.join(','))
          }
          if (filters.startDate) params.set('startDate', filters.startDate)
          if (filters.endDate) params.set('endDate', filters.endDate)
          
          router.push(`/sessions?${params.toString()}`)
        }
      }
      setHasInitialized(true)
    }
  }, [hasInitialized, currentFilters, syncWithUrl, router])
  
  // Save filters whenever they're applied or panel state changes
  useEffect(() => {
    if (hasInitialized) {
      saveFilters(currentFilters, isOpen)
    }
  }, [currentFilters, isOpen, saveFilters, hasInitialized])

  const applyFilters = () => {
    
    const params = new URLSearchParams()
    
    // Handle array filters
    if (tempFilters.clientIds.length > 0) {
      params.set('clientIds', tempFilters.clientIds.join(','))
    }
    if (tempFilters.trainerIds.length > 0) {
      params.set('trainerIds', tempFilters.trainerIds.join(','))
    }
    if (tempFilters.locationIds.length > 0) {
      params.set('locationIds', tempFilters.locationIds.join(','))
    }
    if (tempFilters.validatedStatuses.length > 0) {
      params.set('validatedStatuses', tempFilters.validatedStatuses.join(','))
    }
    
    // Handle single value filters
    if (tempFilters.startDate) params.set('startDate', tempFilters.startDate)
    if (tempFilters.endDate) params.set('endDate', tempFilters.endDate)
    
    const newUrl = `/sessions?${params.toString()}`
    
    // Reset to page 1 when applying filters
    router.push(newUrl)
    router.refresh() // Force server component to re-fetch with new filters
  }

  const clearFilters = () => {
    const clearedFilters = {
      clientIds: [],
      trainerIds: [],
      locationIds: [],
      validatedStatuses: [],
      startDate: '',
      endDate: '',
    }
    setTempFilters(clearedFilters)
    // Clear from storage as well
    saveFilters(clearedFilters, isOpen)
    router.push('/sessions')
    router.refresh() // Force refresh to clear filters
  }

  const activeFilterCount = 
    currentFilters.clientIds.length + 
    currentFilters.trainerIds.length + 
    currentFilters.locationIds.length +
    currentFilters.validatedStatuses.length +
    (currentFilters.startDate ? 1 : 0) +
    (currentFilters.endDate ? 1 : 0)
  
  const toggleValidatedStatus = (status: string) => {
    setTempFilters(prev => ({
      ...prev,
      validatedStatuses: prev.validatedStatuses.includes(status)
        ? prev.validatedStatuses.filter(s => s !== status)
        : [...prev.validatedStatuses, status]
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
                  value={tempFilters.startDate}
                  onChange={(value) => setTempFilters({ ...tempFilters, startDate: value })}
                  placeholder="Start date"
                  className="flex-1"
                />
                <span className="mx-2 text-text-secondary">to</span>
                <DatePicker
                  value={tempFilters.endDate}
                  onChange={(value) => setTempFilters({ ...tempFilters, endDate: value })}
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
                  label: client.name
                }))}
                value={tempFilters.clientIds}
                onChange={(ids) => setTempFilters({ ...tempFilters, clientIds: ids })}
                placeholder="All Clients"
                searchPlaceholder="Search clients..."
              />
            </div>

            {/* Trainer Filter - Searchable Multi-select */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Trainers
              </label>
              <SearchableMultiSelect
                options={trainers.map(trainer => ({
                  value: trainer.id,
                  label: trainer.name
                }))}
                value={tempFilters.trainerIds}
                onChange={(ids) => setTempFilters({ ...tempFilters, trainerIds: ids })}
                placeholder="All Trainers"
                searchPlaceholder="Search trainers..."
              />
            </div>

            {/* Location Filter - Searchable Multi-select */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Locations
              </label>
              <SearchableMultiSelect
                options={locations.map(location => ({
                  value: location.id,
                  label: location.name
                }))}
                value={tempFilters.locationIds}
                onChange={(ids) => setTempFilters({ ...tempFilters, locationIds: ids })}
                placeholder="All Locations"
                searchPlaceholder="Search locations..."
              />
            </div>


            {/* Validation Status Filter - Multi-select Dropdown */}
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
                    {tempFilters.validatedStatuses.length === 0 
                      ? 'All Status' 
                      : tempFilters.validatedStatuses.length === 2
                      ? 'All Status'
                      : tempFilters.validatedStatuses.includes('true') 
                      ? 'Validated' 
                      : 'Pending'}
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
                          checked={tempFilters.validatedStatuses.includes('true')}
                          onChange={() => toggleValidatedStatus('true')}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-text-primary">Validated</span>
                      </label>
                      <label className="flex items-center space-x-2 hover:bg-surface-hover p-2 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempFilters.validatedStatuses.includes('false')}
                          onChange={() => toggleValidatedStatus('false')}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-text-primary">Pending</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
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