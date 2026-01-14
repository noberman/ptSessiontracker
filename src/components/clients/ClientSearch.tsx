'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { SearchableMultiSelect } from '@/components/ui/SearchableMultiSelect'

// Client state options for filtering
const CLIENT_STATE_OPTIONS = [
  { value: 'active', label: 'Active', subLabel: 'Has active package with sessions' },
  { value: 'not_started', label: 'Not Started', subLabel: 'Has package, no sessions yet' },
  { value: 'at_risk', label: 'At Risk', subLabel: 'Package expiring soon' },
  { value: 'lost', label: 'Lost', subLabel: 'No active packages' },
  { value: 'new', label: 'New', subLabel: 'No packages yet' },
]

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
  
  // Parse comma-separated values for multi-select fields
  const getArrayFromParam = (param: string | null) => {
    return param ? param.split(',').filter(Boolean) : []
  }
  
  // Initialize filters from URL parameters
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    locationIds: getArrayFromParam(searchParams.get('locationIds')),
    trainerIds: getArrayFromParam(searchParams.get('trainerIds')),
    clientStates: getArrayFromParam(searchParams.get('clientStates')),
    active: searchParams.get('active') !== 'false',
  })

  const [isOpen, setIsOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(filters.search)

  // Sync filters with URL parameters when they change
  useEffect(() => {
    setFilters({
      search: searchParams.get('search') || '',
      locationIds: getArrayFromParam(searchParams.get('locationIds')),
      trainerIds: getArrayFromParam(searchParams.get('trainerIds')),
      clientStates: getArrayFromParam(searchParams.get('clientStates')),
      active: searchParams.get('active') !== 'false',
    })
    setSearchInput(searchParams.get('search') || '')
  }, [searchParams])

  const applyFilters = () => {
    const params = new URLSearchParams()

    // Handle search - use the current searchInput value
    if (searchInput) {
      params.set('search', searchInput)
    }

    // Handle array filters - use current filter state
    if (filters.locationIds && filters.locationIds.length > 0) {
      params.set('locationIds', filters.locationIds.join(','))
    }
    if (filters.trainerIds && filters.trainerIds.length > 0) {
      params.set('trainerIds', filters.trainerIds.join(','))
    }
    if (filters.clientStates && filters.clientStates.length > 0) {
      params.set('clientStates', filters.clientStates.join(','))
    }

    // Handle active status
    if (!filters.active && showInactive) {
      params.set('active', 'false')
    }

    // Update filters state with search
    setFilters(prev => ({ ...prev, search: searchInput }))

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
      clientStates: [],
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
    if (updatedFilters.clientStates.length > 0) {
      params.set('clientStates', updatedFilters.clientStates.join(','))
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
    filters.clientStates.length +
    (!filters.active ? 1 : 0)

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

            {/* Location Filter - Searchable Multi-select */}
            {locations.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Locations
                </label>
                <SearchableMultiSelect
                  options={locations.map(location => ({
                    value: location.id,
                    label: location.name
                  }))}
                  value={filters.locationIds}
                  onChange={(ids) => setFilters(prev => ({ ...prev, locationIds: ids }))}
                  placeholder="All Locations"
                  searchPlaceholder="Search locations..."
                />
              </div>
            )}

            {/* Trainer Filter - Searchable Multi-select */}
            {trainers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Trainers
                </label>
                <SearchableMultiSelect
                  options={[
                    { value: 'unassigned', label: 'Unassigned' },
                    ...trainers.map(trainer => ({
                      value: trainer.id,
                      label: trainer.name,
                      subLabel: trainer.email
                    }))
                  ]}
                  value={filters.trainerIds}
                  onChange={(ids) => setFilters(prev => ({ ...prev, trainerIds: ids }))}
                  placeholder="All Trainers"
                  searchPlaceholder="Search trainers..."
                />
              </div>
            )}

            {/* Client State Filter */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Client Status
              </label>
              <SearchableMultiSelect
                options={CLIENT_STATE_OPTIONS}
                value={filters.clientStates}
                onChange={(states) => setFilters(prev => ({ ...prev, clientStates: states }))}
                placeholder="All Statuses"
                searchPlaceholder="Search statuses..."
              />
            </div>

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