import { render } from '@react-email/components'
import SessionValidationEmail from './templates/session-validation'
import type { SessionValidationEmailData } from './types'

/**
 * Render session validation email to HTML
 */
export async function renderSessionValidationEmail(
  data: SessionValidationEmailData
): Promise<{ html: string; text: string }> {
  const html = await render(SessionValidationEmail(data))
  
  // Simple text version
  const text = `
Hi ${data.clientName}!

Please confirm your training session:

Date: ${new Date(data.sessionDate).toLocaleDateString()}
Time: ${new Date(data.sessionDate).toLocaleTimeString()}
Trainer: ${data.trainerName}
Location: ${data.location}
Session Value: $${data.sessionValue.toFixed(2)}

Confirm your session: ${data.validationUrl}

This link expires in ${data.expiryDays} days.

If you didn't attend this session, please contact your trainer or gym management.

PT Session Tracker
  `.trim()

  return { html, text }
}