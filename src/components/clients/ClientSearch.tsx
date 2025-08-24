'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

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
  
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [locationId, setLocationId] = useState(searchParams.get('locationId') || '')
  const [primaryTrainerId, setPrimaryTrainerId] = useState(searchParams.get('primaryTrainerId') || '')
  const [active, setActive] = useState(searchParams.get('active') !== 'false')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (locationId) params.set('locationId', locationId)
    if (primaryTrainerId) params.set('primaryTrainerId', primaryTrainerId)
    if (!active && showInactive) params.set('active', 'false')
    
    router.push(`/clients?${params.toString()}`)
  }

  const handleReset = () => {
    setSearch('')
    setLocationId('')
    setPrimaryTrainerId('')
    setActive(true)
    router.push('/clients')
  }

  return (
    <Card>
      <form onSubmit={handleSearch} className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <Input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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

          {trainers.length > 0 && (
            <div>
              <select
                value={primaryTrainerId}
                onChange={(e) => setPrimaryTrainerId(e.target.value)}
                className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              >
                <option value="">All Trainers</option>
                <option value="unassigned">Unassigned</option>
                {trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.name}
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

        {showInactive && (
          <div className="mt-4 flex items-center">
            <input
              id="showInactive"
              type="checkbox"
              checked={!active}
              onChange={(e) => setActive(!e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="showInactive" className="ml-2 block text-sm text-text-primary">
              Show inactive clients
            </label>
          </div>
        )}
      </form>
    </Card>
  )
}