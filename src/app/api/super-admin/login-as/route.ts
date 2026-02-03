import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createTempToken, isSuperAdmin } from '@/lib/auth/super-admin'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Login As API called')
    
    const session = await getServerSession(authOptions)
    console.log('📋 Current session:', session?.user?.email, 'Role:', session?.user?.role)
    
    if (!session?.user?.id) {
      console.log('❌ No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify super admin
    const isAdmin = await isSuperAdmin(session.user.id)
    console.log('👮 Is super admin?', isAdmin)
    
    if (!isAdmin) {
      console.log('❌ Not a super admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { organizationId, reason } = await request.json()
    console.log('🏢 Target organization:', organizationId)

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Get the admin user of the target organization
    const targetUser = await prisma.user.findFirst({
      where: {
        organizationId,
        role: 'ADMIN'
      }
    })
    
    console.log('🎭 Found target admin user?', !!targetUser, targetUser?.email)

    if (!targetUser) {
      // If no admin, get any user from the org
      const anyUser = await prisma.user.findFirst({
        where: { organizationId }
      })
      
      console.log('🎭 No admin found, trying any user:', anyUser?.email)
      
      if (!anyUser) {
        console.log('❌ No users found in organization')
        return NextResponse.json({ error: 'No users found in organization' }, { status: 404 })
      }
    }

    const userToImpersonate = targetUser || await prisma.user.findFirst({
      where: { organizationId }
    })

    if (!userToImpersonate) {
      console.log('❌ No user to impersonate')
      return NextResponse.json({ error: 'No user to impersonate' }, { status: 404 })
    }
    
    console.log('✅ Will impersonate:', userToImpersonate.email, 'Role:', userToImpersonate.role)

    // Create temporary token
    console.log('🔑 Creating temp token...')
    const { token, expiresAt, url } = await createTempToken(
      session.user.id,
      userToImpersonate.id,
      organizationId,
      reason
    )
    console.log('🎟️ Token created:', token.substring(0, 10) + '...', 'URL:', url)

    // Return full URL for opening in new tab
    // Get the actual host from the request headers
    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    
    // Construct base URL from actual request
    const baseUrl = `${protocol}://${host}`
    // Add timestamp to force new session context
    const separator = url.includes('?') ? '&' : '?'
    const fullUrl = `${baseUrl}${url}${separator}t=${Date.now()}`
    
    console.log('🌐 Host:', host, 'Protocol:', protocol)
    console.log('🌐 Full URL:', fullUrl)

    return NextResponse.json({
      success: true,
      url: fullUrl,
      expiresAt,
      targetUser: {
        id: userToImpersonate.id,
        name: userToImpersonate.name,
        email: userToImpersonate.email,
        role: userToImpersonate.role
      }
    })
  } catch (error: unknown) {
    console.error('Login As error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create login session' },
      { status: 500 }
    )
  }
}