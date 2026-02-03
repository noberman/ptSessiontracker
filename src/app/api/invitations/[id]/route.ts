import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { 
  resendInvitation, 
  cancelInvitation 
} from '@/lib/invitation-service'
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

    // Resend invitation
    const updatedInvitation = await resendInvitation(id)

    // Send email
    try {
      await sendInvitationEmail(updatedInvitation)
    } catch (emailError) {
      console.error('Failed to resend invitation email:', emailError)
    }

    return NextResponse.json({
      success: true,
      invitation: updatedInvitation,
    })
  } catch (error: unknown) {
    console.error('Resend invitation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resend invitation' },
      { status: 400 }
    )
  }
}

// DELETE /api/invitations/[id] - Cancel invitation
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Only admins and managers can cancel invitations
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

    // Cancel invitation
    await cancelInvitation(id, user.id)

    return NextResponse.json({
      success: true,
    })
  } catch (error: unknown) {
    console.error('Cancel invitation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel invitation' },
      { status: 400 }
    )
  }
}