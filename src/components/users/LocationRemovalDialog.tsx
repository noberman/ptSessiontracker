'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface AffectedClient {
  id: string
  name: string
  locationId: string
  locationName: string
}

interface Trainer {
  id: string
  name: string
  email: string
  role: string
  clientCount: number
  displayName: string
}

interface LocationGroup {
  locationId: string
  locationName: string
  clients: AffectedClient[]
  availableTrainers: Trainer[]
}

interface ReassignmentMap {
  [clientId: string]: string // clientId -> new trainerId
}

interface LocationRemovalDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reassignments: ReassignmentMap) => Promise<void>
  affectedClients: AffectedClient[]
  currentTrainerId: string
  currentTrainerName: string
  title?: string
  description?: string
  confirmButtonText?: string
}

export function LocationRemovalDialog({
  isOpen,
  onClose,
  onConfirm,
  affectedClients,
  currentTrainerId,
  currentTrainerName,
  title = "Reassign Clients Before Removing Location Access",
  description,
  confirmButtonText = "Reassign & Remove Access"
}: LocationRemovalDialogProps) {
  const [loading, setLoading] = useState(false)
  const [loadingTrainers, setLoadingTrainers] = useState(false)
  const [reassignments, setReassignments] = useState<ReassignmentMap>({})
  const [locationGroups, setLocationGroups] = useState<LocationGroup[]>([])
  const [error, setError] = useState('')

  // Group clients by location and fetch available trainers
  useEffect(() => {
    if (!isOpen || affectedClients.length === 0) return

    const groupAndFetchTrainers = async () => {
      setLoadingTrainers(true)
      setError('')

      // Group clients by location
      const grouped = affectedClients.reduce((acc, client) => {
        if (!acc[client.locationId]) {
          acc[client.locationId] = {
            locationId: client.locationId,
            locationName: client.locationName,
            clients: [],
            availableTrainers: []
          }
        }
        acc[client.locationId].clients.push(client)
        return acc
      }, {} as Record<string, LocationGroup>)

      // Fetch available trainers for each location
      try {
        for (const locationId of Object.keys(grouped)) {
          const response = await fetch(`/api/locations/${locationId}/trainers`)
          if (response.ok) {
            const data = await response.json()
            // Filter out the current trainer from available options
            grouped[locationId].availableTrainers = data.trainers.filter(
              (t: Trainer) => t.id !== currentTrainerId
            )
          } else {
            console.error(`Failed to fetch trainers for location ${locationId}`)
          }
        }

        setLocationGroups(Object.values(grouped))
      } catch (err) {
        setError('Failed to load available trainers')
        console.error(err)
      } finally {
        setLoadingTrainers(false)
      }
    }

    groupAndFetchTrainers()
  }, [isOpen, affectedClients, currentTrainerId])

  const handleClientReassignment = (clientId: string, trainerId: string) => {
    setReassignments(prev => ({
      ...prev,
      [clientId]: trainerId
    }))
  }

  const handleBulkAssign = (locationId: string, trainerId: string) => {
    const group = locationGroups.find(g => g.locationId === locationId)
    if (!group) return

    const updates: ReassignmentMap = {}
    group.clients.forEach(client => {
      updates[client.id] = trainerId
    })

    setReassignments(prev => ({
      ...prev,
      ...updates
    }))
  }

  const handleConfirm = async () => {
    // Validate all clients have been reassigned
    const unassignedClients = affectedClients.filter(
      client => !reassignments[client.id]
    )

    if (unassignedClients.length > 0) {
      setError(`Please assign all clients before proceeding. ${unassignedClients.length} client(s) not assigned.`)
      return
    }

    setLoading(true)
    setError('')

    try {
      await onConfirm(reassignments)
    } catch (err: any) {
      setError(err.message || 'Failed to reassign clients')
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <p className="text-sm text-gray-500 mt-2">
            {description || `${currentTrainerName} has ${affectedClients.length} client${affectedClients.length > 1 ? 's' : ''} at 
            the location${locationGroups.length > 1 ? 's' : ''} you're removing. 
            Please reassign ${affectedClients.length > 1 ? 'them' : 'this client'} to other trainers.`}
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {loadingTrainers ? (
            <div className="text-center py-4">Loading available trainers...</div>
          ) : (
            <div className="space-y-6">
              {locationGroups.map(group => (
                <div key={group.locationId} className="border rounded-lg p-4">
                  <div className="mb-3">
                    <h3 className="font-medium text-lg flex items-center">
                      📍 {group.locationName}
                      <span className="ml-2 text-sm text-gray-500">
                        ({group.clients.length} client{group.clients.length > 1 ? 's' : ''})
                      </span>
                    </h3>
                    
                    {group.availableTrainers.length > 0 && group.clients.length > 1 && (
                      <div className="mt-2">
                        <label className="text-sm text-gray-600">
                          Assign all to:
                        </label>
                        <select
                          className="ml-2 rounded border border-gray-300 px-2 py-1 text-sm"
                          onChange={(e) => {
                            if (e.target.value) {
                              handleBulkAssign(group.locationId, e.target.value)
                            }
                          }}
                          value=""
                        >
                          <option value="">Select trainer for all...</option>
                          {group.availableTrainers.map(trainer => (
                            <option key={trainer.id} value={trainer.id}>
                              {trainer.displayName}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {group.clients.map(client => (
                      <div key={client.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="font-medium">{client.name}</span>
                        <select
                          value={reassignments[client.id] || ''}
                          onChange={(e) => handleClientReassignment(client.id, e.target.value)}
                          className="rounded border border-gray-300 px-3 py-1 text-sm"
                          required
                        >
                          <option value="">Select trainer...</option>
                          {group.availableTrainers.length === 0 ? (
                            <option disabled>No trainers available at this location</option>
                          ) : (
                            group.availableTrainers.map(trainer => (
                              <option key={trainer.id} value={trainer.id}>
                                {trainer.displayName}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    ))}
                  </div>

                  {group.availableTrainers.length === 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 text-yellow-700 text-sm rounded">
                      ⚠️ No other trainers have access to {group.locationName}. 
                      You'll need to assign trainers to this location first.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={loading || loadingTrainers}
            >
              {loading ? 'Reassigning...' : confirmButtonText}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}