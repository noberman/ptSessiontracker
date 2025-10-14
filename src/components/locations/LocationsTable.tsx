'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ArchiveLocationDialog } from './ArchiveLocationDialog'
import { 
  MapPin, 
  Users, 
  UserCheck, 
  Activity,
  Archive,
  ArchiveRestore
} from 'lucide-react'

interface Location {
  id: string
  name: string
  active: boolean
  archivedAt?: string | null
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
  const [showArchived, setShowArchived] = useState(false)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)

  useEffect(() => {
    fetchLocations()
  }, [showArchived])

  const fetchLocations = async () => {
    try {
      const url = showArchived ? '/api/locations?includeArchived=true' : '/api/locations'
      const response = await fetch(url)
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

  const handleArchive = (location: Location) => {
    setSelectedLocation(location)
    setArchiveDialogOpen(true)
  }

  const confirmArchive = async () => {
    if (!selectedLocation) return

    try {
      const response = await fetch(`/api/locations/${selectedLocation.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to archive location')
      }

      // Refresh locations list
      await fetchLocations()
      setArchiveDialogOpen(false)
      setSelectedLocation(null)
    } catch (err: any) {
      alert(err.message || 'Failed to archive location')
    }
  }

  const handleRestore = async (locationId: string) => {
    if (!confirm('Are you sure you want to restore this location?')) return

    try {
      const response = await fetch(`/api/locations/${locationId}/restore`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to restore location')
      }

      // Refresh locations list
      await fetchLocations()
    } catch (err: any) {
      alert(err.message || 'Failed to restore location')
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
      {/* Archive toggle for admins */}
      {userRole === 'ADMIN' && (
        <div className="flex justify-end">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <span className="text-sm text-text-secondary">Show archived locations</span>
          </label>
        </div>
      )}

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
                <tr key={location.id} className={`hover:bg-surface-hover transition-colors ${!location.active ? 'opacity-60 bg-gray-50' : ''}`}>
                  <td className="p-4">
                    <div>
                      <p className={`font-medium ${location.active ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {location.name}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {location.archivedAt ? 
                          `Archived ${new Date(location.archivedAt).toLocaleDateString()}` :
                          `Created ${new Date(location.createdAt).toLocaleDateString()}`
                        }
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={location.active ? 'success' : 'gray'}>
                      {location.active ? 'Active' : 'Archived'}
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
                      {canEdit && location.active && (
                        <>
                          <Link href={`/locations/${location.id}/edit`}>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </Link>
                          {userRole === 'ADMIN' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleArchive(location)}
                              className="text-warning-600 hover:text-warning-700"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                      {userRole === 'ADMIN' && !location.active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(location.id)}
                          className="text-success-600 hover:text-success-700"
                        >
                          <ArchiveRestore className="h-4 w-4 mr-1" />
                          Restore
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Archive Dialog */}
      {selectedLocation && (
        <ArchiveLocationDialog
          isOpen={archiveDialogOpen}
          onClose={() => {
            setArchiveDialogOpen(false)
            setSelectedLocation(null)
          }}
          onConfirm={confirmArchive}
          locationId={selectedLocation.id}
          locationName={selectedLocation.name}
        />
      )}
    </div>
  )
}