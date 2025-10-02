'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { RefreshCw, UserCheck } from 'lucide-react'

interface ArchivedUser {
  id: string
  name: string
  email: string
  role: string
  location?: {
    name: string
  } | null
  updatedAt: string | Date
}

interface ArchivedUsersTableProps {
  users: ArchivedUser[]
  loading: boolean
  onReactivate: (userId: string) => Promise<void>
  onRefresh: () => void
}

const roleColors = {
  ADMIN: 'error',
  PT_MANAGER: 'warning',
  CLUB_MANAGER: 'secondary',
  TRAINER: 'default',
} as const

export function ArchivedUsersTable({ 
  users, 
  loading, 
  onReactivate,
  onRefresh
}: ArchivedUsersTableProps) {
  const [reactivatingIds, setReactivatingIds] = useState<Set<string>>(new Set())

  const handleReactivate = async (userId: string) => {
    setReactivatingIds(prev => new Set(prev).add(userId))
    try {
      await onReactivate(userId)
    } finally {
      setReactivatingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="text-sm text-text-secondary">Loading archived users...</div>
        </div>
      </Card>
    )
  }

  if (users.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-text-secondary">No archived users found</p>
          <p className="text-sm text-text-tertiary mt-2">
            Deleted users will appear here and can be reactivated
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="none">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-text-primary">
          Archived Users ({users.length})
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <div className="overflow-x-auto">
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
                Archived On
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
                  <div className="text-sm text-text-secondary">
                    {formatDate(user.updatedAt)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReactivate(user.id)}
                      disabled={reactivatingIds.has(user.id)}
                    >
                      {reactivatingIds.has(user.id) ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Reactivate
                        </>
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}