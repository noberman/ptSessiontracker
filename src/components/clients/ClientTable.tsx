'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { PageSizeSelector } from '@/components/ui/PageSizeSelector'
import { ActionsDropdown } from '@/components/ui/ActionsDropdown'

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
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Fetch clients when page or limit changes
  const fetchClients = async (targetPage: number, targetLimit?: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', String(targetPage))
      if (targetLimit) {
        params.set('limit', String(targetLimit))
      }
      
      const response = await fetch(`/api/clients/list?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch clients')
      
      const data = await response.json()
      setClients(data.clients)
      setPagination(data.pagination)
      
      // Update URL without page refresh
      router.push(`/clients?${params.toString()}`, { scroll: false })
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePageSizeChange = (newLimit: number) => {
    // Reset to page 1 when changing page size
    fetchClients(1, newLimit)
  }

  // Update state when props change (when filters are applied)
  useEffect(() => {
    setClients(initialClients)
    setPagination(initialPagination)
  }, [initialClients, initialPagination])

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
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Trainer
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
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-surface-hover transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      {client.name}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {client.email}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {client._count.packages} package{client._count.packages !== 1 ? 's' : ''}
                    </div>
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
                  <Badge variant={client.active ? 'success' : 'gray'} size="sm">
                    {client.active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex justify-center">
                    <ActionsDropdown
                      actions={[
                        {
                          label: 'View',
                          href: `/clients/${client.id}`,
                          icon: 'view',
                          show: true
                        },
                        {
                          label: 'Edit',
                          href: `/clients/${client.id}/edit`,
                          icon: 'edit',
                          show: canEdit
                        },
                        {
                          label: 'Delete',
                          onClick: () => handleDelete(client.id),
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
            {clients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
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
              onClick={() => fetchClients(pagination.page - 1)}
            >
              {loading ? 'Loading...' : 'Previous'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages || loading}
              onClick={() => fetchClients(pagination.page + 1)}
            >
              {loading ? 'Loading...' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}