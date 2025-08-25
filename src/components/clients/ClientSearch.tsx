'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface ClientSearchProps {
  locations?: Array<{
    id: string
    name: string
  }>
  trainers?: Array<{
    id: string
    name: string
    email: string
  }>
  showInactive?: boolean
}

export function ClientSearch({ 
  locations = [], 
  trainers = [],
  showInactive = false 
}: ClientSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Parse comma-separated values for multi-select fields
  const getArrayFromParam = (param: string | null) => {
    return param ? param.split(',').filter(Boolean) : []
  }
  
  // Initialize filters from URL parameters
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    locationIds: getArrayFromParam(searchParams.get('locationIds')),
    trainerIds: getArrayFromParam(searchParams.get('trainerIds')),
    active: searchParams.get('active') !== 'false',
  })

  const [isOpen, setIsOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState(filters.search)

  // Sync filters with URL parameters when they change
  useEffect(() => {
    setFilters({
      search: searchParams.get('search') || '',
      locationIds: getArrayFromParam(searchParams.get('locationIds')),
      trainerIds: getArrayFromParam(searchParams.get('trainerIds')),
      active: searchParams.get('active') !== 'false',
    })
    setSearchInput(searchParams.get('search') || '')
  }, [searchParams])

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
    // Debug: Log current filter state
    console.log('Current filter state before applying:', {
      filters,
      searchInput
    })
    
    const params = new URLSearchParams()
    
    // Handle search - use the current searchInput value
    if (searchInput) {
      params.set('search', searchInput)
    }
    
    // Handle array filters - use current filter state
    if (filters.locationIds && filters.locationIds.length > 0) {
      params.set('locationIds', filters.locationIds.join(','))
      console.log('Adding locationIds to params:', filters.locationIds)
    }
    if (filters.trainerIds && filters.trainerIds.length > 0) {
      params.set('trainerIds', filters.trainerIds.join(','))
      console.log('Adding trainerIds to params:', filters.trainerIds)
    }
    
    // Handle active status
    if (!filters.active && showInactive) {
      params.set('active', 'false')
    }
    
    // Update filters state with search
    setFilters(prev => ({ ...prev, search: searchInput }))
    
    // Debug: Log what we're applying
    console.log('Final URL parameters:', {
      search: searchInput,
      locationIds: filters.locationIds,
      trainerIds: filters.trainerIds,
      queryString: params.toString(),
      fullUrl: params.toString() ? `/clients?${params.toString()}` : '/clients'
    })
    
    // Reset to page 1 when applying filters
    const url = params.toString() ? `/clients?${params.toString()}` : '/clients'
    router.push(url)
    // Don't need refresh since push will trigger re-render
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      locationIds: [],
      trainerIds: [],
      active: true,
    })
    setSearchInput('')
    router.push('/clients')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Update filters with search input and then apply
    const updatedFilters = { ...filters, search: searchInput }
    setFilters(updatedFilters)
    
    // Apply filters immediately with updated search
    const params = new URLSearchParams()
    
    if (searchInput) params.set('search', searchInput)
    
    if (updatedFilters.locationIds.length > 0) {
      params.set('locationIds', updatedFilters.locationIds.join(','))
    }
    if (updatedFilters.trainerIds.length > 0) {
      params.set('trainerIds', updatedFilters.trainerIds.join(','))
    }
    
    if (!updatedFilters.active && showInactive) {
      params.set('active', 'false')
    }
    
    router.push(`/clients?${params.toString()}`)
    router.refresh()
  }

  const activeFilterCount = 
    (filters.search ? 1 : 0) +
    filters.locationIds.length + 
    filters.trainerIds.length +
    (!filters.active ? 1 : 0)

  // Toggle functions for multi-select - update state immediately
  const toggleLocationId = (id: string) => {
    setFilters(prev => {
      const newLocationIds = prev.locationIds.includes(id)
        ? prev.locationIds.filter(l => l !== id)
        : [...prev.locationIds, id]
      
      console.log('Toggled location:', id, 'New locationIds:', newLocationIds)
      
      return {
        ...prev,
        locationIds: newLocationIds
      }
    })
  }
  
  const toggleTrainerId = (id: string) => {
    setFilters(prev => {
      const newTrainerIds = prev.trainerIds.includes(id)
        ? prev.trainerIds.filter(t => t !== id)
        : [...prev.trainerIds, id]
      
      console.log('Toggled trainer:', id, 'New trainerIds:', newTrainerIds)
      
      return {
        ...prev,
        trainerIds: newTrainerIds
      }
    })
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
            {/* Search Input */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-primary mb-1">
                Search
              </label>
              <form onSubmit={handleSearch} className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="Name, email, or phone..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="flex-1 text-sm"
                />
                <Button type="submit" size="sm">
                  Search
                </Button>
              </form>
            </div>

            {/* Location Filter - Multi-select Dropdown */}
            {locations.length > 0 && (
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

            {/* Trainer Filter - Multi-select Dropdown */}
            {trainers.length > 0 && (
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
                      {filters.trainerIds.length === 0 
                        ? 'All Trainers' 
                        : filters.trainerIds.includes('unassigned')
                        ? `Unassigned${filters.trainerIds.length > 1 ? ` + ${filters.trainerIds.length - 1} more` : ''}`
                        : `${filters.trainerIds.length} selected`}
                    </span>
                    <svg className="h-4 w-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openDropdown === 'trainers' && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg">
                      <div className="max-h-60 overflow-y-auto p-2">
                        <label className="flex items-center space-x-2 hover:bg-surface-hover p-2 rounded cursor-pointer border-b border-border mb-2">
                          <input
                            type="checkbox"
                            checked={filters.trainerIds.includes('unassigned')}
                            onChange={() => toggleTrainerId('unassigned')}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-text-primary font-medium">Unassigned</span>
                        </label>
                        {trainers.map((trainer) => (
                          <label
                            key={trainer.id}
                            className="flex items-center space-x-2 hover:bg-surface-hover p-2 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={filters.trainerIds.includes(trainer.id)}
                              onChange={() => toggleTrainerId(trainer.id)}
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

            {/* Active Status (if showInactive is true) */}
            {showInactive && (
              <div className="relative">
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Status
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    id="showInactive"
                    type="checkbox"
                    checked={!filters.active}
                    onChange={(e) => setFilters({ ...filters, active: !e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="showInactive" className="text-sm text-text-primary">
                    Include inactive clients
                  </label>
                </div>
              </div>
            )}

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