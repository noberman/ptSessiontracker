'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils/cn'

export function Navigation() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  if (status === 'loading') {
    return (
      <nav className="bg-surface shadow-sm border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>
          </div>
        </div>
      </nav>
    )
  }

  if (!session) {
    return null
  }

  return (
    <nav className="bg-surface shadow-sm border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-bold text-text-primary">
              PT Tracker
            </Link>
            
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                href="/dashboard"
                className="text-text-secondary hover:text-text-primary hover:bg-surface-hover px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Dashboard
              </Link>
              
              {(session.user.role === 'TRAINER' || session.user.role === 'CLUB_MANAGER' || 
                session.user.role === 'PT_MANAGER' || session.user.role === 'ADMIN') && (
                <Link
                  href="/sessions"
                  className="text-text-secondary hover:text-text-primary hover:bg-surface-hover px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sessions
                </Link>
              )}
              
              {(session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER' || 
                session.user.role === 'ADMIN') && (
                <>
                  <Link
                    href="/clients"
                    className="text-text-secondary hover:text-text-primary hover:bg-surface-hover px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Clients
                  </Link>
                  <Link
                    href="/users"
                    className="text-text-secondary hover:text-text-primary hover:bg-surface-hover px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Users
                  </Link>
                </>
              )}
              
              {session.user.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="text-text-secondary hover:text-text-primary hover:bg-surface-hover px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Admin
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-right">
              <p className="text-text-primary font-medium">{session.user.name}</p>
              <Badge variant="gray" size="xs" className="mt-1">
                {session.user.role}
              </Badge>
            </div>
            
            <Button
              onClick={handleLogout}
              variant="danger"
              size="sm"
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}