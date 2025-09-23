import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resendInvitation } from '@/lib/invitation-service'
import { sendInvitationEmail } from '@/lib/email-service'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// POST /api/invitations/[id]/resend - Resend invitation
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
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

    // Only admins and managers can resend invitations
    if (!['ADMIN', 'PT_MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Check if invitation belongs to user's organization
    const invitation = await prisma.invitation.findUnique({
      where: { id },
    })

    if (!invitation || invitation.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Use the resend service function
    const updatedInvitation = await resendInvitation(id)

    // Send the email
    try {
      const emailData = await prisma.invitation.findUnique({
        where: { id: updatedInvitation.id },
        include: {
          organization: true,
          invitedBy: true,
        },
      })

      if (emailData) {
        const emailSent = await sendInvitationEmail({
          id: emailData.id,
          email: emailData.email,
          token: emailData.token,
          organization: emailData.organization,
          invitedBy: emailData.invitedBy,
          role: emailData.role,
          expiresAt: emailData.expiresAt,
        })

        if (!emailSent) {
          console.error('Failed to send resend email for invitation:', id)
          // Still return success since invitation was updated
        }
      }
    } catch (emailError) {
      console.error('Error sending resend email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      invitation: updatedInvitation,
    })
  } catch (error: any) {
    console.error('Resend invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to resend invitation' },
      { status: 400 }
    )
  }
}