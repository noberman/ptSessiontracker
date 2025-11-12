import { render } from '@react-email/components'
import React from 'react'
import SessionValidationEmail from './templates/session-validation'
import type { SessionValidationEmailData } from './types'
import { format } from 'date-fns'
import { displaySessionTime } from '@/utils/timezone'

/**
 * Render session validation email to HTML
 */
export async function renderSessionValidationEmail(
  data: SessionValidationEmailData
): Promise<{ html: string; text: string }> {
  const html = await render(<SessionValidationEmail {...data} />)
  
  // Simple text version with timezone-aware formatting
  const displayDate = displaySessionTime(data.sessionDate, data.createdAt, data.orgTimezone)
  const formattedDate = format(displayDate, 'EEEE, MMMM d, yyyy')
  const formattedTime = format(displayDate, 'h:mm a')
  
  const text = `
Hi ${data.clientName}!

Please confirm your training session:

Date: ${formattedDate}
Time: ${formattedTime}
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