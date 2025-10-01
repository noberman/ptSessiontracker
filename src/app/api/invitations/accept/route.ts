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
      // User is logged in - add them to new organization
      console.log(`🎫 Logged-in user ${session.user.email} accepting invitation to org ${invitation.organizationId}`)

      // Check if user email matches invitation
      if (session.user.email !== invitation.email) {
        return NextResponse.json(
          { error: 'This invitation was sent to a different email address' },
          { status: 400 }
        )
      }

      // Check if user already exists in THIS organization
      const existingUserInOrg = await prisma.user.findFirst({
        where: { 
          email: invitation.email,
          organizationId: invitation.organizationId
        }
      })

      if (existingUserInOrg) {
        console.log(`⚠️ User ${invitation.email} already has access to org ${invitation.organizationId}`)
        return NextResponse.json(
          { error: 'You already have access to this organization' },
          { status: 400 }
        )
      }

      // Get the user's password and name from any of their existing records
      const existingUser = await prisma.user.findFirst({
        where: { email: invitation.email },
        select: { 
          password: true,
          name: true 
        }
      })

      if (!existingUser) {
        return NextResponse.json(
          { error: 'User account not found' },
          { status: 400 }
        )
      }

      console.log(`✅ Creating new User record for ${invitation.email} in org ${invitation.organizationId}`)
      
      // Create new User record for this organization with SAME password
      const newOrgUser = await prisma.user.create({
        data: {
          email: invitation.email,
          name: existingUser.name,
          password: existingUser.password, // Use existing password hash
          role: invitation.role,
          organizationId: invitation.organizationId,
          active: true,
        }
      })

      // Accept invitation
      await acceptInvitation(token, newOrgUser.id)

      console.log(`✅ User ${invitation.email} added to new organization successfully`)

      return NextResponse.json({
        success: true,
        existingUser: true,
        message: 'You have been added to the new organization successfully. Please refresh your session to see the new organization.',
        requiresRelogin: true // User needs to refresh session to see new org
      })
    } else {
      // User not logged in - check if they need to login or create account
      console.log(`🎫 Non-logged-in user accepting invitation for ${invitation.email}`)
      
      // Check if email exists in ANY organization
      const existingUserAnyOrg = await prisma.user.findFirst({
        where: { email: invitation.email },
        select: { 
          id: true,
          password: true,
          name: true,
          organizationId: true,
          organization: {
            select: { name: true }
          }
        }
      })

      if (existingUserAnyOrg) {
        // Email already exists - they must login first
        console.log(`⚠️ Email ${invitation.email} already exists in org ${existingUserAnyOrg.organization?.name}. Requiring login.`)
        return NextResponse.json({
          requiresLogin: true,
          message: 'An account with this email already exists. Please log in to accept this invitation.',
          email: invitation.email
        })
      }

      // New user - create account
      if (!name || !password) {
        return NextResponse.json(
          { error: 'Name and password required for new account' },
          { status: 400 }
        )
      }

      console.log(`🆕 Creating new user account for ${invitation.email} in org ${invitation.organizationId}`)
      
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

      console.log(`✅ New account created and invitation accepted for ${invitation.email}`)

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