import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { grantBetaAccess, revokeBetaAccess } from '@/lib/handle-downgrade'

// POST /api/organizations/[id]/beta - Grant beta access
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Only super admins can grant beta access
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  try {
    const body = await request.json()
    const { durationDays = 30 } = body
    
    const result = await grantBetaAccess(id, durationDays)
    
    return NextResponse.json({
      message: `Beta access granted for ${durationDays} days`,
      organization: result
    })
  } catch (error: any) {
    console.error('Error granting beta access:', error)
    
    if (error.message === 'Organization not found') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error.message === 'Organization already has beta access') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json(
      { error: 'Failed to grant beta access' },
      { status: 500 }
    )
  }
}

// DELETE /api/organizations/[id]/beta - Revoke beta access
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Only super admins can revoke beta access
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  try {
    const result = await revokeBetaAccess(id)
    
    return NextResponse.json({
      message: 'Beta access revoked',
      organization: result
    })
  } catch (error: any) {
    console.error('Error revoking beta access:', error)
    
    if (error.message === 'Organization not found') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error.message === 'Organization does not have beta access') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    return NextResponse.json(
      { error: 'Failed to revoke beta access' },
      { status: 500 }
    )
  }
}