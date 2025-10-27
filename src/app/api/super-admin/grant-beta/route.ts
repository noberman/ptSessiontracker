import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { grantBetaAccess } from '@/lib/handle-downgrade'

export async function POST(request: Request) {
  try {
    // Check super-admin authentication
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.email !== process.env.SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { organizationId, durationDays } = await request.json()
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }
    
    // Grant beta access (null durationDays means indefinite)
    const result = await grantBetaAccess(organizationId, durationDays)
    
    return NextResponse.json({ 
      success: true, 
      organization: result,
      message: durationDays 
        ? `Beta access granted for ${durationDays} days`
        : 'Indefinite beta access granted'
    })
  } catch (error) {
    console.error('Grant beta error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to grant beta access' },
      { status: 500 }
    )
  }
}