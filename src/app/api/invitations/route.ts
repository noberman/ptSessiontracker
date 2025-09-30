import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  createInvitation, 
  getOrganizationInvitations,
  checkInvitationLimit 
} from '@/lib/invitation-service'
import { sendInvitationEmail } from '@/lib/email-service'
import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// POST /api/invitations - Send invitation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    })

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      )
    }

    // Only admins and managers can send invitations
    if (!['ADMIN', 'PT_MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, role = 'TRAINER' } = body

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Validate role - admins can now invite other admins
    const validRoles: Role[] = ['TRAINER', 'PT_MANAGER', 'CLUB_MANAGER', 'ADMIN']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }
    
    // Only admins can invite other admins
    if (role === 'ADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can invite other admins' },
        { status: 403 }
      )
    }

    // Create invitation
    const invitation = await createInvitation({
      email,
      role,
      organizationId: user.organizationId,
      invitedById: user.id,
    })

    // Send invitation email
    try {
      await sendInvitationEmail(invitation)
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
      // Don't fail the request if email fails - invitation is created
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
    })
  } catch (error: any) {
    console.error('Invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send invitation' },
      { status: 400 }
    )
  }
}

// GET /api/invitations - List invitations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      )
    }

    // Get status filter from query params
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as any

    // Get invitations
    const invitations = await getOrganizationInvitations(
      user.organizationId,
      status
    )

    // Get usage limit info
    const limitInfo = await checkInvitationLimit(user.organizationId)

    return NextResponse.json({
      invitations,
      limits: limitInfo,
    })
  } catch (error: any) {
    console.error('Get invitations error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get invitations' },
      { status: 500 }
    )
  }
}