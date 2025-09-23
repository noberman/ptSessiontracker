import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Resend } from 'resend'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admins to test email
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    
    const { data, error } = await resend.emails.send({
      from: `${process.env.RESEND_FROM_NAME || 'FitSync'} <${process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'}>`,
      to: [session.user.email!],
      subject: 'Test Email from FitSync',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="padding: 20px; background-color: #f9fafb; border-radius: 8px;">
            <h2 style="color: #111827;">Email Test Successful!</h2>
            <p style="color: #374151;">
              This is a test email from your FitSync application.
            </p>
            <p style="color: #374151;">
              If you're seeing this, your email configuration is working correctly.
            </p>
            <h3 style="color: #111827; margin-top: 24px;">Configuration Details:</h3>
            <ul style="color: #6b7280;">
              <li>RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ Set' : '❌ Missing'}</li>
              <li>RESEND_FROM_EMAIL: ${process.env.RESEND_FROM_EMAIL || 'Not set (using default)'}</li>
              <li>RESEND_FROM_NAME: ${process.env.RESEND_FROM_NAME || 'Not set (using default)'}</li>
              <li>Sent to: ${session.user.email}</li>
            </ul>
          </div>
        </div>
      `,
      text: 'This is a test email from FitSync. Your email configuration is working!'
    })

    if (error) {
      console.error('Email test failed:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        config: {
          hasApiKey: !!process.env.RESEND_API_KEY,
          fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
          fromName: process.env.RESEND_FROM_NAME || 'FitSync'
        }
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully',
      resendId: data?.id,
      sentTo: session.user.email,
      config: {
        hasApiKey: !!process.env.RESEND_API_KEY,
        fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        fromName: process.env.RESEND_FROM_NAME || 'FitSync'
      }
    })
  } catch (error: any) {
    console.error('Test email error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Unknown error',
      details: error
    }, { status: 500 })
  }
}