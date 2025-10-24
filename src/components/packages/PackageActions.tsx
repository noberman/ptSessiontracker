'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Trash2, AlertCircle } from 'lucide-react'

interface PackageActionsProps {
  packageId: string
  packageName: string
  hasSessionsLogged: boolean
}

export function PackageActions({ 
  packageId, 
  packageName,
  hasSessionsLogged 
}: PackageActionsProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setIsDeleting(true)
    setError('')

    try {
      console.log('Attempting to delete package:', packageId)
      const response = await fetch(`/api/packages/${packageId}`, {
        method: 'DELETE',
      })

      console.log('Delete response status:', response.status)
      
      if (!response.ok) {
        const data = await response.json()
        console.error('Delete failed:', data)
        throw new Error(data.error || 'Failed to delete package')
      }

      // Successfully deleted or deactivated
      console.log('Package deleted/deactivated successfully')
      
      // Redirect to packages list after successful deletion
      router.push('/packages')
      router.refresh()
    } catch (err) {
      console.error('Delete error:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete package')
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="space-y-4">
        <div className="flex items-start space-x-2 p-4 bg-warning-50 border border-warning-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-warning-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-warning-900">
              Are you sure you want to delete this package?
            </p>
            <p className="text-sm text-warning-700 mt-1">
              Package: <strong>{packageName}</strong>
            </p>
            {hasSessionsLogged ? (
              <p className="text-sm text-warning-700 mt-2">
                This package has sessions logged. It will be deactivated instead of deleted.
              </p>
            ) : (
              <p className="text-sm text-warning-700 mt-2">
                This action cannot be undone.
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-error-50 border border-error-200 rounded-md">
            <p className="text-sm text-error-800">{error}</p>
          </div>
        )}

        <div className="flex space-x-2">
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : hasSessionsLogged ? 'Deactivate Package' : 'Delete Package'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowConfirm(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-text-secondary mb-3">Danger Zone</h4>
      <Button
        variant="outline"
        className="text-error-600 hover:bg-error-50 hover:border-error-300"
        onClick={() => setShowConfirm(true)}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete Package
      </Button>
    </div>
  )
}