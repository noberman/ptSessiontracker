'use client'

import { useState, useEffect } from 'react'
import { UserTable } from '@/components/users/UserTable'
import { ArchivedUsersTable } from '@/components/users/ArchivedUsersTable'
import { InvitationsTable } from '@/components/invitations/InvitationsTable'
import InviteModal from '@/components/invitations/InviteModal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { UserSearch } from '@/components/users/UserSearch'
import Link from 'next/link'
import { Users, Mail, Clock, CheckCircle, Archive } from 'lucide-react'

interface UsersPageClientProps {
  initialUsers: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  locations: any[]
  currentUserRole: string
  canEdit: boolean
  canDelete: boolean
  organizationId: string
  usageLimits?: {
    allowed: boolean
    remaining?: number
    reason?: string
  }
}

export default function UsersPageClient({
  initialUsers,
  pagination,
  locations,
  currentUserRole,
  canEdit,
  canDelete,
  organizationId,
  usageLimits,
}: UsersPageClientProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'pending' | 'history' | 'archive'>('members')
  const [invitations, setInvitations] = useState<any[]>([])
  const [invitationStats, setInvitationStats] = useState({
    pending: 0,
    accepted: 0,
    expired: 0,
  })
  const [loading, setLoading] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [archivedUsers, setArchivedUsers] = useState<any[]>([])
  const [archivedCount, setArchivedCount] = useState(0)
  const [archiveLoading, setArchiveLoading] = useState(false)

  // Fetch invitations when tab changes
  useEffect(() => {
    if (activeTab === 'pending' || activeTab === 'history') {
      fetchInvitations()
    } else if (activeTab === 'archive' && archivedUsers.length === 0) {
      fetchArchivedUsers()
    }
  }, [activeTab])

  // Fetch archive count on mount
  useEffect(() => {
    fetch('/api/users/list?active=false&limit=1')
      .then(res => res.json())
      .then(data => {
        if (data.pagination?.total) {
          setArchivedCount(data.pagination.total)
        }
      })
      .catch(console.error)
  }, [])

  const fetchInvitations = async () => {
    setLoading(true)
    try {
      const status = activeTab === 'pending' ? 'PENDING' : activeTab === 'history' ? '' : ''
      const response = await fetch(`/api/invitations${status ? `?status=${status}` : ''}`)
      const data = await response.json()
      
      if (response.ok) {
        setInvitations(data.invitations || [])
        
        // Calculate stats
        const stats = {
          pending: 0,
          accepted: 0,
          expired: 0,
        }
        
        data.invitations?.forEach((inv: any) => {
          if (inv.status === 'PENDING') stats.pending++
          else if (inv.status === 'ACCEPTED') stats.accepted++
          else if (inv.status === 'EXPIRED') stats.expired++
        })
        
        setInvitationStats(stats)
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchArchivedUsers = async () => {
    setArchiveLoading(true)
    try {
      const response = await fetch('/api/users/list?active=false')
      const data = await response.json()
      
      if (response.ok) {
        setArchivedUsers(data.users || [])
        setArchivedCount(data.pagination?.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch archived users:', error)
    } finally {
      setArchiveLoading(false)
    }
  }

  const handleReactivateUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/reactivate`, {
        method: 'POST',
      })
      
      if (response.ok) {
        // Remove from archived list
        setArchivedUsers(prev => prev.filter(u => u.id !== userId))
        setArchivedCount(prev => prev - 1)
        // Optionally refresh the main users list if on that tab
        window.location.reload()
      } else {
        const error = await response.json()
        alert(`Failed to reactivate user: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to reactivate user:', error)
      alert('Failed to reactivate user')
    }
  }

  // Calculate team capacity
  const activeMembers = pagination.total
  const pendingInvites = invitationStats.pending
  const totalUsed = activeMembers + pendingInvites

  return (
    <div>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Team Management</h1>
            <p className="text-sm text-text-secondary mt-1">
              {usageLimits?.remaining !== undefined && usageLimits.remaining !== -1 ? (
                <>
                  <span className="font-medium">{totalUsed}</span> of{' '}
                  <span className="font-medium">{totalUsed + usageLimits.remaining}</span> slots used
                  {' '}({activeMembers} active, {pendingInvites} pending)
                </>
              ) : (
                <>Manage trainers and staff members</>
              )}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('members')}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                ${activeTab === 'members'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                }
              `}
            >
              <Users className="w-4 h-4" />
              Team Members
              <Badge variant="gray" size="sm">{activeMembers}</Badge>
            </button>
            
            <button
              onClick={() => setActiveTab('pending')}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                ${activeTab === 'pending'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                }
              `}
            >
              <Mail className="w-4 h-4" />
              Pending Invitations
              {invitationStats.pending > 0 && (
                <Badge variant="warning" size="sm">{invitationStats.pending}</Badge>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('history')}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                ${activeTab === 'history'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                }
              `}
            >
              <Clock className="w-4 h-4" />
              Invitation History
            </button>
            
            {currentUserRole === 'ADMIN' && (
              <button
                onClick={() => setActiveTab('archive')}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                  ${activeTab === 'archive'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                  }
                `}
              >
                <Archive className="w-4 h-4" />
                Archived Users
                {archivedCount > 0 && (
                  <Badge variant="gray" size="sm">{archivedCount}</Badge>
                )}
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'members' && (
          <>
            {/* Search and Add Button */}
            <div className="mb-6 flex justify-between items-start gap-4">
              <div className="flex-1">
                <UserSearch
                  locations={currentUserRole === 'CLUB_MANAGER' ? [] : locations}
                  currentRole={currentUserRole}
                />
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <Link href="/users/new">
                    <Button variant="outline">Add Manually</Button>
                  </Link>
                  <Button
                    onClick={() => setShowInviteModal(true)}
                    disabled={usageLimits?.allowed === false}
                    title={usageLimits?.reason}
                  >
                    Invite Team Member
                  </Button>
                </div>
              )}
            </div>

            {/* Users Table */}
            <UserTable
              initialUsers={initialUsers}
              pagination={pagination}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          </>
        )}

        {activeTab === 'pending' && (
          <InvitationsTable
            invitations={invitations.filter(inv => inv.status === 'PENDING')}
            loading={loading}
            onRefresh={fetchInvitations}
            showActions={true}
          />
        )}

        {activeTab === 'history' && (
          <InvitationsTable
            invitations={invitations}
            loading={loading}
            onRefresh={fetchInvitations}
            showActions={false}
            showStatus={true}
          />
        )}

        {activeTab === 'archive' && (
          <ArchivedUsersTable
            users={archivedUsers}
            loading={archiveLoading}
            onReactivate={handleReactivateUser}
            onRefresh={fetchArchivedUsers}
          />
        )}
      
      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal 
          organizationId={organizationId}
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false)
            fetchInvitations() // Refresh after modal closes
          }}
          usageLimits={usageLimits}
        />
      )}
    </div>
  )
}