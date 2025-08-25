import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY || 'test_key')

// Email service configuration
export const emailConfig = {
  from: {
    email: process.env.RESEND_FROM_EMAIL || 'noreply@example.com',
    name: process.env.RESEND_FROM_NAME || 'PT Session Tracker'
  },
  replyTo: process.env.RESEND_REPLY_TO || undefined,
  // Development mode - log emails instead of sending
  isDevelopment: process.env.NODE_ENV === 'development' && !process.env.RESEND_API_KEY,
  // Override all emails to a test address in development
  devEmailOverride: process.env.EMAIL_DEV_OVERRIDE || null,
}

export { resend }