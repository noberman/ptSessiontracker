'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Settings, LogOut, ChevronDown, User } from 'lucide-react'

export function Navigation() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator'
      case 'PT_MANAGER':
        return 'PT Manager'
      case 'CLUB_MANAGER':
        return 'Club Manager'
      case 'TRAINER':
        return 'Trainer'
      default:
        return role
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
              
              {session.user.role === 'TRAINER' && (
                <Link
                  href="/my-commission"
                  className="text-text-secondary hover:text-text-primary hover:bg-surface-hover px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  My Commission
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
                    href="/packages"
                    className="text-text-secondary hover:text-text-primary hover:bg-surface-hover px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Packages
                  </Link>
                  <Link
                    href="/commission"
                    className="text-text-secondary hover:text-text-primary hover:bg-surface-hover px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Commission
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

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-surface-hover transition-colors"
            >
              <div className="text-sm text-right">
                <p className="text-text-primary font-medium">{session.user.name}</p>
                <Badge variant="gray" size="xs" className="mt-1">
                  {getRoleDisplay(session.user.role)}
                </Badge>
              </div>
              <ChevronDown className={`h-4 w-4 text-text-secondary transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-background-primary border border-border rounded-md shadow-lg z-50">
                <div className="py-1">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-sm font-medium text-text-primary">{session.user.name}</p>
                    <p className="text-xs text-text-secondary">{session.user.email}</p>
                  </div>
                  
                  {(session.user.role === 'PT_MANAGER' || 
                    session.user.role === 'ADMIN' || 
                    session.user.role === 'CLUB_MANAGER' ||
                    session.user.role?.toUpperCase() === 'ADMIN' ||
                    session.user.role?.toUpperCase() === 'PT_MANAGER' ||
                    session.user.role?.toUpperCase() === 'CLUB_MANAGER') && (
                    <Link
                      href="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-background-secondary transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  )}
                  
                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-background-secondary transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false)
                        handleLogout()
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-background-secondary transition-colors w-full text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}