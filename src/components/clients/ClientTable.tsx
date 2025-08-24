'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

interface Client {
  id: string
  name: string
  email: string
  phone: string | null
  active: boolean
  location?: {
    name: string
  } | null
  primaryTrainer?: {
    name: string
    email: string
  } | null
  _count: {
    sessions: number
    packages: number
  }
  createdAt: string | Date
  updatedAt: string | Date
}

interface ClientTableProps {
  initialClients: Client[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  canEdit?: boolean
  canDelete?: boolean
}

export function ClientTable({ 
  initialClients, 
  pagination: initialPagination,
  canEdit = false,
  canDelete = false 
}: ClientTableProps) {
  const [clients, setClients] = useState(initialClients)
  const [pagination, setPagination] = useState(initialPagination)
  const [loading, setLoading] = useState(false)

  const handleDelete = async (clientId: string) => {
    if (!confirm('Are you sure you want to deactivate this client?')) {
      return
    }

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setClients(clients.filter(c => c.id !== clientId))
      } else {
        alert('Failed to deactivate client')
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Failed to deactivate client')
    }
  }

  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-background-secondary">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Trainer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Sessions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-border">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-surface-hover transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      {client.name}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {client._count.packages} package{client._count.packages !== 1 ? 's' : ''}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm text-text-primary">
                      {client.email}
                    </div>
                    {client.phone && (
                      <div className="text-xs text-text-secondary">
                        {client.phone}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-text-secondary">
                    {client.location?.name || 'No location'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm">
                    {client.primaryTrainer ? (
                      <div>
                        <div className="text-text-primary">
                          {client.primaryTrainer.name}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {client.primaryTrainer.email}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="warning" size="sm">
                        Unassigned
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-text-primary">
                    {client._count.sessions}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant={client.active ? 'success' : 'gray'} size="sm">
                    {client.active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex space-x-2">
                    <Link href={`/clients/${client.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                    {canEdit && (
                      <Link href={`/clients/${client.id}/edit`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                    )}
                    {canDelete && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(client.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-text-secondary">
                  No clients found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="px-6 py-3 flex items-center justify-between border-t border-border bg-background-secondary">
        <div className="text-sm text-text-secondary">
          Showing {clients.length > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
          {pagination.total} results
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  )
}