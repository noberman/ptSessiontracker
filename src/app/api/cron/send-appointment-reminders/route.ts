import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EmailService } from '@/lib/email/sender'
import { renderAppointmentReminderEmail } from '@/lib/email/render'

// GET /api/cron/send-appointment-reminders - Send reminder emails for appointments within the next 24 hours
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[Cron] Starting appointment reminder check...')

    const now = new Date()
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Find all scheduled appointments in the next 24 hours that haven't had a reminder sent
    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'SCHEDULED',
        reminderSentAt: null,
        scheduledAt: {
          gte: now,
          lte: twentyFourHoursFromNow,
        },
      },
      include: {
        client: true,
        trainer: true,
        location: true,
        organization: true,
      },
    })

    console.log(`[Cron] Found ${appointments.length} appointments needing reminders`)

    let sentCount = 0
    let failedCount = 0

    for (const appointment of appointments) {
      try {
        // Determine recipient email and name
        const recipientEmail = appointment.client?.email || appointment.prospectEmail
        const recipientName = appointment.client?.name || appointment.prospectName || 'there'

        if (!recipientEmail) {
          console.warn(`[Cron] No email for appointment ${appointment.id}, skipping`)
          failedCount++
          continue
        }

        const orgTimezone = appointment.organization?.timezone || 'Asia/Singapore'

        const { html, text } = await renderAppointmentReminderEmail({
          recipientName,
          appointmentType: appointment.type,
          scheduledAt: appointment.scheduledAt,
          duration: appointment.duration,
          trainerName: appointment.trainer.name,
          locationName: appointment.location.name,
          orgTimezone,
        })

        await EmailService.sendWithRetry({
          to: recipientEmail,
          subject: `Reminder: Appointment with ${appointment.trainer.name} tomorrow`,
          html,
          text,
          template: 'appointment-reminder',
          metadata: {
            appointmentId: appointment.id,
            type: appointment.type,
          },
        })

        // Mark reminder as sent
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { reminderSentAt: new Date() },
        })

        sentCount++
        console.log(`[Cron] Reminder sent for appointment ${appointment.id}`)
      } catch (error) {
        failedCount++
        console.error(`[Cron] Failed to send reminder for appointment ${appointment.id}:`, error)
      }
    }

    console.log(`[Cron] Appointment reminders complete. Sent: ${sentCount}, Failed: ${failedCount}`)

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron] Error sending appointment reminders:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to process appointment reminders',
      timestamp: new Date().toISOString(),
    })
  }
}
