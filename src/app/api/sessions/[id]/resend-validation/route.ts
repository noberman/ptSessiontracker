import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EmailService } from '@/lib/email/sender'
import { renderSessionValidationEmail } from '@/lib/email/render'
import { userHasLocationAccess } from '@/lib/user-locations'
import crypto from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    // Get the session details
    const sessionData = await prisma.session.findUnique({
      where: { id },
      include: {
        client: true,
        trainer: true,
        location: true,
        package: true,
      }
    })

    if (!sessionData) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Check if already validated
    if (sessionData.validated) {
      return NextResponse.json(
        { error: 'Session is already validated' },
        { status: 400 }
      )
    }

    // Check permissions
    let canResend = false
    
    if (session.user.role === 'ADMIN') {
      canResend = true
    } else if (session.user.role === 'PT_MANAGER' || session.user.role === 'CLUB_MANAGER') {
      canResend = await userHasLocationAccess(
        session.user.id,
        session.user.role,
        sessionData.locationId
      )
    } else if (session.user.role === 'TRAINER') {
      canResend = session.user.id === sessionData.trainerId
    }

    if (!canResend) {
      return NextResponse.json(
        { error: 'You do not have permission to resend validation for this session' },
        { status: 403 }
      )
    }

    // Generate new validation token and expiry
    const newValidationToken = crypto.randomBytes(32).toString('hex')
    const newValidationExpiry = new Date()
    newValidationExpiry.setDate(newValidationExpiry.getDate() + 30)

    // Update session with new token
    await prisma.session.update({
      where: { id },
      data: {
        validationToken: newValidationToken,
        validationExpiry: newValidationExpiry,
      }
    })

    // Send new validation email
    const validationUrl = `${process.env.APP_URL || 'https://www.fitsync.io'}/validate/${newValidationToken}`
    
    const { html, text } = await renderSessionValidationEmail({
      clientName: sessionData.client.name,
      trainerName: sessionData.trainer.name,
      sessionDate: sessionData.sessionDate,
      location: sessionData.location.name,
      sessionValue: sessionData.sessionValue,
      validationUrl,
      expiryDays: 30,
    })

    const emailResult = await EmailService.sendWithRetry({
      to: sessionData.client.email,
      subject: `Reminder: Please confirm your training session with ${sessionData.trainer.name}`,
      html,
      text,
      template: 'session-validation-resend',
      metadata: {
        sessionId: sessionData.id,
        clientId: sessionData.client.id,
        trainerId: sessionData.trainer.id,
        isResend: true,
      }
    })

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Failed to send validation email' },
        { status: 500 }
      )
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'RESEND_VALIDATION',
        entityType: 'Session',
        entityId: id,
        newValue: {
          resentBy: session.user.email,
          resentAt: new Date().toISOString(),
          clientEmail: sessionData.client.email,
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Validation email resent to ${sessionData.client.email}`,
      expiresAt: newValidationExpiry,
    })
  } catch (error: any) {
    console.error('Resend validation error:', error)
    return NextResponse.json(
      { error: 'Failed to resend validation email' },
      { status: 500 }
    )
  }
}