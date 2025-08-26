'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { AlertCircle } from 'lucide-react'

interface SessionEditFormProps {
  session: {
    id: string
    sessionDate: Date
    sessionValue: number
    notes: string | null
    validated: boolean
    validatedAt: Date | null
    client: {
      id: string
      name: string
      email: string
    }
    trainer: {
      id: string
      name: string
      email: string
    }
    location: {
      id: string
      name: string
    } | null
    package: {
      id: string
      name: string
      packageType: string
    } | null
  }
  currentUserRole: string
  canEditDate: boolean
  canEditValidation: boolean
}

export function SessionEditForm({ 
  session, 
  currentUserRole, 
  canEditDate, 
  canEditValidation 
}: SessionEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showReasonDialog, setShowReasonDialog] = useState(false)
  const [editReason, setEditReason] = useState('')
  
  // Format date and time from the session
  const sessionDateTime = new Date(session.sessionDate)
  const formattedDate = sessionDateTime.toISOString().split('T')[0]
  const formattedTime = sessionDateTime.toTimeString().slice(0, 5)
  
  const [formData, setFormData] = useState({
    sessionDate: formattedDate,
    sessionTime: formattedTime,
    notes: session.notes || '',
    validated: session.validated,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // For significant changes, require a reason
    const dateChanged = formData.sessionDate !== formattedDate || formData.sessionTime !== formattedTime
    const validationChanged = formData.validated !== session.validated
    
    if ((dateChanged || validationChanged) && !editReason && currentUserRole !== 'ADMIN') {
      setShowReasonDialog(true)
      return
    }
    
    setError('')
    setLoading(true)

    try {
      // Combine date and time
      const sessionDateTime = new Date(`${formData.sessionDate}T${formData.sessionTime}`)
      
      const updateData: any = {
        notes: formData.notes,
      }
      
      if (canEditDate) {
        updateData.sessionDate = sessionDateTime.toISOString()
      }
      
      if (canEditValidation) {
        updateData.validated = formData.validated
      }
      
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update session')
      }

      // Redirect to session details page
      router.push(`/sessions/${session.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to update session')
      setLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Edit Session Details</CardTitle>
        </CardHeader>
        <CardContent>
          {session.validated && (
            <div className="mb-4 p-4 bg-warning-50 border border-warning-200 rounded-lg flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-warning-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning-900">
                  This session has been validated
                </p>
                <p className="text-sm text-warning-700 mt-1">
                  Editing validated sessions requires special permissions and should be done carefully.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-error-50 border border-error-200 p-4">
                <p className="text-sm text-error-700">{error}</p>
              </div>
            )}

            {/* Read-only fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Client
                </label>
                <div className="block w-full rounded-lg border border-border px-3 py-2 bg-background-secondary text-text-secondary text-sm">
                  {session.client.name}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Trainer
                </label>
                <div className="block w-full rounded-lg border border-border px-3 py-2 bg-background-secondary text-text-secondary text-sm">
                  {session.trainer.name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Location
                </label>
                <div className="block w-full rounded-lg border border-border px-3 py-2 bg-background-secondary text-text-secondary text-sm">
                  {session.location?.name || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Package
                </label>
                <div className="block w-full rounded-lg border border-border px-3 py-2 bg-background-secondary text-text-secondary text-sm">
                  {session.package?.name || 'N/A'}
                </div>
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sessionDate" className="block text-sm font-medium text-text-primary mb-1">
                  Session Date {!canEditDate && '(Read Only)'}
                </label>
                <Input
                  id="sessionDate"
                  type="date"
                  required
                  value={formData.sessionDate}
                  onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
                  disabled={!canEditDate}
                  className={!canEditDate ? 'bg-background-secondary' : ''}
                />
              </div>
              <div>
                <label htmlFor="sessionTime" className="block text-sm font-medium text-text-primary mb-1">
                  Session Time {!canEditDate && '(Read Only)'}
                </label>
                <Input
                  id="sessionTime"
                  type="time"
                  required
                  value={formData.sessionTime}
                  onChange={(e) => setFormData({ ...formData, sessionTime: e.target.value })}
                  disabled={!canEditDate}
                  className={!canEditDate ? 'bg-background-secondary' : ''}
                />
              </div>
            </div>

            {/* Validation Status */}
            {canEditValidation ? (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Validation Status (Admin Override)
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="validated"
                      checked={!formData.validated}
                      onChange={() => setFormData({ ...formData, validated: false })}
                      className="mr-2"
                    />
                    <Badge variant="warning">Pending</Badge>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="validated"
                      checked={formData.validated}
                      onChange={() => setFormData({ ...formData, validated: true })}
                      className="mr-2"
                    />
                    <Badge variant="success">Validated</Badge>
                  </label>
                </div>
                <p className="text-xs text-warning-600 mt-2">
                  ⚠️ Manual validation override should only be used in exceptional circumstances
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Validation Status
                </label>
                <div className="flex items-center space-x-2">
                  <Badge variant={session.validated ? "success" : "warning"}>
                    {session.validated ? "Validated" : "Pending"}
                  </Badge>
                  {!session.validated && (
                    <span className="text-sm text-text-secondary">
                      (Client must validate via email link)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-text-primary mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                placeholder="Any notes about this session..."
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/sessions/${session.id}`)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Reason Dialog */}
      {showReasonDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Reason for Edit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary mb-4">
                Please provide a reason for editing this session. This will be logged in the audit trail.
              </p>
              <textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                rows={3}
                className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm mb-4"
                placeholder="Enter reason for changes..."
                autoFocus
              />
              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    setShowReasonDialog(false)
                    handleSubmit(new Event('submit') as any)
                  }}
                  disabled={!editReason}
                  className="flex-1"
                >
                  Continue
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReasonDialog(false)
                    setEditReason('')
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}