'use client'

import { useState, useEffect } from 'react'
import { UserTable } from '@/components/users/UserTable'
import { InvitationsTable } from '@/components/invitations/InvitationsTable'
import InviteModal from '@/components/invitations/InviteModal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { UserSearch } from '@/components/users/UserSearch'
import Link from 'next/link'
import { Users, Mail, Clock, CheckCircle } from 'lucide-react'

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
  currentUserLocationId?: string | null
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
  currentUserLocationId,
  canEdit,
  canDelete,
  organizationId,
  usageLimits,
}: UsersPageClientProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'pending' | 'history'>('members')
  const [invitations, setInvitations] = useState<any[]>([])
  const [invitationStats, setInvitationStats] = useState({
    pending: 0,
    accepted: 0,
    expired: 0,
  })
  const [loading, setLoading] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)

  // Fetch invitations when tab changes
  useEffect(() => {
    if (activeTab !== 'members') {
      fetchInvitations()
    }
  }, [activeTab])

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

  // Calculate team capacity
  const activeMembers = pagination.total
  const pendingInvites = invitationStats.pending
  const totalUsed = activeMembers + pendingInvites

  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
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
                    {usageLimits?.remaining !== undefined && usageLimits.remaining > 0 && (
                      <Badge variant="gray" size="sm" className="ml-2">
                        {usageLimits.remaining} left
                      </Badge>
                    )}
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
      </div>
      
      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal 
          organizationId={organizationId}
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false)
            fetchInvitations() // Refresh after modal closes
          }}
        />
      )}
    </div>
  )
}