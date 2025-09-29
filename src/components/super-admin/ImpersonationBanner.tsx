'use client'

import { useEffect } from 'react'
import { X, Shield, AlertTriangle } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface ImpersonationBannerProps {
  targetUserName?: string
  organizationName?: string
}

export default function ImpersonationBanner({ 
  targetUserName, 
  organizationName 
}: ImpersonationBannerProps) {
  const { data: session } = useSession()
  
  // Check if we're in an impersonation session
  const isImpersonating = session?.user?.isImpersonating || 
    (typeof window !== 'undefined' && sessionStorage.getItem('impersonating') === 'true')

  useEffect(() => {
    // Handle tab close to revoke token
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      if (isImpersonating) {
        const token = sessionStorage.getItem('temp-token')
        if (token) {
          // Use sendBeacon to ensure the request completes even as the tab closes
          navigator.sendBeacon('/api/auth/revoke-token', JSON.stringify({ token }))
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isImpersonating])

  if (!isImpersonating) {
    return null
  }

  const handleExit = () => {
    // Revoke the token and close the tab
    const token = sessionStorage.getItem('temp-token')
    if (token) {
      fetch('/api/auth/revoke-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      }).finally(() => {
        // Clear session storage
        sessionStorage.removeItem('impersonating')
        sessionStorage.removeItem('temp-token')
        // Close the tab
        window.close()
      })
    } else {
      window.close()
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="font-bold text-lg">SUPER ADMIN MODE</span>
            </div>
            <div className="h-6 w-px bg-red-400" />
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                Viewing as: <strong>{targetUserName || session?.user?.name}</strong>
                {organizationName && (
                  <> from <strong>{organizationName}</strong></>
                )}
              </span>
            </div>
          </div>
          <button
            onClick={handleExit}
            className="flex items-center gap-2 bg-red-700 hover:bg-red-800 px-4 py-2 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
            <span className="font-medium">Exit Admin Mode</span>
          </button>
        </div>
        <div className="mt-2 text-xs text-red-100">
          This is a temporary session for debugging. All actions are logged. Session expires in 1 hour.
        </div>
      </div>
    </div>
  )
}