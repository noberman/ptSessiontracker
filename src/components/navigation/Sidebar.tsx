'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Calendar,
  Users,
  Package,
  UserPlus,
  Menu,
  X,
  ChevronLeft,
  MapPin,
  DollarSign,
  Settings,
} from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { UserMenu } from './UserMenu'
import { OrgSwitcher } from './OrgSwitcher'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
  badge?: string
}

interface SidebarProps {
  isCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Sessions',
    href: '/sessions',
    icon: Calendar,
  },
  {
    title: 'Clients',
    href: '/clients',
    icon: Users,
  },
  {
    title: 'Packages',
    href: '/packages',
    icon: Package,
  },
  {
    title: 'Commission',
    href: '/commission',
    icon: DollarSign,
    roles: ['PT_MANAGER', 'ADMIN', 'CLUB_MANAGER'],
  },
  {
    title: 'My Commission',
    href: '/my-commission',
    icon: DollarSign,
    roles: ['TRAINER'],
  },
  {
    title: 'Locations',
    href: '/locations',
    icon: MapPin,
  },
  {
    title: 'Log Session',
    href: '/sessions/new',
    icon: UserPlus,
    roles: ['PERSONAL_TRAINER'],
  },
  {
    title: 'Users',
    href: '/users',
    icon: Users,
    roles: ['PT_MANAGER', 'ADMIN', 'CLUB_MANAGER'],
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['PT_MANAGER', 'ADMIN', 'CLUB_MANAGER'],
  },
]

export function Sidebar({ isCollapsed = false, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const userRole = session?.user?.role

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true
    return item.roles.includes(userRole as string)
  })

  const NavContent = () => (
    <>
      <div className="flex h-16 items-center justify-between border-b px-4">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2 font-semibold",
            isCollapsed && "justify-center"
          )}
        >
          <Image 
            src="/Icon.svg" 
            alt="FitSync" 
            width={32} 
            height={32}
            className="h-8 w-8"
          />
          {!isCollapsed && <span className="text-primary-700 font-bold text-lg">FitSync</span>}
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="hidden lg:flex h-8 w-8 p-0"
          onClick={() => onCollapsedChange?.(!isCollapsed)}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden h-8 w-8 p-0"
          onClick={() => setIsMobileOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? item.title : undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && (
                <span className="flex-1">{item.title}</span>
              )}
              {!isCollapsed && item.badge && (
                <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-4 space-y-3">
        {/* Organization Switcher - only shows if user has multiple orgs */}
        <OrgSwitcher />
        
        {/* Divider between org switcher and user menu (only if org switcher is shown) */}
        {session?.user?.availableOrgs && session.user.availableOrgs.length > 1 && (
          <Separator />
        )}
        
        {/* User Profile Menu */}
        <UserMenu isCollapsed={isCollapsed} />
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed left-4 top-4 z-40 lg:hidden h-10 w-10 p-0"
        onClick={() => setIsMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r bg-background transition-transform lg:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent />
      </aside>

      {/* Desktop Sidebar - Fixed position */}
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:border-r lg:bg-background transition-all duration-300",
          isCollapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        <NavContent />
      </aside>
    </>
  )
}