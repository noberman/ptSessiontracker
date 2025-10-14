import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getUserAccessibleLocations } from '@/lib/user-locations'

interface ReassignmentRequest {
  clientId: string
  fromTrainerId: string
  toTrainerId: string
  locationId: string
}

// POST /api/clients/bulk-reassign - Reassign multiple clients to new trainers
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and admins can bulk reassign
    if (!['CLUB_MANAGER', 'PT_MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { reassignments } = body as { reassignments: ReassignmentRequest[] }

    if (!reassignments || !Array.isArray(reassignments) || reassignments.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: reassignments array required' },
        { status: 400 }
      )
    }

    // Process all reassignments in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const processedResults: Array<{
        clientId: string
        success: boolean
        error?: string
        clientName?: string
        newTrainerName?: string
      }> = []

      for (const reassignment of reassignments) {
        const { clientId, fromTrainerId, toTrainerId, locationId } = reassignment

        try {
          // Verify client exists and is at the specified location
          const client = await tx.client.findFirst({
            where: {
              id: clientId,
              locationId: locationId,
              active: true
            }
          })

          if (!client) {
            processedResults.push({
              clientId,
              success: false,
              error: 'Client not found or not at specified location'
            })
            continue
          }

          // Verify the current trainer assignment
          if (client.primaryTrainerId !== fromTrainerId) {
            processedResults.push({
              clientId,
              success: false,
              error: 'Client is not assigned to the specified trainer'
            })
            continue
          }

          // Verify new trainer has access to the location
          const newTrainer = await tx.user.findFirst({
            where: {
              id: toTrainerId,
              active: true,
              role: { in: ['TRAINER', 'PT_MANAGER', 'ADMIN'] }
            },
            include: {
              locations: true
            }
          })

          if (!newTrainer) {
            processedResults.push({
              clientId,
              success: false,
              error: 'New trainer not found or inactive'
            })
            continue
          }

          // Check if new trainer has access to the location (admins always have access)
          const hasLocationAccess = newTrainer.role === 'ADMIN' || 
            newTrainer.locations.some(loc => loc.locationId === locationId)

          if (!hasLocationAccess) {
            processedResults.push({
              clientId,
              success: false,
              error: `${newTrainer.name} does not have access to this location`
            })
            continue
          }

          // Perform the reassignment
          await tx.client.update({
            where: { id: clientId },
            data: { primaryTrainerId: toTrainerId }
          })

          // Create audit log
          await tx.auditLog.create({
            data: {
              action: 'CLIENT_REASSIGNED',
              userId: session.user.id,
              entityType: 'Client',
              entityId: clientId,
              oldValue: { primaryTrainerId: fromTrainerId },
              newValue: { 
                primaryTrainerId: toTrainerId,
                reason: 'location_access_removal'
              }
            }
          })

          processedResults.push({
            clientId,
            success: true,
            clientName: client.name,
            newTrainerName: newTrainer.name
          })

        } catch (error) {
          console.error(`Error reassigning client ${clientId}:`, error)
          processedResults.push({
            clientId,
            success: false,
            error: 'Failed to reassign client'
          })
        }
      }

      return processedResults
    })

    // Calculate summary
    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: failureCount === 0,
      totalRequested: reassignments.length,
      successCount,
      failureCount,
      results
    })

  } catch (error) {
    console.error('Error in bulk reassignment:', error)
    return NextResponse.json(
      { error: 'Failed to process reassignments' },
      { status: 500 }
    )
  }
}