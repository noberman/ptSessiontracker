import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrganizationId, getCurrentOrganization } from '@/lib/organization-context'

export async function GET() {
  try {
    // Get the session
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Try to get organization ID
    let orgId: string | null = null
    let orgDetails = null
    let orgError = null
    
    try {
      orgId = await getOrganizationId()
      orgDetails = await getCurrentOrganization()
    } catch (error) {
      orgError = error instanceof Error ? error.message : 'Unknown error'
    }
    
    return NextResponse.json({
      session: {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
          organizationId: session.user.organizationId,
        }
      },
      organizationContext: {
        orgId,
        orgDetails,
        error: orgError
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}