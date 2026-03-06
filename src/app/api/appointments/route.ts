import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveAvailability } from '@/lib/availability'
import { orgTimeToUtc } from '@/utils/timezone'
import { renderAppointmentConfirmationEmail } from '@/lib/email/render'
import { EmailService } from '@/lib/email/sender'

// GET /api/appointments — List appointments with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = session.user.organizationId
    const params = request.nextUrl.searchParams

    const trainerId = params.get('trainerId')
    const clientId = params.get('clientId')
    const locationId = params.get('locationId')
    const status = params.get('status')
    const type = params.get('type')
    const startDate = params.get('startDate')
    const endDate = params.get('endDate')

    const where: Record<string, unknown> = { organizationId: orgId }

    // Role-based filtering
    if (session.user.role === 'TRAINER') {
      where.trainerId = session.user.id
    } else if (['CLUB_MANAGER', 'PT_MANAGER'].includes(session.user.role)) {
      // Managers see appointments at their accessible locations
      if (!locationId) {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { locations: { select: { locationId: true } } },
        })
        const locationIds = user?.locations.map((l) => l.locationId) || []
        if (locationIds.length > 0) {
          where.locationId = { in: locationIds }
        }
      }
    }
    // ADMIN sees all org appointments

    // Apply filters
    if (trainerId) where.trainerId = trainerId
    if (clientId) where.clientId = clientId
    if (locationId) where.locationId = locationId
    if (status) where.status = status
    if (type) where.type = type

    // Date range filter (startDate/endDate are YYYY-MM-DD in org timezone)
    if (startDate || endDate) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { timezone: true },
      })
      const tz = org?.timezone || 'Asia/Singapore'

      const scheduledAt: Record<string, Date> = {}
      if (startDate) {
        scheduledAt.gte = orgTimeToUtc(`${startDate} 00:00:00`, tz)
      }
      if (endDate) {
        scheduledAt.lte = orgTimeToUtc(`${endDate} 23:59:59`, tz)
      }
      where.scheduledAt = scheduledAt
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        trainer: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true, status: true } },
        location: { select: { id: true, name: true } },
        package: { select: { id: true, name: true } },
        bookedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    return NextResponse.json(appointments)
  } catch (error) {
    console.error('Failed to fetch appointments:', error)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }
}

// POST /api/appointments — Create an appointment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = session.user.organizationId
    const role = session.user.role
    const body = await request.json()

    const {
      trainerId,
      clientId,
      packageId,
      type = 'SESSION',
      scheduledAt: scheduledAtInput,
      duration = 60,
      prospectName,
      prospectEmail,
      notes,
    } = body

    // Required fields
    if (!trainerId || !scheduledAtInput) {
      return NextResponse.json(
        { error: 'trainerId and scheduledAt are required' },
        { status: 400 }
      )
    }

    // Validate type
    if (!['SESSION', 'FITNESS_ASSESSMENT'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be SESSION or FITNESS_ASSESSMENT' },
        { status: 400 }
      )
    }

    // Validate duration (positive, multiple of 15)
    if (!Number.isInteger(duration) || duration <= 0 || duration % 15 !== 0) {
      return NextResponse.json(
        { error: 'duration must be a positive multiple of 15 (minutes)' },
        { status: 400 }
      )
    }

    // Permission check: trainers book own, managers book on behalf
    if (role === 'TRAINER') {
      if (trainerId !== session.user.id) {
        return NextResponse.json(
          { error: 'Trainers can only book their own appointments' },
          { status: 403 }
        )
      }
    } else if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify trainer exists and belongs to org (include locations for fallback)
    const trainer = await prisma.user.findFirst({
      where: { id: trainerId, organizationId: orgId, active: true },
      include: { locations: { select: { locationId: true } } },
    })
    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found or inactive' }, { status: 404 })
    }

    // Type-specific validation
    if (type === 'SESSION') {
      if (!clientId) {
        return NextResponse.json(
          { error: 'clientId is required for SESSION appointments' },
          { status: 400 }
        )
      }
      if (packageId) {
        const pkg = await prisma.package.findFirst({
          where: { id: packageId, clientId, active: true },
        })
        if (!pkg) {
          return NextResponse.json(
            { error: 'Package not found, not active, or does not belong to this client' },
            { status: 400 }
          )
        }
      }
    }

    if (type === 'FITNESS_ASSESSMENT') {
      if (!clientId && (!prospectName || !prospectEmail)) {
        return NextResponse.json(
          { error: 'FITNESS_ASSESSMENT requires either clientId or both prospectName and prospectEmail' },
          { status: 400 }
        )
      }
    }

    // Resolve location automatically:
    // 1. If client provided → use client's location
    // 2. Else (prospect) → use trainer's first location
    let resolvedLocationId: string | null = null
    let resolvedClientId: string | null = clientId || null

    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, organizationId: orgId },
        select: { locationId: true },
      })
      if (!client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
      resolvedLocationId = client.locationId
    } else if (type === 'FITNESS_ASSESSMENT' && prospectName && prospectEmail) {
      // Auto-create or find client for fitness assessments
      resolvedLocationId = trainer.locations[0]?.locationId || null

      if (resolvedLocationId) {
        const existingClient = await prisma.client.findFirst({
          where: { email: prospectEmail, organizationId: orgId },
          select: { id: true, status: true },
        })

        if (existingClient) {
          resolvedClientId = existingClient.id
          // Re-activate archived clients
          if (existingClient.status === 'ARCHIVED') {
            await prisma.client.update({
              where: { id: existingClient.id },
              data: { status: 'ACTIVE' },
            })
          }
        } else {
          const newClient = await prisma.client.create({
            data: {
              name: prospectName,
              email: prospectEmail,
              locationId: resolvedLocationId,
              organizationId: orgId,
              status: 'ACTIVE',
            },
            select: { id: true },
          })
          resolvedClientId = newClient.id
        }
      }
    } else {
      // Prospect without auto-create — use trainer's first location
      resolvedLocationId = trainer.locations[0]?.locationId || null
    }

    if (!resolvedLocationId) {
      return NextResponse.json(
        { error: 'Could not determine location for this appointment' },
        { status: 400 }
      )
    }

    // Get org timezone
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { timezone: true },
    })
    const orgTimezone = org?.timezone || 'Asia/Singapore'

    // Convert scheduledAt from org timezone to UTC
    // Input format: "YYYY-MM-DD HH:mm" or "YYYY-MM-DDTHH:mm"
    const scheduledAtUtc = orgTimeToUtc(scheduledAtInput, orgTimezone)

    // Validate scheduledAt is 15-min aligned
    if (scheduledAtUtc.getMinutes() % 15 !== 0) {
      return NextResponse.json(
        { error: 'Appointment time must be on a 15-minute boundary (:00, :15, :30, :45)' },
        { status: 400 }
      )
    }

    // Validate appointment falls within trainer's available hours
    // Extract the date string (YYYY-MM-DD) from the input
    const dateStr = scheduledAtInput.substring(0, 10)
    const availabilityEntries = await prisma.trainerAvailability.findMany({
      where: { trainerId, organizationId: orgId },
    })

    const resolved = resolveAvailability(availabilityEntries, dateStr, dateStr, orgTimezone)
    const dayAvail = resolved.get(dateStr)

    if (!dayAvail || !dayAvail.isAvailable || dayAvail.blocks.length === 0) {
      return NextResponse.json(
        { error: 'Trainer is not available on this date' },
        { status: 400 }
      )
    }

    // Check that the full appointment window (start → start+duration) fits within an availability block
    const timeStr = scheduledAtInput.substring(11, 16) // "HH:mm"
    const startMinutes = timeToMinutes(timeStr)
    const endMinutes = startMinutes + duration

    const fitsInBlock = dayAvail.blocks.some((block) => {
      const blockStart = timeToMinutes(block.startTime)
      const blockEnd = timeToMinutes(block.endTime)
      return startMinutes >= blockStart && endMinutes <= blockEnd
    })

    if (!fitsInBlock) {
      return NextResponse.json(
        { error: 'Appointment does not fit within trainer\'s available hours' },
        { status: 400 }
      )
    }

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        trainerId,
        clientId: resolvedClientId,
        locationId: resolvedLocationId,
        packageId: packageId || null,
        organizationId: orgId,
        type,
        scheduledAt: scheduledAtUtc,
        duration,
        status: 'SCHEDULED',
        prospectName: prospectName || null,
        prospectEmail: prospectEmail || null,
        bookedById: session.user.id,
        notes: notes || null,
      },
      include: {
        trainer: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true, status: true } },
        location: { select: { id: true, name: true } },
        package: { select: { id: true, name: true } },
        bookedBy: { select: { id: true, name: true, email: true } },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'APPOINTMENT_CREATED',
        userId: session.user.id,
        entityType: 'Appointment',
        entityId: appointment.id,
        newValue: {
          trainerId,
          clientId: resolvedClientId,
          locationId: resolvedLocationId,
          type,
          scheduledAt: scheduledAtUtc.toISOString(),
          duration,
          prospectName: prospectName || null,
          prospectEmail: prospectEmail || null,
        },
      },
    })

    // Send confirmation email only for future appointments
    const isFuture = scheduledAtUtc > new Date()
    if (isFuture) {
      const recipientEmail = appointment.client?.email || appointment.prospectEmail
      const recipientName = appointment.client?.name || appointment.prospectName

      if (recipientEmail && recipientName) {
        try {
          const { html, text } = await renderAppointmentConfirmationEmail({
            recipientName,
            appointmentType: type,
            scheduledAt: scheduledAtUtc,
            duration,
            trainerName: appointment.trainer.name,
            locationName: appointment.location.name,
            notes: notes || null,
            orgTimezone,
          })

          await EmailService.sendWithRetry({
            to: recipientEmail,
            subject: `Appointment Confirmed with ${appointment.trainer.name}`,
            html,
            text,
            template: 'appointment-confirmation',
            metadata: {
              appointmentId: appointment.id,
              trainerId,
            },
          })

          console.log('Confirmation email sent:', {
            to: recipientEmail,
            appointmentId: appointment.id,
          })
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError)
        }
      }
    }

    return NextResponse.json(appointment, { status: 201 })
  } catch (error) {
    console.error('Failed to create appointment:', error)
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
  }
}

/** Convert "HH:mm" to minutes since midnight */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
