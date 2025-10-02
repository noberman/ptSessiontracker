import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrganizationId } from '@/lib/organization-context'

// POST /api/users/[id]/reactivate - Reactivate a soft-deleted user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can reactivate users
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get organization context
    const organizationId = await getOrganizationId()

    // Find the inactive user
    const user = await prisma.user.findUnique({
      where: { 
        id,
        organizationId, // Ensure user belongs to same org
      },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.active) {
      return NextResponse.json(
        { error: 'User is already active' },
        { status: 400 }
      )
    }

    // Reactivate the user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { active: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'USER_REACTIVATED',
        userId: session.user.id,
        entityType: 'User',
        entityId: updatedUser.id,
        oldValue: { active: false },
        newValue: { active: true },
      },
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error reactivating user:', error)
    return NextResponse.json(
      { error: 'Failed to reactivate user' },
      { status: 500 }
    )
  }
}