import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'

// Single domain configuration - www.fitsync.io for everything
// No more domain routing needed!

// Main middleware function - SIMPLIFIED for single domain
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const hostname = request.headers.get('host') || ''
  
  // Debug logging (temporary - remove after fixing)
  console.log('=== SIMPLIFIED MIDDLEWARE ===')
  console.log('- Pathname:', pathname)
  console.log('- Hostname:', hostname)
  
  // Special handling for validation routes (always accessible)
  if (pathname.startsWith('/validate/')) {
    return NextResponse.next()
  }
  
  // Login page is accessible without auth
  if (pathname === '/login') {
    console.log('✅ Login page - no auth required')
    return NextResponse.next()
  }
  
  // Protected routes that require authentication
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
    '/commission',
    '/my-commission',
  ]
  
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route))
  
  if (isProtected) {
    console.log('🔒 Protected route - checking auth')
    // Use withAuth for protected routes
    return (withAuth as any)(request)
  }
  
  // Everything else (landing page, public routes) passes through
  console.log('✅ Public route - no auth required')
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