import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrganizationUsage } from '@/lib/usage-limits'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Only admins and managers can view usage
  if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // Verify the user has access to this organization
  if (session.user.role !== 'ADMIN' && session.user.organizationId !== id) {
    return NextResponse.json({ error: 'Cannot view usage for other organizations' }, { status: 403 })
  }
  
  try {
    const usage = await getOrganizationUsage(id)
    return NextResponse.json(usage)
  } catch (error) {
    console.error('Error fetching organization usage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    )
  }
}