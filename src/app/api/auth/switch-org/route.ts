import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getToken } from 'next-auth/jwt'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { organizationId, userId } = await request.json()

    if (!organizationId || !userId) {
      return NextResponse.json(
        { error: 'Organization ID and User ID are required' },
        { status: 400 }
      )
    }

    // Verify the user has access to this organization
    const availableOrgs = session.user.availableOrgs || []
    const hasAccess = availableOrgs.some(
      org => org.orgId === organizationId && org.userId === userId
    )

    if (!hasAccess) {
      console.log('❌ Access denied:', { organizationId, userId, availableOrgs })
      return NextResponse.json(
        { error: 'Access denied to this organization' },
        { status: 403 }
      )
    }

    console.log(`✅ User ${session.user.email} switching from ${session.user.organizationId} to ${organizationId}`)

    // Set a cookie with the new organization ID that the JWT callback can read
    const cookieStore = await cookies()
    cookieStore.set('pending-org-switch', organizationId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 // expires in 60 seconds
    })

    return NextResponse.json({ 
      success: true,
      message: 'Organization switch initiated. Refreshing session...',
      newOrganizationId: organizationId
    })
  } catch (error) {
    console.error('Error switching organization:', error)
    return NextResponse.json(
      { error: 'Failed to switch organization' },
      { status: 500 }
    )
  }
}