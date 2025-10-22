'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { SearchableMultiSelect } from '@/components/ui/SearchableMultiSelect'

interface UserSearchProps {
  locations?: Array<{
    id: string
    name: string
  }>
  currentRole: string
}

export function UserSearch({ locations = [], currentRole }: UserSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [role, setRole] = useState(searchParams.get('role') || '')
  const [locationIds, setLocationIds] = useState<string[]>(
    searchParams.get('locationId') ? [searchParams.get('locationId')!] : []
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (role) params.set('role', role)
    // For now, use first location since backend expects single locationId
    if (locationIds.length > 0) params.set('locationId', locationIds[0])
    
    router.push(`/users?${params.toString()}`)
  }

  const handleReset = () => {
    setSearch('')
    setRole('')
    setLocationIds([])
    router.push('/users')
  }

  // Role options based on current user's role
  const getRoleOptions = () => {
    if (currentRole === 'ADMIN') {
      return ['TRAINER', 'CLUB_MANAGER', 'PT_MANAGER', 'ADMIN']
    } else if (currentRole === 'PT_MANAGER') {
      return ['TRAINER', 'CLUB_MANAGER']
    } else if (currentRole === 'CLUB_MANAGER') {
      return ['TRAINER']
    }
    return []
  }

  const roleOptions = getRoleOptions()

  return (
    <form onSubmit={handleSearch}>
      <div className="flex gap-3 items-center">
        <Input
          type="text"
          placeholder="Search by name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white"
        >
          <option value="">All Roles</option>
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {r.replace('_', ' ')}
            </option>
          ))}
        </select>

        {locations.length > 0 && (
          <div className="min-w-[200px]">
            <SearchableMultiSelect
              options={locations.map(location => ({
                value: location.id,
                label: location.name
              }))}
              value={locationIds}
              onChange={setLocationIds}
              placeholder="All Locations"
              searchPlaceholder="Search locations..."
            />
          </div>
        )}

        <Button type="submit">
          Search
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleReset}
        >
          Reset
        </Button>
      </div>
    </form>
  )
}