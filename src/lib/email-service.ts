import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

interface InvitationEmailData {
  id: string
  email: string
  token: string
  organization: {
    name: string
  }
  invitedBy: {
    name: string
    email: string
  }
  role: string
  expiresAt: Date
}

/**
 * Send invitation email
 * TODO: Integrate with SendGrid/Resend
 */
export async function sendInvitationEmail(invitation: InvitationEmailData) {
  console.log('📧 sendInvitationEmail called with:', {
    email: invitation.email,
    organization: invitation.organization.name,
    invitedBy: invitation.invitedBy.name,
    role: invitation.role
  })
  
  const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invitation/${invitation.token}`
  console.log('🔗 Invitation URL:', invitationUrl)
  
  // Calculate days until expiration
  const daysUntilExpiry = Math.ceil(
    (invitation.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  const emailContent = {
    to: invitation.email,
    subject: `You're invited to join ${invitation.organization.name} on FitSync`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 20px; background-color: #f9fafb; border-radius: 8px;">
          <h2 style="color: #111827; margin-bottom: 16px;">You're invited to join ${invitation.organization.name}</h2>
          
          <p style="color: #374151; margin-bottom: 24px;">
            ${invitation.invitedBy.name} has invited you to join ${invitation.organization.name} as a ${invitation.role.toLowerCase().replace('_', ' ')} on FitSync.
          </p>
          
          <p style="color: #374151; margin-bottom: 24px;">
            FitSync helps personal training teams manage sessions, track commissions, and streamline operations.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${invitationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Accept Invitation
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
            This invitation expires in ${daysUntilExpiry} days.
          </p>
          
          <p style="color: #6b7280; font-size: 14px;">
            If you're unable to click the button, copy and paste this link into your browser:<br>
            <span style="color: #3b82f6; word-break: break-all;">${invitationUrl}</span>
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© 2024 FitSync. All rights reserved.</p>
        </div>
      </div>
    `,
    text: `
You're invited to join ${invitation.organization.name}

${invitation.invitedBy.name} has invited you to join ${invitation.organization.name} as a ${invitation.role.toLowerCase().replace('_', ' ')} on FitSync.

Accept your invitation: ${invitationUrl}

This invitation expires in ${daysUntilExpiry} days.

Best regards,
The FitSync Team
    `,
  }

  try {
    console.log('📮 Attempting to send email via Resend with config:', {
      from: `${process.env.RESEND_FROM_NAME || 'FitSync'} <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
      to: invitation.email,
      hasApiKey: !!process.env.RESEND_API_KEY,
      apiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 10)
    })
    
    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME || 'FitSync'} <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
      to: [invitation.email],
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    if (error) {
      console.error('❌ Failed to send invitation email:', error)
      console.error('❌ Error details:', JSON.stringify(error, null, 2))
      
      // Log failed attempt
      await prisma.emailLog.create({
        data: {
          to: invitation.email,
          subject: emailContent.subject,
          template: 'invitation',
          status: 'failed',
          sentAt: new Date(),
          metadata: {
            invitationId: invitation.id,
            organizationName: invitation.organization.name,
            invitedBy: invitation.invitedBy.name,
            error: error.message,
          },
        },
      })
      
      return false
    }

    console.log('✅ Email sent successfully via Resend:', {
      messageId: data?.id,
      to: invitation.email
    })

    // Log successful email
    await prisma.emailLog.create({
      data: {
        to: invitation.email,
        subject: emailContent.subject,
        template: 'invitation',
        status: 'sent',
        sentAt: new Date(),
        metadata: {
          invitationId: invitation.id,
          organizationName: invitation.organization.name,
          invitedBy: invitation.invitedBy.name,
          resendId: data?.id,
        },
      },
    })

    console.log('✅ Invitation email sent successfully:', {
      to: invitation.email,
      invitationUrl,
      expiresIn: `${daysUntilExpiry} days`,
      resendId: data?.id,
    })

    return true
  } catch (error: unknown) {
    console.error('❌ Error sending invitation email:', error)

    // Log error
    await prisma.emailLog.create({
      data: {
        to: invitation.email,
        subject: emailContent.subject,
        template: 'invitation',
        status: 'failed',
        sentAt: new Date(),
        metadata: {
          invitationId: invitation.id,
          organizationName: invitation.organization.name,
          invitedBy: invitation.invitedBy.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
    })
    
    return false
  }
}

/**
 * Send welcome email after invitation acceptance
 */
export async function sendWelcomeEmail(user: {
  email: string
  name: string
  organization?: { name: string } | null
}) {
  const emailContent = {
    to: user.email,
    subject: `Welcome to ${user.organization?.name || 'FitSync'}!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="padding: 20px; background-color: #f9fafb; border-radius: 8px;">
          <h2 style="color: #111827; margin-bottom: 16px;">Welcome ${user.name}!</h2>
          
          <p style="color: #374151; margin-bottom: 24px;">
            You've successfully joined ${user.organization?.name || 'FitSync'}. We're excited to have you on board!
          </p>
          
          <h3 style="color: #111827; margin-bottom: 12px;">Here's what you can do:</h3>
          <ul style="color: #374151; margin-bottom: 24px;">
            <li>Log sessions with clients</li>
            <li>Track your performance</li>
            <li>View commission reports</li>
            <li>Manage your schedule</li>
          </ul>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Go to Dashboard
            </a>
          </div>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© 2024 FitSync. All rights reserved.</p>
        </div>
      </div>
    `,
    text: `
Welcome ${user.name}!

You've successfully joined ${user.organization?.name || 'FitSync'}. We're excited to have you on board!

Here's what you can do:
- Log sessions with clients
- Track your performance
- View commission reports
- Manage your schedule

Go to your dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard

Best regards,
The FitSync Team
    `,
  }

  try {
    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME || 'FitSync'} <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
      to: [user.email],
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    })

    if (error) {
      console.error('❌ Failed to send welcome email:', error)
      
      // Log failed attempt
      await prisma.emailLog.create({
        data: {
          to: user.email,
          subject: emailContent.subject,
          template: 'welcome',
          status: 'failed',
          sentAt: new Date(),
          metadata: {
            userName: user.name,
            organizationName: user.organization?.name,
            error: error.message,
          },
        },
      })
      
      return false
    }

    // Log successful email
    await prisma.emailLog.create({
      data: {
        to: user.email,
        subject: emailContent.subject,
        template: 'welcome',
        status: 'sent',
        sentAt: new Date(),
        metadata: {
          userName: user.name,
          organizationName: user.organization?.name,
          resendId: data?.id,
        },
      },
    })

    console.log('✅ Welcome email sent successfully:', {
      to: user.email,
      resendId: data?.id,
    })

    return true
  } catch (error: unknown) {
    console.error('❌ Error sending welcome email:', error)

    // Log error
    await prisma.emailLog.create({
      data: {
        to: user.email,
        subject: emailContent.subject,
        template: 'welcome',
        status: 'failed',
        sentAt: new Date(),
        metadata: {
          userName: user.name,
          organizationName: user.organization?.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
    })
    
    return false
  }
}