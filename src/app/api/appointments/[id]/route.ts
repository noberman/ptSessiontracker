import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveAvailability } from '@/lib/availability'
import { orgTimeToUtc } from '@/utils/timezone'
import { renderAppointmentCancellationEmail } from '@/lib/email/render'
import { EmailService } from '@/lib/email/sender'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/appointments/[id] — Get a single appointment
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const appointment = await prisma.appointment.findFirst({
      where: { id, organizationId: session.user.organizationId },
      include: {
        trainer: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
        location: { select: { id: true, name: true } },
        package: { select: { id: true, name: true } },
        bookedBy: { select: { id: true, name: true, email: true } },
      },
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Trainers can only view their own appointments
    if (session.user.role === 'TRAINER' && appointment.trainerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(appointment)
  } catch (error) {
    console.error('Failed to fetch appointment:', error)
    return NextResponse.json({ error: 'Failed to fetch appointment' }, { status: 500 })
  }
}

// PUT /api/appointments/[id] — Update an appointment
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const orgId = session.user.organizationId
    const role = session.user.role

    const existing = await prisma.appointment.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    if (existing.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Cannot edit a cancelled appointment' }, { status: 400 })
    }

    // Permission check
    if (role === 'TRAINER' && existing.trainerId !== session.user.id) {
      return NextResponse.json({ error: 'Trainers can only edit their own appointments' }, { status: 403 })
    }
    if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER', 'TRAINER'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      scheduledAt: scheduledAtInput,
      duration,
      notes,
      status,
      locationId,
      clientId,
      packageId,
      prospectName,
      prospectEmail,
    } = body

    const updateData: Record<string, unknown> = {}

    // Handle optional field updates
    if (notes !== undefined) updateData.notes = notes || null
    if (clientId !== undefined) updateData.clientId = clientId || null
    if (packageId !== undefined) updateData.packageId = packageId || null
    if (prospectName !== undefined) updateData.prospectName = prospectName || null
    if (prospectEmail !== undefined) updateData.prospectEmail = prospectEmail || null

    // Validate status transitions
    if (status !== undefined) {
      const validStatuses = ['SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updateData.status = status
    }

    // Validate location if changed
    if (locationId !== undefined) {
      const location = await prisma.location.findFirst({
        where: { id: locationId, organizationId: orgId },
      })
      if (!location) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 })
      }
      updateData.locationId = locationId
    }

    // Validate duration if changed
    if (duration !== undefined) {
      if (!Number.isInteger(duration) || duration <= 0 || duration % 15 !== 0) {
        return NextResponse.json(
          { error: 'duration must be a positive multiple of 15 (minutes)' },
          { status: 400 }
        )
      }
      updateData.duration = duration
    }

    // Validate and convert scheduledAt if changed
    if (scheduledAtInput !== undefined) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { timezone: true },
      })
      const orgTimezone = org?.timezone || 'Asia/Singapore'

      const scheduledAtUtc = orgTimeToUtc(scheduledAtInput, orgTimezone)

      if (scheduledAtUtc <= new Date()) {
        return NextResponse.json(
          { error: 'Appointment must be scheduled in the future' },
          { status: 400 }
        )
      }

      if (scheduledAtUtc.getMinutes() % 15 !== 0) {
        return NextResponse.json(
          { error: 'Appointment time must be on a 15-minute boundary' },
          { status: 400 }
        )
      }

      // Re-validate availability if time or duration changed
      const dateStr = scheduledAtInput.substring(0, 10)
      const timeStr = scheduledAtInput.substring(11, 16)
      const finalDuration = (duration as number) ?? existing.duration

      const entries = await prisma.trainerAvailability.findMany({
        where: { trainerId: existing.trainerId, organizationId: orgId },
      })

      const resolved = resolveAvailability(entries, dateStr, dateStr, orgTimezone)
      const dayAvail = resolved.get(dateStr)

      if (!dayAvail || !dayAvail.isAvailable || dayAvail.blocks.length === 0) {
        return NextResponse.json(
          { error: 'Trainer is not available on this date' },
          { status: 400 }
        )
      }

      const startMinutes = timeToMinutes(timeStr)
      const endMinutes = startMinutes + finalDuration

      const fitsInBlock = dayAvail.blocks.some((block) => {
        const blockStart = timeToMinutes(block.startTime)
        const blockEnd = timeToMinutes(block.endTime)
        return startMinutes >= blockStart && endMinutes <= blockEnd
      })

      if (!fitsInBlock) {
        return NextResponse.json(
          { error: "Appointment does not fit within trainer's available hours" },
          { status: 400 }
        )
      }

      updateData.scheduledAt = scheduledAtUtc
    }

    // Validate package if changed for SESSION type
    if (packageId !== undefined && (existing.type === 'SESSION' || body.type === 'SESSION')) {
      const effectiveClientId = (clientId as string) ?? existing.clientId
      if (packageId && effectiveClientId) {
        const pkg = await prisma.package.findFirst({
          where: { id: packageId, clientId: effectiveClientId, active: true },
        })
        if (!pkg) {
          return NextResponse.json(
            { error: 'Package not found, not active, or does not belong to this client' },
            { status: 400 }
          )
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        trainer: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
        location: { select: { id: true, name: true } },
        package: { select: { id: true, name: true } },
        bookedBy: { select: { id: true, name: true, email: true } },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'APPOINTMENT_UPDATED',
        userId: session.user.id,
        entityType: 'Appointment',
        entityId: id,
        oldValue: {
          scheduledAt: existing.scheduledAt.toISOString(),
          duration: existing.duration,
          status: existing.status,
          notes: existing.notes,
          locationId: existing.locationId,
          clientId: existing.clientId,
          packageId: existing.packageId,
        },
        newValue: updateData as Record<string, string | number | boolean | null>,
      },
    })

    // Send cancellation email if status changed to CANCELLED
    if (status === 'CANCELLED') {
      await sendCancellationEmailIfFuture({
        appointment: updated,
        prospectName: existing.prospectName,
        prospectEmail: existing.prospectEmail,
        duration: updated.duration ?? existing.duration,
        type: existing.type,
        cancelledByName: session.user.name || 'Staff',
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update appointment:', error)
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 })
  }
}

// DELETE /api/appointments/[id] — Cancel an appointment (soft cancel)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const orgId = session.user.organizationId
    const role = session.user.role

    const existing = await prisma.appointment.findFirst({
      where: { id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    if (existing.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Appointment is already cancelled' }, { status: 400 })
    }

    // Permission check
    if (role === 'TRAINER' && existing.trainerId !== session.user.id) {
      return NextResponse.json({ error: 'Trainers can only cancel their own appointments' }, { status: 403 })
    }
    if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER', 'TRAINER'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const cancelled = await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        trainer: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
        location: { select: { id: true, name: true } },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'APPOINTMENT_CANCELLED',
        userId: session.user.id,
        entityType: 'Appointment',
        entityId: id,
        oldValue: { status: existing.status },
        newValue: { status: 'CANCELLED' },
      },
    })

    // Send cancellation email only for future appointments
    await sendCancellationEmailIfFuture({
      appointment: cancelled,
      prospectName: existing.prospectName,
      prospectEmail: existing.prospectEmail,
      duration: existing.duration,
      type: existing.type,
      cancelledByName: session.user.name || 'Staff',
    })

    return NextResponse.json(cancelled)
  } catch (error) {
    console.error('Failed to cancel appointment:', error)
    return NextResponse.json({ error: 'Failed to cancel appointment' }, { status: 500 })
  }
}

/** Convert "HH:mm" to minutes since midnight */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/** Send cancellation email if the appointment is in the future */
async function sendCancellationEmailIfFuture({
  appointment,
  prospectName,
  prospectEmail,
  duration,
  type,
  cancelledByName,
}: {
  appointment: {
    id: string
    scheduledAt: Date
    organizationId: string
    trainer: { id: string; name: string }
    client: { name: string; email: string } | null
    location: { name: string }
  }
  prospectName: string | null
  prospectEmail: string | null
  duration: number
  type: string
  cancelledByName: string
}) {
  const isFuture = appointment.scheduledAt > new Date()
  if (!isFuture) return

  const recipientEmail = appointment.client?.email || prospectEmail
  const recipientName = appointment.client?.name || prospectName
  if (!recipientEmail || !recipientName) return

  try {
    const org = await prisma.organization.findUnique({
      where: { id: appointment.organizationId },
      select: { timezone: true },
    })
    const orgTimezone = org?.timezone || 'Asia/Singapore'

    const { html, text } = await renderAppointmentCancellationEmail({
      recipientName,
      appointmentType: type,
      scheduledAt: appointment.scheduledAt,
      duration,
      trainerName: appointment.trainer.name,
      locationName: appointment.location.name,
      cancelledByName,
      orgTimezone,
    })

    await EmailService.sendWithRetry({
      to: recipientEmail,
      subject: `Appointment Cancelled with ${appointment.trainer.name}`,
      html,
      text,
      template: 'appointment-cancellation',
      metadata: {
        appointmentId: appointment.id,
        trainerId: appointment.trainer.id,
      },
    })

    console.log('Cancellation email sent:', {
      to: recipientEmail,
      appointmentId: appointment.id,
    })
  } catch (emailError) {
    console.error('Failed to send cancellation email:', emailError)
  }
}
