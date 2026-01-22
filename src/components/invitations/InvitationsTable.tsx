'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { formatDistanceToNow } from 'date-fns'
import { Mail, Copy, X, Clock, CheckCircle, XCircle } from 'lucide-react'

interface Invitation {
  id: string
  email: string
  role: string
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'
  expiresAt: string
  createdAt: string
  acceptedAt?: string | null
  invitedBy: {
    name: string
    email: string
  }
}

interface InvitationsTableProps {
  invitations: Invitation[]
  loading: boolean
  onRefresh: () => void
  showActions?: boolean
  showStatus?: boolean
}

export function InvitationsTable({
  invitations,
  loading,
  onRefresh,
  showActions = true,
  showStatus = false,
}: InvitationsTableProps) {
  const [resending, setResending] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [invitationToCancel, setInvitationToCancel] = useState<Invitation | null>(null)
  const [cancelError, setCancelError] = useState('')

  const handleResend = async (invitationId: string) => {
    setResending(invitationId)
    try {
      const response = await fetch(`/api/invitations/${invitationId}/resend`, {
        method: 'POST',
      })

      if (response.ok) {
        onRefresh()
        alert('Invitation resent successfully')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to resend invitation')
      }
    } catch (error) {
      console.error('Failed to resend:', error)
      alert('Failed to resend invitation')
    } finally {
      setResending(null)
    }
  }

  const handleCancel = (invitation: Invitation) => {
    setCancelError('')
    setInvitationToCancel(invitation)
  }

  const confirmCancelInvitation = async () => {
    if (!invitationToCancel) return

    setCancelling(invitationToCancel.id)
    try {
      const response = await fetch(`/api/invitations/${invitationToCancel.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setInvitationToCancel(null)
        onRefresh()
      } else {
        const data = await response.json()
        setCancelError(data.error || 'Failed to cancel invitation')
      }
    } catch (error) {
      console.error('Failed to cancel:', error)
      setCancelError('Failed to cancel invitation')
    } finally {
      setCancelling(null)
    }
  }

  const copyInviteLink = (invitationId: string, token: string) => {
    const link = `${window.location.origin}/invitation/${token}`
    navigator.clipboard.writeText(link)
    setCopied(invitationId)
    setTimeout(() => setCopied(null), 2000)
  }

  const getStatusBadge = (status: string, expiresAt?: string) => {
    if (status === 'PENDING' && expiresAt) {
      const isExpiring = new Date(expiresAt) < new Date(Date.now() + 24 * 60 * 60 * 1000)
      if (isExpiring) {
        return <Badge variant="warning" size="sm">Expiring Soon</Badge>
      }
    }

    switch (status) {
      case 'PENDING':
        return <Badge variant="default" size="sm">Pending</Badge>
      case 'ACCEPTED':
        return <Badge variant="success" size="sm">Accepted</Badge>
      case 'EXPIRED':
        return <Badge variant="gray" size="sm">Expired</Badge>
      case 'CANCELLED':
        return <Badge variant="gray" size="sm">Cancelled</Badge>
      default:
        return null
    }
  }

  const getRoleBadge = (role: string) => {
    const roleLabels: Record<string, string> = {
      TRAINER: 'Trainer',
      PT_MANAGER: 'PT Manager',
      CLUB_MANAGER: 'Club Manager',
      ADMIN: 'Admin',
    }
    return <Badge variant="default" size="sm">{roleLabels[role] || role}</Badge>
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-text-secondary">Loading invitations...</p>
      </div>
    )
  }

  if (invitations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Mail className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
        <p className="text-text-secondary mb-4">No invitations found</p>
        <Button onClick={onRefresh} variant="outline" size="sm">
          Refresh
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-background">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Invited By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Sent
              </th>
              {showStatus && (
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Status
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Expires
              </th>
              {showActions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-border">
            {invitations.map((invitation) => {
              const expiresAt = new Date(invitation.expiresAt)
              const isExpired = invitation.status === 'EXPIRED' || expiresAt < new Date()
              const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

              return (
                <tr key={invitation.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-text-primary">
                      {invitation.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(invitation.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-text-secondary">
                      {invitation.invitedBy.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-text-secondary">
                      {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}
                    </div>
                  </td>
                  {showStatus && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(invitation.status, invitation.expiresAt)}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-text-secondary">
                      {invitation.status === 'ACCEPTED' ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-success-500" />
                          Accepted {invitation.acceptedAt && formatDistanceToNow(new Date(invitation.acceptedAt), { addSuffix: true })}
                        </span>
                      ) : invitation.status === 'CANCELLED' ? (
                        <span className="flex items-center gap-1">
                          <XCircle className="w-4 h-4 text-text-tertiary" />
                          Cancelled
                        </span>
                      ) : isExpired ? (
                        <span className="text-error">Expired</span>
                      ) : daysUntilExpiry <= 1 ? (
                        <span className="text-warning-600 font-medium">
                          Expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span>{daysUntilExpiry} days</span>
                      )}
                    </div>
                  </td>
                  {showActions && invitation.status === 'PENDING' && !isExpired && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteLink(invitation.id, (invitation as any).token)}
                          disabled={copied === invitation.id}
                        >
                          {copied === invitation.id ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-1" />
                              Copy Link
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResend(invitation.id)}
                          disabled={resending === invitation.id}
                        >
                          {resending === invitation.id ? (
                            'Sending...'
                          ) : (
                            <>
                              <Mail className="w-4 h-4 mr-1" />
                              Resend
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(invitation)}
                          disabled={cancelling === invitation.id}
                          className="text-error hover:text-error-600"
                        >
                          {cancelling === invitation.id ? (
                            'Cancelling...'
                          ) : (
                            <>
                              <X className="w-4 h-4 mr-1" />
                              Cancel
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  )}
                  {showActions && (invitation.status !== 'PENDING' || isExpired) && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {/* Empty cell for non-pending invitations */}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Cancel Invitation Confirmation Modal */}
      <ConfirmModal
        isOpen={!!invitationToCancel}
        onClose={() => {
          setInvitationToCancel(null)
          setCancelError('')
        }}
        onConfirm={confirmCancelInvitation}
        title="Cancel Invitation"
        message={
          cancelError
            ? cancelError
            : invitationToCancel
              ? `Are you sure you want to cancel the invitation for ${invitationToCancel.email}?`
              : ''
        }
        confirmLabel="Cancel Invitation"
        cancelLabel="Keep"
        variant="danger"
        loading={!!cancelling}
      />
    </div>
  )
}