import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revokeBetaAccess } from '@/lib/handle-downgrade'

export async function POST(request: Request) {
  try {
    // Check super-admin authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 })
    }
    
    // Check if user is super admin by role
    const { isSuperAdmin } = await import('@/lib/auth/super-admin')
    const isAdmin = await isSuperAdmin(session.user.id)
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Not super admin' }, { status: 401 })
    }
    
    const { organizationId } = await request.json()
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }
    
    // Revoke beta access
    const result = await revokeBetaAccess(organizationId)
    
    return NextResponse.json({ 
      success: true, 
      organization: result,
      message: 'Beta access revoked'
    })
  } catch (error) {
    console.error('Revoke beta error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to revoke beta access' },
      { status: 500 }
    )
  }
}