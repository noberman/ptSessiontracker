import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EmailService } from '@/lib/email/sender'
import { renderSessionValidationEmail } from '@/lib/email/render'
import { getOrganizationId } from '@/lib/organization-context'
import { canCreateSession } from '@/lib/usage-limits'
import crypto from 'crypto'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get organization context
  let orgId: string
  try {
    orgId = await getOrganizationId()
  } catch (error) {
    return NextResponse.json({ error: 'No organization context' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const clientIds = searchParams.get('clientIds')
  const trainerIds = searchParams.get('trainerIds')
  const locationIds = searchParams.get('locationIds')
  const validatedStatuses = searchParams.get('validatedStatuses')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  
  const skip = (page - 1) * limit

  const where: any = {
    // Filter sessions by organization directly
    organizationId: orgId
  }

  // Filter by clients (multi-select)
  if (clientIds) {
    const ids = clientIds.split(',').filter(Boolean)
    if (ids.length > 0) {
      where.clientId = { in: ids }
    }
  }

  // Filter by trainers (multi-select)
  if (trainerIds) {
    const ids = trainerIds.split(',').filter(Boolean)
    if (ids.length > 0) {
      where.trainerId = { in: ids }
    }
  } else if (session.user.role === 'TRAINER') {
    // Trainers can only see their own sessions
    where.trainerId = session.user.id
  }

  // Filter by locations (multi-select)
  if (locationIds) {
    const ids = locationIds.split(',').filter(Boolean)
    if (ids.length > 0) {
      where.locationId = { in: ids }
    }
  } else if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
    // Club managers can only see sessions at their location
    where.locationId = session.user.locationId
  }

  // Filter by validation status (multi-select)
  if (validatedStatuses) {
    const statuses = validatedStatuses.split(',').filter(Boolean)
    if (statuses.length === 1) {
      where.validated = statuses[0] === 'true'
    } else if (statuses.length > 1) {
      // If both are selected, show all (no filter needed)
      where.OR = statuses.map(status => ({ validated: status === 'true' }))
    }
  }

  // Date range filter
  if (startDate || endDate) {
    where.sessionDate = {}
    if (startDate) {
      where.sessionDate.gte = new Date(startDate)
    }
    if (endDate) {
      const endDateTime = new Date(endDate)
      endDateTime.setHours(23, 59, 59, 999)
      where.sessionDate.lte = endDateTime
    }
  }

  try {
    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          clientId: true,
          trainerId: true,
          packageId: true,
          locationId: true,
          sessionDate: true,
          sessionValue: true,
          notes: true,
          validated: true,
          cancelled: true,
          cancelledAt: true,
          validationToken: true,
          validationExpiry: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          trainer: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          location: {
            select: {
              id: true,
              name: true,
            }
          },
          package: {
            select: {
              id: true,
              name: true,
              packageType: true,
            }
          }
        },
        orderBy: {
          sessionDate: 'desc'
        }
      }),
      prisma.session.count({ where })
    ])

    return NextResponse.json({
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get organization context
  let orgId: string
  try {
    orgId = await getOrganizationId()
  } catch (error) {
    return NextResponse.json({ error: 'No organization context' }, { status: 400 })
  }

  // Check usage limits for session creation
  const canCreate = await canCreateSession(orgId)
  if (!canCreate.allowed) {
    return NextResponse.json(
      { 
        error: canCreate.reason,
        needsUpgrade: true,
        usage: canCreate.usage 
      },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const {
      clientId,
      trainerId,
      packageId,
      sessionDate,
      sessionTime,
      notes,
      isNoShow,
      isDemo = false
    } = body

    // Validate required fields
    if (!clientId || !packageId || !sessionDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Determine the trainer ID
    let actualTrainerId = session.user.id
    
    // Only managers and admins can specify a different trainer
    if (trainerId && trainerId !== session.user.id) {
      if (!['PT_MANAGER', 'ADMIN', 'CLUB_MANAGER'].includes(session.user.role)) {
        return NextResponse.json(
          { error: 'You do not have permission to create sessions for other trainers' },
          { status: 403 }
        )
      }
      
      // Verify the trainer exists, is active, and belongs to the organization
      const trainer = await prisma.user.findUnique({
        where: { 
          id: trainerId, 
          role: 'TRAINER', 
          active: true,
          organizationId: orgId
        }
      })
      
      if (!trainer) {
        return NextResponse.json(
          { error: 'Invalid trainer selected or trainer not in your organization' },
          { status: 400 }
        )
      }
      
      actualTrainerId = trainerId
    }

    // Get the client and package details
    const [client, pkg] = await Promise.all([
      prisma.client.findUnique({
        where: { id: clientId },
        include: {
          primaryTrainer: true,
          location: true,
        }
      }),
      prisma.package.findUnique({
        where: { id: packageId }
      })
    ])

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    if (!pkg) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }

    // Check if package belongs to the client
    if (pkg.clientId !== clientId) {
      return NextResponse.json(
        { error: 'Package does not belong to this client' },
        { status: 400 }
      )
    }

    // Check if package is active
    if (!pkg.active) {
      return NextResponse.json(
        { error: 'Package is inactive' },
        { status: 400 }
      )
    }

    // Check if package has expired
    if (pkg.expiresAt && new Date(pkg.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Package has expired' },
        { status: 400 }
      )
    }

    // For trainers, verify they have permission to create sessions for this client
    if (session.user.role === 'TRAINER') {
      // Check if trainer is at the same location as the client
      const trainer = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { locationId: true, organizationId: true }
      })

      if (trainer?.locationId !== client.locationId) {
        return NextResponse.json(
          { error: 'You can only create sessions for clients at your location' },
          { status: 403 }
        )
      }
      
      // Verify trainer belongs to the organization
      if (trainer?.organizationId !== orgId) {
        return NextResponse.json(
          { error: 'Trainer does not belong to your organization' },
          { status: 403 }
        )
      }
    }

    // Verify the actual trainer (could be different from session user) belongs to the organization
    const actualTrainer = await prisma.user.findUnique({
      where: { id: actualTrainerId },
      select: { organizationId: true }
    })
    
    if (actualTrainer?.organizationId !== orgId) {
      return NextResponse.json(
        { error: 'Selected trainer does not belong to your organization' },
        { status: 403 }
      )
    }

    // Generate validation token (only if not a no-show)
    const validationToken = isNoShow ? null : crypto.randomBytes(32).toString('hex')
    const validationExpiry = isNoShow ? null : (() => {
      const expiry = new Date()
      expiry.setDate(expiry.getDate() + 30) // 30 days from now
      return expiry
    })()

    // Combine date and time if provided
    const sessionDateTime = new Date(sessionDate)
    if (sessionTime) {
      const [hours, minutes] = sessionTime.split(':')
      sessionDateTime.setHours(parseInt(hours), parseInt(minutes))
    }

    // Create the session in a transaction
    const newSession = await prisma.$transaction(async (tx) => {
      // Create the session with organizationId for direct filtering
      const createdSession = await tx.session.create({
        data: {
          clientId,
          trainerId: actualTrainerId,
          packageId,
          locationId: client.locationId,
          sessionDate: sessionDateTime,
          sessionValue: pkg.sessionValue,
          notes: isNoShow ? (notes ? `${notes}\n\nNo-Show` : 'No-Show') : (notes || null),
          validated: false,
          cancelled: isNoShow || false,
          cancelledAt: isNoShow ? new Date() : null,
          validationToken,
          validationExpiry,
          organizationId: orgId, // Set organizationId directly for O(log n) queries
          isDemo, // Add isDemo flag
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          trainer: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          location: {
            select: {
              id: true,
              name: true,
            }
          },
          package: {
            select: {
              id: true,
              name: true,
              packageType: true,
            }
          }
        }
      })

      // Update package remaining sessions
      if (pkg.remainingSessions > 0) {
        await tx.package.update({
          where: { id: packageId },
          data: {
            remainingSessions: pkg.remainingSessions - 1
          }
        })
      }

      // TODO: Add audit logging when AuditLog model is created

      return createdSession
    })

    // Send validation email to client (only if not a no-show)
    if (!isNoShow) {
      try {
        const validationUrl = `${process.env.APP_URL || 'https://www.fitsync.io'}/validate/${newSession.validationToken}`
        
        const { html, text } = await renderSessionValidationEmail({
          clientName: newSession.client.name,
          trainerName: newSession.trainer.name,
          sessionDate: newSession.sessionDate,
          location: newSession.location.name,
          sessionValue: newSession.sessionValue,
          validationUrl,
          expiryDays: parseInt(process.env.SESSION_VALIDATION_EXPIRY_DAYS || '30'),
        })

        await EmailService.sendWithRetry({
          to: newSession.client.email,
          subject: `Please confirm your training session with ${newSession.trainer.name}`,
          html,
          text,
          template: 'session-validation',
          metadata: {
            sessionId: newSession.id,
            clientId: newSession.client.id,
            trainerId: newSession.trainer.id,
          }
        })

        console.log(`Validation email sent to ${newSession.client.email} for session ${newSession.id}`)
      } catch (emailError) {
        // Log error but don't fail the session creation
        console.error('Failed to send validation email:', emailError)
        // You might want to create a notification for admins here
      }
    } else {
      console.log(`No-show session created for client ${newSession.client.email} - no validation email sent`)
    }

    return NextResponse.json(newSession, { status: 201 })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}