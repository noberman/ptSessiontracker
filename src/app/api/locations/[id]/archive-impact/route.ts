import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/locations/[id]/archive-impact - Check what would be affected if we archive this location
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: locationId } = await context.params
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and admins can check archive impact
    if (!['CLUB_MANAGER', 'PT_MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify location exists and belongs to user's organization
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { 
        id: true, 
        name: true,
        organizationId: true,
        active: true
      }
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check if this is the user's organization
    if (location.organizationId !== session.user.organizationId) {
      return NextResponse.json(
        { error: 'Location not in your organization' },
        { status: 403 }
      )
    }

    // If already archived, return that info
    if (!location.active) {
      return NextResponse.json({
        canArchive: false,
        blockers: [{
          type: 'already_archived',
          count: 0,
          message: 'This location is already archived'
        }],
        summary: {}
      })
    }

    console.log('🔍 Checking archive impact for location:', locationId, location.name)
    
    // Check all dependencies in parallel
    const [
      activeUsers,
      activeClients,
      upcomingSessions,
      activePackages,
      totalActiveLocations,
      historicalSessions
    ] = await Promise.all([
      // Count active users with access to this location
      prisma.userLocation.count({
        where: {
          locationId,
          user: { active: true }
        }
      }),
      
      // Count active clients at this location
      prisma.client.count({
        where: {
          locationId,
          active: true
        }
      }),
      
      // Count upcoming sessions (next 30 days)
      prisma.session.count({
        where: {
          locationId,
          sessionDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Count active packages for clients at this location
      prisma.package.count({
        where: {
          client: {
            locationId,
            active: true
          },
          active: true
        }
      }),
      
      // Count total active locations in organization
      prisma.location.count({
        where: {
          organizationId: location.organizationId,
          active: true
        }
      }),
      
      // Count all historical sessions (for info)
      prisma.session.count({
        where: { locationId }
      })
    ])

    // Log the results
    console.log('📊 Archive impact results:', {
      locationId,
      locationName: location.name,
      activeUsers,
      activeClients,
      upcomingSessions,
      activePackages,
      totalActiveLocations,
      historicalSessions
    })

    // Build blockers array
    const blockers = []

    // Check if this is the last active location
    if (totalActiveLocations <= 1) {
      console.log('❌ Blocking: Last active location in organization')
      blockers.push({
        type: 'last_location',
        count: 1,
        message: 'Cannot archive the only remaining active location'
      })
    }

    // Check for active users
    if (activeUsers > 0) {
      console.log('❌ Blocking: Active users found:', activeUsers)
      blockers.push({
        type: 'users',
        count: activeUsers,
        message: `${activeUsers} user${activeUsers !== 1 ? 's have' : ' has'} access to this location`
      })
    }

    // Check for active clients
    if (activeClients > 0) {
      console.log('❌ Blocking: Active clients found:', activeClients)
      blockers.push({
        type: 'clients',
        count: activeClients,
        message: `${activeClients} active client${activeClients !== 1 ? 's are' : ' is'} assigned to this location`
      })
    }

    // Check for upcoming sessions
    if (upcomingSessions > 0) {
      console.log('❌ Blocking: Upcoming sessions found:', upcomingSessions)
      blockers.push({
        type: 'upcoming_sessions',
        count: upcomingSessions,
        message: `${upcomingSessions} upcoming session${upcomingSessions !== 1 ? 's are' : ' is'} scheduled at this location`
      })
    }

    // Check for active packages
    if (activePackages > 0) {
      console.log('❌ Blocking: Active packages found:', activePackages)
      blockers.push({
        type: 'packages',
        count: activePackages,
        message: `${activePackages} active package${activePackages !== 1 ? 's are' : ' is'} assigned to this location`
      })
    }

    // Build warnings array (informational)
    const warnings = []
    if (historicalSessions > 0) {
      warnings.push({
        type: 'historical_sessions',
        count: historicalSessions,
        message: `${historicalSessions} historical session${historicalSessions !== 1 ? 's' : ''} will remain linked to this archived location`,
        severity: 'info'
      })
    }

    // Determine if location can be archived
    const canArchive = blockers.length === 0
    
    console.log('📋 Final archive decision:', {
      canArchive,
      blockerCount: blockers.length,
      blockers: blockers.map(b => `${b.type}: ${b.count}`)
    })

    return NextResponse.json({
      canArchive,
      blockers,
      warnings,
      summary: {
        activeUsers,
        activeClients,
        upcomingSessions,
        activePackages,
        historicalSessions,
        totalActiveLocations
      },
      location: {
        id: location.id,
        name: location.name
      }
    })

  } catch (error) {
    console.error('Error checking archive impact:', error)
    return NextResponse.json(
      { error: 'Failed to check archive impact' },
      { status: 500 }
    )
  }
}