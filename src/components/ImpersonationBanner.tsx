'use client'

import { useSession, signOut } from 'next-auth/react'
import { Shield, X } from 'lucide-react'

export default function ImpersonationBanner() {
  const { data: session } = useSession()
  
  // Check if this is an impersonation session
  const isImpersonating = session?.user?.isImpersonating === true
  
  // Debug logging
  console.log('🎭 Impersonation Banner Debug:', {
    hasSession: !!session,
    userEmail: session?.user?.email,
    isImpersonating: session?.user?.isImpersonating,
    impersonatedBy: session?.user?.impersonatedBy,
    fullUser: session?.user
  })
  
  if (!isImpersonating) {
    return null
  }

  const handleEndImpersonation = async () => {
    // Sign out and redirect to super admin login
    await signOut({ callbackUrl: '/login?superadmin=true' })
  }

  return (
    <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5" />
        <span className="font-semibold">Super Admin Mode</span>
        <span className="text-red-100 text-sm">
          Viewing as: {session?.user?.email} | Admin: {session?.user?.impersonatedBy}
        </span>
      </div>
      <button
        onClick={handleEndImpersonation}
        className="flex items-center gap-1 text-sm bg-white text-red-600 px-3 py-1 rounded hover:bg-red-50 transition-colors"
      >
        <X className="h-4 w-4" />
        End Session
      </button>
    </div>
  )
}