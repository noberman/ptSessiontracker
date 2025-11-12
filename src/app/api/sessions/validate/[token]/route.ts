import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Check validation token status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    console.log('🔍 Validation GET request for token:', token)

    if (!token) {
      console.log('❌ No token provided')
      return NextResponse.json(
        { error: 'Validation token is required' },
        { status: 400 }
      )
    }

    // Find session by validation token
    console.log('🔍 Looking for session with validation token:', token)
    const session = await prisma.session.findUnique({
      where: { validationToken: token },
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
        },
        organization: {
          select: {
            timezone: true
          }
        }
      }
    })

    console.log('🔍 Session found:', session ? 'YES' : 'NO')
    if (session) {
      console.log('📋 Session details:', {
        id: session.id,
        validated: session.validated,
        validationExpiry: session.validationExpiry,
        sessionDate: session.sessionDate,
        clientEmail: session.client?.email,
        trainerEmail: session.trainer?.email
      })
    }

    if (!session) {
      console.log('❌ Session not found for token:', token)
      return NextResponse.json(
        { 
          error: 'Invalid or expired validation token',
          help: 'This validation link appears to be invalid. Please contact support for assistance.'
        },
        { status: 404 }
      )
    }

    // Check if already validated
    if (session.validated) {
      console.log('⚠️ Session already validated:', {
        sessionId: session.id,
        validatedAt: session.validatedAt,
        clientEmail: session.client?.email,
        trainerEmail: session.trainer?.email,
        requestedToken: token
      })
      return NextResponse.json({
        status: 'already_validated',
        validatedAt: session.validatedAt,
        help: 'This session has already been validated. If you received this link in error, please contact support.',
        session: {
          id: session.id,
          sessionDate: session.sessionDate.toISOString().slice(0, -1), // Remove 'Z' to treat as local time
          createdAt: session.createdAt.toISOString(),
          sessionValue: session.sessionValue,
          client: session.client,
          trainer: session.trainer,
          location: session.location,
          package: session.package,
          organization: session.organization
        }
      })
    }

    // Check if token has expired
    if (session.validationExpiry && new Date(session.validationExpiry) < new Date()) {
      return NextResponse.json({
        status: 'expired',
        expiredAt: session.validationExpiry,
        session: {
          id: session.id,
          sessionDate: session.sessionDate.toISOString().slice(0, -1), // Remove 'Z' to treat as local time
          createdAt: session.createdAt.toISOString(),
          sessionValue: session.sessionValue,
          client: session.client,
          trainer: session.trainer,
          location: session.location,
          package: session.package,
          organization: session.organization
        }
      })
    }

    // Token is valid and ready for validation
    return NextResponse.json({
      status: 'pending',
      session: {
        id: session.id,
        sessionDate: session.sessionDate.toISOString().slice(0, -1), // Remove 'Z' to treat as local time
        createdAt: session.createdAt.toISOString(),
        sessionValue: session.sessionValue,
        notes: session.notes,
        client: session.client,
        trainer: session.trainer,
        location: session.location,
        package: session.package,
        organization: session.organization
      }
    })
  } catch (error: any) {
    console.error('❌ Validation check error:', error)
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    })
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Validate the session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { error: 'Validation token is required' },
        { status: 400 }
      )
    }

    // Find session by validation token
    const session = await prisma.session.findUnique({
      where: { validationToken: token },
      include: {
        client: true,
        trainer: true,
        package: true,
      }
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid or expired validation token' },
        { status: 404 }
      )
    }

    // Check if already validated
    if (session.validated) {
      return NextResponse.json({
        message: 'Session already validated',
        validatedAt: session.validatedAt,
      })
    }

    // Check if token has expired
    if (session.validationExpiry && new Date(session.validationExpiry) < new Date()) {
      return NextResponse.json(
        { error: 'Validation token has expired' },
        { status: 400 }
      )
    }

    // Validate the session
    const updatedSession = await prisma.session.update({
      where: { id: session.id },
      data: {
        validated: true,
        validatedAt: new Date(),
      },
      include: {
        client: {
          select: {
            name: true,
            email: true,
          }
        },
        trainer: {
          select: {
            name: true,
            email: true,
          }
        },
      }
    })

    // Log the validation in audit log
    await prisma.auditLog.create({
      data: {
        action: 'SESSION_VALIDATED',
        entityType: 'Session',
        entityId: session.id,
        newValue: {
          validated: true,
          validatedAt: new Date().toISOString(),
          validatedBy: 'client',
          clientEmail: session.client.email,
        },
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Session validated successfully',
      session: {
        id: updatedSession.id,
        sessionDate: updatedSession.sessionDate.toISOString().slice(0, -1), // Remove 'Z' to treat as local time
        validatedAt: updatedSession.validatedAt,
        client: updatedSession.client,
        trainer: updatedSession.trainer,
      }
    })
  } catch (error: any) {
    console.error('Validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate session' },
      { status: 500 }
    )
  }
}