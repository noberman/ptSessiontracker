'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { AlertTriangle } from 'lucide-react'

interface DeleteSessionDialogProps {
  sessionId: string
  clientName: string
  sessionDate: Date
  validated: boolean
  onClose: () => void
}

export function DeleteSessionDialog({
  sessionId,
  clientName,
  sessionDate,
  validated,
  onClose,
}: DeleteSessionDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmText, setConfirmText] = useState('')

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm')
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete session')
      }

      // Redirect to sessions list
      router.push('/sessions')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to delete session')
      setLoading(false)
    }
  }

  const formattedDate = new Date(sessionDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-error-600" />
            <span>Delete Session</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-lg bg-error-50 border border-error-200 p-4 mb-4">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-sm text-text-primary">
              Are you sure you want to delete this session?
            </p>

            <div className="p-3 bg-surface-secondary rounded-lg space-y-1">
              <p className="text-sm font-medium text-text-primary">
                {clientName}
              </p>
              <p className="text-sm text-text-secondary">
                {formattedDate}
              </p>
            </div>

            <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
              <p className="text-sm font-medium text-warning-900 mb-1">
                Warning: This action cannot be undone
              </p>
              <p className="text-sm text-warning-700">
                {validated 
                  ? 'This session has been validated and will be permanently deleted.'
                  : 'This session will be deleted and the session will be restored to the package.'}
              </p>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-text-primary mb-1">
                Type DELETE to confirm
              </label>
              <input
                id="confirm"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="block w-full rounded-lg border border-border px-3 py-2 text-text-primary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                autoFocus
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <Button
                onClick={handleDelete}
                variant="danger"
                disabled={loading || confirmText !== 'DELETE'}
                className="flex-1"
              >
                {loading ? 'Deleting...' : 'Delete Session'}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}