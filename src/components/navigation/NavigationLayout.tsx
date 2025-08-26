'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Breadcrumbs } from './Breadcrumbs'
import { cn } from '@/lib/utils'

interface NavigationLayoutProps {
  children: React.ReactNode
  showBreadcrumbs?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

export function NavigationLayout({ 
  children, 
  showBreadcrumbs = true,
  maxWidth = '2xl'
}: NavigationLayoutProps) {
  const { status } = useSession()
  const pathname = usePathname()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Don't show navigation on login or public validation pages
  const publicPaths = ['/login', '/validate']
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated' || isPublicPath) {
    return <>{children}</>
  }

  const maxWidthClass = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full',
  }[maxWidth]

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onCollapsedChange={setIsSidebarCollapsed} 
      />
      {/* Main content with dynamic padding based on sidebar state */}
      <main 
        className={cn(
          "transition-all duration-300",
          isSidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <div className={cn("mx-auto px-4 sm:px-6 lg:px-8 py-8", maxWidthClass)}>
          {showBreadcrumbs && pathname !== '/dashboard' && (
            <div className="mb-6">
              <Breadcrumbs />
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  )
}