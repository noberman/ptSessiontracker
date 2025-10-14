'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface DeleteUserDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  userName: string
  userRole: string
  clientCount?: number
  isLoading?: boolean
}

export function DeleteUserDialog({
  isOpen,
  onClose,
  onConfirm,
  userName,
  userRole,
  clientCount = 0,
  isLoading = false
}: DeleteUserDialogProps) {
  const [confirmChecked, setConfirmChecked] = useState(false)

  const handleConfirm = () => {
    if (!confirmChecked) return
    onConfirm()
  }

  const handleClose = () => {
    setConfirmChecked(false)
    onClose()
  }

  if (!isOpen) return null

  const hasClients = clientCount > 0 && (userRole === 'TRAINER' || userRole === 'PT_MANAGER')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Confirm User Deactivation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* User info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="font-medium text-gray-900">{userName}</p>
            <p className="text-sm text-gray-600 capitalize">{userRole.toLowerCase().replace('_', ' ')}</p>
          </div>

          {/* Warnings */}
          <div className="space-y-3">
            {hasClients && (
              <div className="flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Active Clients Require Reassignment
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    This user has <strong>{clientCount} active {clientCount === 1 ? 'client' : 'clients'}</strong> that 
                    must be reassigned before deletion.
                  </p>
                </div>
              </div>
            )}

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>This action will:</strong>
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Mark the user as inactive</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Prevent them from logging in</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Remove them from active user lists</span>
                </li>
                {hasClients && (
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Require reassignment of all clients first</span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Confirmation checkbox */}
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="confirm-delete"
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="confirm-delete" className="text-sm text-gray-700">
              I understand the consequences and want to proceed with deactivating this user
              {hasClients && ' and reassigning their clients'}
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirm}
              disabled={!confirmChecked || isLoading}
              className="flex-1"
            >
              {isLoading ? 'Processing...' : (hasClients ? 'Proceed to Reassignment' : 'Deactivate User')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}