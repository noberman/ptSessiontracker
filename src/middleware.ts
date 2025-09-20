import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'

// Domain configuration
// For staging, both domains point to the same Railway URL
const isStaging = typeof process !== 'undefined' && (
  process.env.LANDING_DOMAIN?.includes('railway') || 
  process.env.APP_DOMAIN?.includes('railway')
)
const LANDING_DOMAIN = process.env.LANDING_DOMAIN || 'www.fitsync.io'
const APP_DOMAIN = process.env.APP_DOMAIN || 'www.fitsync.io'

// Routes that should only be accessible on the app subdomain
const APP_ONLY_ROUTES = [
  '/dashboard',
  '/sessions',
  '/clients',
  '/users',
  '/packages',
  '/reports',
  '/admin',
  '/profile',
  '/locations',
  '/package-templates',
  '/login',
  '/api',
]

// Routes that should only be accessible on the landing domain
const LANDING_ONLY_ROUTES = [
  '/',
  '/features',
  '/pricing',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
]

function isAppRoute(pathname: string): boolean {
  return APP_ONLY_ROUTES.some(route => pathname.startsWith(route))
}

function isLandingRoute(pathname: string): boolean {
  // Only exact match for root path
  if (pathname === '/') return true
  // Check other landing routes (excluding root)
  return LANDING_ONLY_ROUTES.filter(route => route !== '/').some(route => pathname.startsWith(route))
}

// Main middleware function
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname
  
  // ENHANCED Debug logging - always log in production to debug redirect issue
  console.log('=== MIDDLEWARE DEBUG (ENHANCED) ===')
  console.log('🔍 REQUEST INFO:')
  console.log('- Full URL:', request.url)
  console.log('- Hostname:', hostname)
  console.log('- Pathname:', pathname)
  console.log('- Method:', request.method)
  console.log('🔧 ENV VARS:')
  console.log('- NODE_ENV:', process.env.NODE_ENV)
  console.log('- LANDING_DOMAIN:', process.env.LANDING_DOMAIN || 'NOT SET (default: www.fitsync.io)')
  console.log('- APP_DOMAIN:', process.env.APP_DOMAIN || 'NOT SET (default: www.fitsync.io)')
  console.log('- NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
  console.log('🔧 CONSTANTS:')
  console.log('- LANDING_DOMAIN const:', LANDING_DOMAIN)
  console.log('- APP_DOMAIN const:', APP_DOMAIN)
  
  // Determine if we're on app subdomain or landing domain
  // In staging, the same domain serves both landing and app
  const isOnStagingDomain = hostname.includes('staging') || hostname.includes('railway')
  
  // For staging: treat as landing domain by default (to show landing page)
  // For production: now using single domain (www.fitsync.io)
  const isAppDomain = hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('www.fitsync.io')
  const isLandingDomain = isAppDomain // Same domain for both now
  
  console.log('🚨 DOMAIN DETECTION ISSUE:')
  console.log('- hostname:', hostname)
  console.log('- isAppDomain:', isAppDomain)
  console.log('- isLandingDomain:', isLandingDomain)
  console.log('- PROBLEM: Both are', isAppDomain, 'for single domain setup!')
  console.log('- This will cause redirects if not handled properly!')
  
  // Special handling for validation routes (accessible from both)
  if (pathname.startsWith('/validate/')) {
    return NextResponse.next()
  }
  
  // Redirect app routes to app subdomain if accessed from landing domain
  // BUT: Skip this redirect for staging (single domain setup)
  console.log('🎯 REDIRECT CHECK:')
  console.log('- isLandingDomain:', isLandingDomain)
  console.log('- isAppDomain:', isAppDomain)
  console.log('- isAppRoute(pathname):', isAppRoute(pathname))
  console.log('- isOnStagingDomain:', isOnStagingDomain)
  console.log('- Will redirect?:', isLandingDomain && isAppRoute(pathname) && !isOnStagingDomain)
  
  if (isLandingDomain && isAppRoute(pathname) && !isOnStagingDomain) {
    console.log('⚠️ REDIRECTING to app domain!')
    console.log('- From:', request.url)
    console.log('- To:', `https://${APP_DOMAIN}${pathname}`)
    const appUrl = new URL(pathname, `https://${APP_DOMAIN}`)
    appUrl.search = request.nextUrl.search
    return NextResponse.redirect(appUrl)
  }
  
  // For app domain OR staging with app routes, apply authentication middleware
  if (isAppDomain || (isOnStagingDomain && isAppRoute(pathname))) {
    if (hostname.includes('staging') || hostname.includes('railway')) {
      console.log('Processing app/staging request')
      console.log('Is app domain:', isAppDomain)
      console.log('Is staging domain:', isOnStagingDomain)
      console.log('Is app route:', isAppRoute(pathname))
    }
    
    // Allow landing page routes to pass through (for development)
    if (isLandingRoute(pathname) && pathname !== '/') {
      // Optionally redirect to landing domain in production (not staging)
      if (process.env.NODE_ENV === 'production' && !isOnStagingDomain) {
        const landingUrl = new URL(pathname, `https://${LANDING_DOMAIN}`)
        landingUrl.search = request.nextUrl.search
        return NextResponse.redirect(landingUrl)
      }
    }
    
    // Login page should be accessible without auth
    if (pathname === '/login') {
      if (hostname.includes('staging') || hostname.includes('railway')) {
        console.log('Login page accessed, allowing through')
      }
      return NextResponse.next()
    }
    
    // Apply auth to protected routes
    const protectedRoutes = [
      '/dashboard',
      '/sessions',
      '/clients',
      '/users',
      '/packages',
      '/reports',
      '/admin',
      '/profile',
      '/locations',
      '/package-templates',
    ]
    
    const isProtected = protectedRoutes.some(route => pathname.startsWith(route))
    
    
    if (isProtected) {
      // Use withAuth for protected routes
      return (withAuth as any)(request)
    }
  }
  
  return NextResponse.next()
}

// Configure auth middleware
export const authMiddleware = withAuth(
  function middleware(req) {
    const token = (req as any).nextauth.token
    const path = req.nextUrl.pathname

    // Admin-only routes
    if (path.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Manager and admin routes
    if (path.startsWith('/users') || path.startsWith('/reports')) {
      if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(token?.role as string)) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}