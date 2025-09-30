import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  acceptInvitation,
  getInvitationByToken 
} from '@/lib/invitation-service'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// POST /api/invitations/accept - Accept invitation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, name, password } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token required' },
        { status: 400 }
      )
    }

    // Get invitation details
    const invitation = await getInvitationByToken(token)
    
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 400 }
      )
    }

    if (invitation.status === 'EXPIRED') {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      )
    }

    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 400 }
      )
    }

    // Check if user is logged in
    const session = await getServerSession(authOptions)
    
    if (session) {
      // User is logged in - add them to organization
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      })

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 400 }
        )
      }

      // Check if user email matches invitation
      if (user.email !== invitation.email) {
        return NextResponse.json(
          { error: 'This invitation was sent to a different email address' },
          { status: 400 }
        )
      }

      // Check if user already belongs to an organization
      if (user.organizationId && user.organizationId !== invitation.organizationId) {
        return NextResponse.json(
          { error: 'You already belong to another organization' },
          { status: 400 }
        )
      }

      // Accept invitation for existing user
      await acceptInvitation(token, user.id)

      return NextResponse.json({
        success: true,
        existingUser: true,
        message: 'Invitation accepted successfully',
      })
    } else {
      // User needs to create account
      if (!name || !password) {
        return NextResponse.json(
          { error: 'Name and password required for new account' },
          { status: 400 }
        )
      }

      // Check if email already exists in this organization
      const existingUser = await prisma.user.findFirst({
        where: { 
          email: invitation.email,
          organizationId: invitation.organizationId
        },
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'An account with this email already exists in this organization. Please log in first.' },
          { status: 400 }
        )
      }

      // Create new user account
      const hashedPassword = await bcrypt.hash(password, 10)
      
      const newUser = await prisma.user.create({
        data: {
          email: invitation.email,
          name,
          password: hashedPassword,
          role: invitation.role,
          organizationId: invitation.organizationId,
          active: true,
        },
      })

      // Accept invitation
      await acceptInvitation(token, newUser.id)

      return NextResponse.json({
        success: true,
        newUser: true,
        message: 'Account created and invitation accepted successfully',
      })
    }
  } catch (error: any) {
    console.error('Accept invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to accept invitation' },
      { status: 400 }
    )
  }
}

// GET /api/invitations/accept?token=xxx - Get invitation details
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token required' },
        { status: 400 }
      )
    }

    // Get invitation details
    const invitation = await getInvitationByToken(token)
    
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation' },
        { status: 404 }
      )
    }

    // Check if user is logged in
    const session = await getServerSession(authOptions)
    
    // Check if user with this email already exists in this organization
    const existingUser = await prisma.user.findFirst({
      where: { 
        email: invitation.email,
        organizationId: invitation.organizationId
      },
      select: {
        id: true,
        email: true,
        organizationId: true,
      },
    })

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        organization: invitation.organization,
        invitedBy: invitation.invitedBy,
      },
      needsAccount: !existingUser,
      isLoggedIn: !!session,
      userEmail: session?.user?.email || null,
    })
  } catch (error: any) {
    console.error('Get invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get invitation' },
      { status: 500 }
    )
  }
}