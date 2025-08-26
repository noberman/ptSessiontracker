'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  title: string
  href?: string
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const pathname = usePathname()

  // Auto-generate breadcrumbs from pathname if items not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []

    paths.forEach((path, index) => {
      const href = '/' + paths.slice(0, index + 1).join('/')
      
      // Format the title
      let title = path.charAt(0).toUpperCase() + path.slice(1)
      
      // Handle special cases
      if (path === 'new') {
        title = 'New'
      } else if (path === 'edit') {
        title = 'Edit'
      } else if (path.match(/^[a-f0-9-]+$/i) && path.length > 20) {
        // Likely an ID, skip or show as "Details"
        title = 'Details'
      }
      
      // Replace hyphens with spaces
      title = title.replace(/-/g, ' ')
      
      breadcrumbs.push({
        title,
        href: index < paths.length - 1 ? href : undefined,
      })
    })

    return breadcrumbs
  }

  const breadcrumbItems = items || generateBreadcrumbs()

  if (breadcrumbItems.length === 0) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center space-x-1 text-sm text-muted-foreground", className)}
    >
      <Link
        href="/dashboard"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-1" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.title}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.title}</span>
          )}
        </div>
      ))}
    </nav>
  )
}