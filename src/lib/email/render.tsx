import { render } from '@react-email/components'
import React from 'react'
import SessionValidationEmail from './templates/session-validation'
import AppointmentConfirmationEmail from './templates/appointment-confirmation'
import AppointmentCancellationEmail from './templates/appointment-cancellation'
import type {
  SessionValidationEmailData,
  AppointmentConfirmationEmailData,
  AppointmentCancellationEmailData,
} from './types'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
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

/**
 * Render appointment confirmation email to HTML
 */
export async function renderAppointmentConfirmationEmail(
  data: AppointmentConfirmationEmailData
): Promise<{ html: string; text: string }> {
  const html = await render(<AppointmentConfirmationEmail {...data} />)

  const zonedDate = toZonedTime(data.scheduledAt, data.orgTimezone)
  const formattedDate = format(zonedDate, 'EEEE, MMMM d, yyyy')
  const formattedTime = format(zonedDate, 'h:mm a')
  const typeLabel = data.appointmentType === 'FITNESS_ASSESSMENT' ? 'Fitness Assessment' : 'Session'

  const text = `
Hi ${data.recipientName}!

Your appointment has been confirmed:

Type: ${typeLabel}
Date: ${formattedDate}
Time: ${formattedTime}
Duration: ${data.duration} minutes
Trainer: ${data.trainerName}
Location: ${data.locationName}${data.notes ? `\nNotes: ${data.notes}` : ''}

If you have any questions, please contact your trainer or gym management.

PT Session Tracker
  `.trim()

  return { html, text }
}

/**
 * Render appointment cancellation email to HTML
 */
export async function renderAppointmentCancellationEmail(
  data: AppointmentCancellationEmailData
): Promise<{ html: string; text: string }> {
  const html = await render(<AppointmentCancellationEmail {...data} />)

  const zonedDate = toZonedTime(data.scheduledAt, data.orgTimezone)
  const formattedDate = format(zonedDate, 'EEEE, MMMM d, yyyy')
  const formattedTime = format(zonedDate, 'h:mm a')
  const typeLabel = data.appointmentType === 'FITNESS_ASSESSMENT' ? 'Fitness Assessment' : 'Session'

  const text = `
Appointment Cancelled

Hi ${data.recipientName}, your appointment has been cancelled by ${data.cancelledByName}.

Type: ${typeLabel}
Date: ${formattedDate}
Time: ${formattedTime}
Duration: ${data.duration} minutes
Trainer: ${data.trainerName}
Location: ${data.locationName}

If you have any questions, please contact your trainer or gym management.

PT Session Tracker
  `.trim()

  return { html, text }
}