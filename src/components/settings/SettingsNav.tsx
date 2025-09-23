'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Package, 
  DollarSign, 
  MapPin, 
  Users, 
  CreditCard,
  Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'

const settingsLinks = [
  {
    href: '/settings',
    label: 'Organization',
    icon: Building2,
    description: 'Organization profile and details'
  },
  {
    href: '/settings/package-types',
    label: 'Package Types',
    icon: Package,
    description: 'Configure package offerings'
  },
  {
    href: '/settings/commission',
    label: 'Commission',
    icon: DollarSign,
    description: 'Configure calculation method and tiers'
  },
  {
    href: '/settings/locations',
    label: 'Locations',
    icon: MapPin,
    description: 'Manage gym locations'
  },
  {
    href: '/settings/team',
    label: 'Team',
    icon: Users,
    description: 'Manage team members',
    comingSoon: true
  },
  {
    href: '/settings/billing',
    label: 'Billing',
    icon: CreditCard,
    description: 'Subscription and payments'
  }
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {settingsLinks.map((link) => {
        const Icon = link.icon
        const isActive = pathname === link.href || 
                        (link.href !== '/settings' && pathname.startsWith(link.href))
        const isDisabled = link.comingSoon

        if (isDisabled) {
          return (
            <div
              key={link.href}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-text-tertiary opacity-50 cursor-not-allowed"
            >
              <Icon className="h-4 w-4" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {link.label}
                  <span className="text-xs bg-background-tertiary px-1.5 py-0.5 rounded">
                    Soon
                  </span>
                </div>
              </div>
            </div>
          )
        }

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary'
            )}
          >
            <Icon className="h-4 w-4" />
            <div className="flex-1">
              <div>{link.label}</div>
              {link.description && !isActive && (
                <div className="text-xs text-text-tertiary mt-0.5">
                  {link.description}
                </div>
              )}
            </div>
          </Link>
        )
      })}
    </nav>
  )
}