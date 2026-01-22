'use client'

import { Modal } from './Modal'
import { Button } from './Button'
import { AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  loading = false
}: ConfirmModalProps) {
  const iconClasses = {
    danger: 'text-error-600 bg-error-50',
    warning: 'text-warning-600 bg-warning-50',
    info: 'text-primary bg-primary-50'
  }

  const buttonVariants = {
    danger: 'bg-error-600 hover:bg-error-700 text-white',
    warning: 'bg-warning-600 hover:bg-warning-700 text-white',
    info: undefined // Uses default primary button
  }

  const Icon = variant === 'info' ? Info : AlertTriangle

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center">
        <div className={cn('w-12 h-12 rounded-full flex items-center justify-center mb-4', iconClasses[variant])}>
          <Icon className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {title}
        </h3>

        <p className="text-sm text-text-secondary mb-6">
          {message}
        </p>

        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            className={cn('flex-1', buttonVariants[variant])}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
