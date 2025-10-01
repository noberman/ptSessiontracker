import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getToken } from 'next-auth/jwt'
import { NextRequest } from 'next/server'

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
      return NextResponse.json(
        { error: 'Access denied to this organization' },
        { status: 403 }
      )
    }

    console.log(`🔄 User ${session.user.email} switching to org ${organizationId}`)

    // The actual organization switch happens in the jwt callback
    // when the session is updated. We just need to trigger a session update
    // with the new organization ID stored somewhere the jwt callback can access it.
    
    // For now, we'll rely on the client-side localStorage and page refresh
    // to handle the actual switch. The jwt callback will pick up the new org
    // on the next session refresh.

    return NextResponse.json({ 
      success: true,
      message: 'Organization switch initiated. Refreshing session...'
    })
  } catch (error) {
    console.error('Error switching organization:', error)
    return NextResponse.json(
      { error: 'Failed to switch organization' },
      { status: 500 }
    )
  }
}