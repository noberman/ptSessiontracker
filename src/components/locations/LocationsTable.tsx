'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { 
  MapPin, 
  Users, 
  UserCheck, 
  Activity
} from 'lucide-react'

interface Location {
  id: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
  trainers: Array<{
    id: string
    name: string
    email: string
  }>
  trainerCount: number
  clientCount: number
  sessionsThisMonth: number
}

interface LocationsTableProps {
  userRole: string
  canEdit: boolean
}

export function LocationsTable({ userRole, canEdit }: LocationsTableProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch locations')
      }

      // Handle both formats - array directly or object with locations property
      setLocations(Array.isArray(data) ? data : (data.locations || []))
    } catch (err: any) {
      setError(err.message || 'Failed to fetch locations')
    } finally {
      setLoading(false)
    }
  }


  if (loading) {
    return (
      <Card>
        <div className="p-8 text-center">
          <p className="text-text-secondary">Loading locations...</p>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <div className="p-8 text-center">
          <p className="text-error-600">{error}</p>
        </div>
      </Card>
    )
  }

  if (locations.length === 0) {
    return (
      <Card>
        <div className="p-8 text-center">
          <MapPin className="h-12 w-12 text-text-secondary mx-auto mb-4" />
          <p className="text-text-secondary mb-4">No locations found</p>
          {canEdit && (
            <Link href="/locations/new">
              <Button>Create First Location</Button>
            </Link>
          )}
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Total Locations</p>
                <p className="text-2xl font-bold text-text-primary">
                  {locations.length}
                </p>
              </div>
              <MapPin className="h-8 w-8 text-primary-500" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Active Locations</p>
                <p className="text-2xl font-bold text-text-primary">
                  {locations.filter(l => l.active).length}
                </p>
              </div>
              <Activity className="h-8 w-8 text-success-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Total Trainers</p>
                <p className="text-2xl font-bold text-text-primary">
                  {locations.reduce((sum, l) => sum + l.trainerCount, 0)}
                </p>
              </div>
              <UserCheck className="h-8 w-8 text-primary-500" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Total Clients</p>
                <p className="text-2xl font-bold text-text-primary">
                  {locations.reduce((sum, l) => sum + l.clientCount, 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-primary-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Locations Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-secondary border-b border-border">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">
                  Location
                </th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">
                  Status
                </th>
                <th className="text-center p-4 text-sm font-medium text-text-secondary">
                  Trainers
                </th>
                <th className="text-center p-4 text-sm font-medium text-text-secondary">
                  Clients
                </th>
                <th className="text-center p-4 text-sm font-medium text-text-secondary">
                  Sessions (Month)
                </th>
                <th className="text-right p-4 text-sm font-medium text-text-secondary">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {locations.map((location) => (
                <tr key={location.id} className="hover:bg-surface-hover transition-colors">
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-text-primary">
                        {location.name}
                      </p>
                      <p className="text-sm text-text-secondary">
                        Created {new Date(location.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={location.active ? 'success' : 'warning'}>
                      {location.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-text-primary font-medium">
                      {location.trainerCount}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-text-primary font-medium">
                      {location.clientCount}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-text-primary font-medium">
                      {location.sessionsThisMonth}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <Link href={`/locations/${location.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                      {canEdit && (
                        <Link href={`/locations/${location.id}/edit`}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}