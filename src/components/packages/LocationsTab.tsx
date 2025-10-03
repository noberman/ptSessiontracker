'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from 'react-hot-toast'
import { MapPin, Plus, Trash2, Edit2, Check, X } from 'lucide-react'

interface Location {
  id: string
  name: string
  address?: string | null
  _count?: {
    clients: number
    users: number
  }
}

export function LocationsTab() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState({ name: '', address: '' })
  const [newLocation, setNewLocation] = useState({ name: '', address: '' })
  const [showNewForm, setShowNewForm] = useState(false)

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations')
      if (response.ok) {
        const data = await response.json()
        // Handle both formats - array directly or object with locations property
        setLocations(Array.isArray(data) ? data : (data.locations || []))
      } else {
        toast.error('Failed to load locations')
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
      toast.error('Failed to load locations')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newLocation.name.trim()) {
      toast.error('Location name is required')
      return
    }

    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLocation),
      })

      if (response.ok) {
        const data = await response.json()
        setLocations([...locations, data])
        setNewLocation({ name: '', address: '' })
        setShowNewForm(false)
        toast.success('Location created successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create location')
      }
    } catch (error) {
      console.error('Error creating location:', error)
      toast.error('Failed to create location')
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editingData.name.trim()) {
      toast.error('Location name is required')
      return
    }

    try {
      const response = await fetch(`/api/locations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingData),
      })

      if (response.ok) {
        const data = await response.json()
        setLocations(locations.map(loc => loc.id === id ? data : loc))
        setEditingId(null)
        toast.success('Location updated successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update location')
      }
    } catch (error) {
      console.error('Error updating location:', error)
      toast.error('Failed to update location')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) {
      return
    }

    try {
      const response = await fetch(`/api/locations/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setLocations(locations.filter(loc => loc.id !== id))
        toast.success('Location deleted successfully')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete location')
      }
    } catch (error) {
      console.error('Error deleting location:', error)
      toast.error('Failed to delete location')
    }
  }

  const startEditing = (location: Location) => {
    setEditingId(location.id)
    setEditingData({
      name: location.name,
      address: location.address || ''
    })
  }

  if (loading) {
    return <div>Loading locations...</div>
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Locations</h3>
            <p className="text-sm text-text-secondary mt-1">
              Manage gym locations where training sessions are conducted
            </p>
          </div>
          <Button
            onClick={() => setShowNewForm(true)}
            disabled={showNewForm}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>

        {showNewForm && (
          <div className="mb-6 p-4 border border-border rounded-lg bg-background-secondary">
            <h4 className="font-medium text-text-primary mb-3">New Location</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary"
                  placeholder="Main Gym"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Address (Optional)
                </label>
                <input
                  type="text"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary"
                  placeholder="123 Main St, City"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleCreate} size="sm">
                Create Location
              </Button>
              <Button
                onClick={() => {
                  setShowNewForm(false)
                  setNewLocation({ name: '', address: '' })
                }}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {locations.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              No locations found. Add your first location to get started.
            </div>
          ) : (
            locations.map((location) => (
              <div
                key={location.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-background-secondary transition-colors"
              >
                {editingId === location.id ? (
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={editingData.name}
                      onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                      className="px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary"
                    />
                    <input
                      type="text"
                      value={editingData.address}
                      onChange={(e) => setEditingData({ ...editingData, address: e.target.value })}
                      className="px-3 py-2 border border-border rounded-md bg-background-primary text-text-primary"
                      placeholder="Address (optional)"
                    />
                  </div>
                ) : (
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-text-tertiary" />
                      <span className="font-medium text-text-primary">{location.name}</span>
                    </div>
                    {location.address && (
                      <p className="text-sm text-text-secondary ml-6 mt-1">{location.address}</p>
                    )}
                    {location._count && (
                      <div className="flex items-center gap-4 text-sm text-text-tertiary ml-6 mt-2">
                        <span>{location._count.clients} clients</span>
                        <span>{location._count.users} staff</span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  {editingId === location.id ? (
                    <>
                      <Button
                        onClick={() => handleUpdate(location.id)}
                        size="sm"
                        variant="outline"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => setEditingId(null)}
                        size="sm"
                        variant="outline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => startEditing(location)}
                        size="sm"
                        variant="outline"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(location.id)}
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        disabled={location._count && (location._count.clients > 0 || location._count.users > 0)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}