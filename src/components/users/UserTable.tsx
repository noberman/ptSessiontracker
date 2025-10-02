'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { PageSizeSelector } from '@/components/ui/PageSizeSelector'
import { ActionsDropdown } from '@/components/ui/ActionsDropdown'

interface User {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  location?: {
    name: string
  } | null
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

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setUsers(users.filter(u => u.id !== userId))
      } else {
        alert('Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    }
  }

  return (
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
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-text-secondary">
                    {user.location?.name || '-'}
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
  )
}