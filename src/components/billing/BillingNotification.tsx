'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, X } from 'lucide-react'

interface BillingNotificationProps {
  showSuccess?: boolean
  showCanceled?: boolean
}

export function BillingNotification({ showSuccess, showCanceled }: BillingNotificationProps) {
  const [visible, setVisible] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (showSuccess || showCanceled) {
      setVisible(true)
      
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setVisible(false)
        // Clean up URL parameters after dismissing
        router.replace('/settings/billing')
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [showSuccess, showCanceled, router])

  const handleClose = () => {
    setVisible(false)
    router.replace('/settings/billing')
  }

  if (!visible) return null

  if (showSuccess) {
    return (
      <div className="rounded-lg bg-success-50 border border-success-200 p-4 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-success-600 hover:text-success-700"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-success-500 mt-0.5" />
          <div>
            <p className="font-semibold text-success-900">Subscription successful!</p>
            <p className="text-sm text-success-700 mt-1">
              Your account is being upgraded to Professional. This may take a few moments.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (showCanceled) {
    return (
      <div className="rounded-lg bg-warning-50 border border-warning-200 p-4 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-warning-600 hover:text-warning-700"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-warning-500 mt-0.5" />
          <div>
            <p className="font-semibold text-warning-900">Subscription canceled</p>
            <p className="text-sm text-warning-700 mt-1">
              Your subscription upgrade was canceled. You can try again anytime.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}