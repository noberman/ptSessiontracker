'use client'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { AlertTriangle } from 'lucide-react'

interface DeleteProfileDialogProps {
  profile: {
    name: string
    _count: {
      users: number
    }
  }
  onClose: () => void
  onConfirm: () => void
}

export function DeleteProfileDialog({ profile, onClose, onConfirm }: DeleteProfileDialogProps) {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Delete Commission Profile"
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning-600 mt-0.5" />
          <div className="space-y-2">
            <p className="text-text-primary">
              Are you sure you want to delete the profile <strong>&quot;{profile.name}&quot;</strong>?
            </p>
            <p className="text-sm text-text-secondary">
              This action cannot be undone. The profile will be permanently removed.
            </p>
            {profile._count.users > 0 && (
              <p className="text-sm text-error-600">
                Warning: This profile has {profile._count.users} assigned trainer{profile._count.users === 1 ? '' : 's'}.
                You must reassign them before deleting this profile.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={profile._count.users > 0}
          >
            Delete Profile
          </Button>
        </div>
      </div>
    </Modal>
  )
}