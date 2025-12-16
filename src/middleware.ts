import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// Request logging for crash diagnosis
function logRequest(req: Request, path: string, userId?: string) {
  // Only log in production and only API/page routes (not static assets)
  if (process.env.NODE_ENV !== 'production') return
  if (path.startsWith('/_next/') || path.includes('.')) return

  const method = req.method
  const isApi = path.startsWith('/api/')

  // Log API requests and page navigations
  if (isApi || !path.startsWith('/api/')) {
    console.log(`[REQUEST] ${method} ${path}${userId ? ` (user: ${userId.slice(-8)})` : ''}`)
  }
}

export default withAuth(
  function middleware(req) {
    const token = (req as any).nextauth.token
    const path = req.nextUrl.pathname

    // Log this request for crash diagnosis
    logRequest(req, path, token?.sub)

    // Super admin routes
    if (token?.role === 'SUPER_ADMIN' && !token?.isImpersonating) {
      // Redirect super admins to their dashboard
      if (path === '/dashboard') {
        return NextResponse.redirect(new URL('/super-admin', req.url))
      }
    }

    // Protect super admin routes
    if (path.startsWith('/super-admin')) {
      if (token?.role !== 'SUPER_ADMIN' || token?.isImpersonating) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Check if admin's ORGANIZATION needs onboarding (not the user)
    // This ensures only the first admin goes through onboarding, not invited admins
    if (token?.role === 'ADMIN' && !token?.organizationOnboardingCompletedAt) {
      // Allow access to onboarding and API routes
      if (!path.startsWith('/onboarding') && 
          !path.startsWith('/api/') && 
          !path.startsWith('/_next/')) {
        console.log('🎯 Organization needs onboarding - redirecting from', path, 'to /onboarding')
        return NextResponse.redirect(new URL('/onboarding', req.url))
      }
    }

    // If user is trying to access onboarding but organization already completed it
    if (path.startsWith('/onboarding') && token?.organizationOnboardingCompletedAt) {
      console.log('✅ Organization onboarding already complete - redirecting to dashboard')
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

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
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        
        // Public routes that don't need auth
        if (path === '/login' || 
            path === '/signup' ||
            path === '/' || 
            path.startsWith('/validate/') ||
            path.startsWith('/api/sessions/validate/') ||  // Allow unauthenticated access to validation API
            path.startsWith('/invitation/') ||  // Allow unauthenticated access to invitation pages
            path.startsWith('/api/invitations/accept') ||  // Allow unauthenticated invitation acceptance
            path.startsWith('/auth/temp-login') ||
            path.startsWith('/_next/') ||
            path.includes('.')) {
          return true
        }
        
        // Webhook endpoints (protected by signature verification instead of auth)
        if (path.startsWith('/api/stripe/webhook')) {
          return true
        }
        
        // Everything else needs auth
        return !!token
      },
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