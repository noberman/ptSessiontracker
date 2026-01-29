'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { PageSizeSelector } from '@/components/ui/PageSizeSelector'
import { ActionsDropdown } from '@/components/ui/ActionsDropdown'
import { LocationRemovalDialog } from './LocationRemovalDialog'
import { DeleteUserDialog } from './DeleteUserDialog'

interface User {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  location?: {
    name: string
  } | null
  locations?: Array<{
    location: {
      id: string
      name: string
    }
  }>
  createdAt: string | Date
  updatedAt: string | Date
}

interface UserTableProps {
  initialUsers: User[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  canEdit?: boolean
  canDelete?: boolean
}

const roleColors = {
  ADMIN: 'error',
  PT_MANAGER: 'warning',
  CLUB_MANAGER: 'secondary',
  TRAINER: 'default',
} as const

export function UserTable({ 
  initialUsers, 
  pagination: initialPagination,
  canEdit = false,
  canDelete = false 
}: UserTableProps) {
  const [users, setUsers] = useState(initialUsers)
  const [pagination, setPagination] = useState(initialPagination)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State for deletion flow
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showReassignDialog, setShowReassignDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [affectedClients, setAffectedClients] = useState<any[]>([])
  const [activePackageClientCount, setActivePackageClientCount] = useState(0)
  const [inactiveClientCount, setInactiveClientCount] = useState(0)
  const [checkingDelete, setCheckingDelete] = useState(false)
  
  // Fetch users when page or limit changes
  const fetchUsers = async (targetPage: number, targetLimit?: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', String(targetPage))
      if (targetLimit) {
        params.set('limit', String(targetLimit))
      }
      
      const response = await fetch(`/api/users/list?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      
      const data = await response.json()
      setUsers(data.users)
      setPagination(data.pagination)
      
      // Update URL without page refresh
      router.push(`/users?${params.toString()}`, { scroll: false })
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePageSizeChange = (newLimit: number) => {
    // Reset to page 1 when changing page size
    fetchUsers(1, newLimit)
  }

  // Step 1: Initial delete button click - check if user has clients
  const handleDelete = async (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (!user) return

    setUserToDelete(user)
    setCheckingDelete(true)

    // Check if trainer or PT_MANAGER has clients (for showing in confirmation dialog)
    if (user.role === 'TRAINER' || user.role === 'PT_MANAGER') {
      try {
        const clientsResponse = await fetch(`/api/users/${userId}/clients`)
        if (clientsResponse.ok) {
          const clientData = await clientsResponse.json()
          setActivePackageClientCount(clientData.activePackageClientCount || 0)
          setInactiveClientCount(clientData.inactiveClientCount || 0)
        } else {
          setActivePackageClientCount(0)
          setInactiveClientCount(0)
        }
      } catch {
        setActivePackageClientCount(0)
        setInactiveClientCount(0)
      }
    } else {
      setActivePackageClientCount(0)
      setInactiveClientCount(0)
    }

    setCheckingDelete(false)
    setShowDeleteDialog(true)
  }

  // Step 2: User confirms deletion in our custom dialog
  const handleDeleteConfirm = async () => {
    if (!userToDelete) return

    setShowDeleteDialog(false)

    // If user has clients with active packages, go to reassignment
    if (activePackageClientCount > 0 && (userToDelete.role === 'TRAINER' || userToDelete.role === 'PT_MANAGER')) {
      try {
        const clientsResponse = await fetch(`/api/users/${userToDelete.id}/clients`)
        if (clientsResponse.ok) {
          const clientData = await clientsResponse.json()
          // Only pass active-package clients for reassignment
          setAffectedClients(clientData.activePackageClients || [])
          setShowReassignDialog(true)
        }
      } catch (error) {
        console.error('Error fetching clients:', error)
        alert('Failed to fetch client details')
      }
    } else {
      // No active-package clients, proceed with deletion (inactive clients auto-unassigned by API)
      await performDelete()
    }
  }

  // Step 3: Actually delete the user (called directly or after reassignment)
  const performDelete = async () => {
    if (!userToDelete) return

    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setUsers(users.filter(u => u.id !== userToDelete.id))
        setUserToDelete(null)
        setAffectedClients([])
        setActivePackageClientCount(0)
        setInactiveClientCount(0)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    }
  }

  // Handle reassignment and deletion after successful reassignment
  const handleReassignmentComplete = async (reassignments: Record<string, string>) => {
    if (!userToDelete) return

    try {
      // Build reassignment array for API
      const reassignmentArray = Object.entries(reassignments).map(([clientId, toTrainerId]) => {
        const client = affectedClients.find(c => c.id === clientId)
        return {
          clientId,
          fromTrainerId: userToDelete.id,
          toTrainerId,
          locationId: client.locationId
        }
      })

      // Call bulk reassignment API
      const reassignResponse = await fetch('/api/clients/bulk-reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reassignments: reassignmentArray })
      })

      if (!reassignResponse.ok) {
        const error = await reassignResponse.json()
        throw new Error(error.error || 'Failed to reassign clients')
      }

      // Now delete the user
      setShowReassignDialog(false)
      await performDelete()
    } catch (err: any) {
      alert(err.message || 'Failed to complete reassignment and deletion')
    }
  }

  return (
    <>
    <Card padding="none">
      <div className="overflow-x-auto relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <div className="text-sm text-text-secondary">Loading...</div>
          </div>
        )}
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-background-secondary">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-surface-hover transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-text-primary">
                    {user.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-text-secondary">
                    {user.email}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge 
                    variant={roleColors[user.role as keyof typeof roleColors] || 'gray'}
                    size="sm"
                  >
                    {user.role}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-text-secondary">
                    {(() => {
                      // For ADMIN, show organization-wide access
                      if (user.role === 'ADMIN') {
                        return <span className="text-text-tertiary italic">All locations</span>
                      }
                      
                      // Collect all locations (both old locationId and new UserLocation)
                      const locationNames = new Set<string>()
                      
                      // Add primary location if exists
                      if (user.location?.name) {
                        locationNames.add(user.location.name)
                      }
                      
                      // Add locations from junction table
                      if (user.locations && user.locations.length > 0) {
                        user.locations.forEach(loc => {
                          if (loc.location?.name) {
                            locationNames.add(loc.location.name)
                          }
                        })
                      }
                      
                      // Convert to array and display
                      const uniqueLocations = Array.from(locationNames)
                      
                      if (uniqueLocations.length === 0) {
                        return '-'
                      } else if (uniqueLocations.length === 1) {
                        return uniqueLocations[0]
                      } else {
                        return (
                          <div className="flex items-center gap-1">
                            <span>{uniqueLocations[0]}</span>
                            <Badge variant="secondary" size="sm">
                              +{uniqueLocations.length - 1} more
                            </Badge>
                          </div>
                        )
                      }
                    })()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant={user.active ? 'success' : 'gray'} size="sm">
                    {user.active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex justify-center">
                    <ActionsDropdown
                      actions={[
                        {
                          label: 'View',
                          href: `/users/${user.id}`,
                          icon: 'view',
                          show: true
                        },
                        {
                          label: 'Edit',
                          href: `/users/${user.id}/edit`,
                          icon: 'edit',
                          show: canEdit
                        },
                        {
                          label: 'Delete',
                          onClick: () => handleDelete(user.id),
                          icon: 'delete',
                          variant: 'danger',
                          show: canDelete
                        }
                      ]}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="px-6 py-3 flex items-center justify-between border-t border-border bg-background-secondary">
        <div className="text-sm text-text-secondary">
          Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
          {pagination.total} results
        </div>
        <div className="flex items-center gap-4">
          <PageSizeSelector
            value={pagination.limit}
            onChange={handlePageSizeChange}
            disabled={loading}
          />
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1 || loading}
              onClick={() => fetchUsers(pagination.page - 1)}
            >
              {loading ? 'Loading...' : 'Previous'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages || loading}
              onClick={() => fetchUsers(pagination.page + 1)}
            >
              {loading ? 'Loading...' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </Card>

    {/* Delete Confirmation Dialog */}
    {userToDelete && (
      <DeleteUserDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setUserToDelete(null)
          setActivePackageClientCount(0)
          setInactiveClientCount(0)
        }}
        onConfirm={handleDeleteConfirm}
        userName={userToDelete.name}
        userRole={userToDelete.role}
        activePackageClientCount={activePackageClientCount}
        inactiveClientCount={inactiveClientCount}
        isLoading={checkingDelete}
      />
    )}

    {/* Reassignment Dialog for Deletion */}
    {userToDelete && (
      <LocationRemovalDialog
        isOpen={showReassignDialog}
        onClose={() => {
          setShowReassignDialog(false)
          setUserToDelete(null)
          setAffectedClients([])
        }}
        onConfirm={handleReassignmentComplete}
        affectedClients={affectedClients}
        currentTrainerId={userToDelete.id}
        currentTrainerName={userToDelete.name}
        title="Reassign Clients Before User Deactivation"
        description={`Before deactivating ${userToDelete.name}, ${affectedClients.length} client${affectedClients.length > 1 ? 's' : ''} with active packages must be reassigned to other trainers.${inactiveClientCount > 0 ? ` ${inactiveClientCount} inactive client${inactiveClientCount > 1 ? 's' : ''} will be automatically unassigned.` : ''} Once complete, the user will be marked as inactive.`}
        confirmButtonText="Reassign & Deactivate User"
      />
    )}
    </>
  )
}