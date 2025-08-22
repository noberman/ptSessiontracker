'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

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
  const [locationId, setLocationId] = useState(searchParams.get('locationId') || '')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (role) params.set('role', role)
    if (locationId) params.set('locationId', locationId)
    
    router.push(`/users?${params.toString()}`)
  }

  const handleReset = () => {
    setSearch('')
    setRole('')
    setLocationId('')
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
    <Card>
      <form onSubmit={handleSearch} className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="">All Roles</option>
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {locations.length > 0 && (
            <div>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">All Locations</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex space-x-2">
            <Button type="submit" className="flex-1">
              Search
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleReset}
              className="flex-1"
            >
              Reset
            </Button>
          </div>
        </div>
      </form>
    </Card>
  )
}