import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrganizationId } from '@/lib/organization-context'
import { canAddLocation } from '@/lib/usage-limits'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get organization context
    const organizationId = await getOrganizationId()
    
    // Check if requesting all locations (for admins inviting users)
    const url = new URL(request.url)
    const showAll = url.searchParams.get('all') === 'true'
    const includeArchived = url.searchParams.get('includeArchived') === 'true'
    
    // Build query based on user role and accessible locations
    const whereClause: any = {
      organizationId, // Filter by organization
      // Only show active locations unless explicitly requesting archived
      ...(!includeArchived && { active: true })
    }
    
    // For trainers, club managers, and PT managers, filter by accessible locations
    // Admins with all=true see all locations (for invitations)
    if (session.user.role === 'TRAINER' || session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
      // Get user's accessible locations (both old locationId and new UserLocation records)
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          locations: {
            select: { locationId: true }
          }
        }
      })
      
      // Collect all accessible location IDs from UserLocation table
      const accessibleLocationIds: string[] = []
      if (user?.locations) {
        accessibleLocationIds.push(...user.locations.map(l => l.locationId))
      }
      
      // Filter locations by accessible IDs
      if (accessibleLocationIds.length > 0) {
        whereClause.id = { in: accessibleLocationIds }
      } else {
        // If no locations accessible, return empty result
        whereClause.id = 'no-access' // This will return no results
      }
    }
    // Only ADMIN sees all locations in their organization (no additional filter)

    const locations = await prisma.location.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            userAccess: true,  // Count users through UserLocation junction table
            clients: true,
            sessions: {
              where: {
                sessionDate: {
                  gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // This month
                }
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Batch fetch all trainers for all locations in ONE query (fixes N+1)
    const locationIds = locations.map(l => l.id)
    const allTrainers = await prisma.user.findMany({
      where: {
        locations: {
          some: {
            locationId: { in: locationIds }
          }
        },
        role: 'TRAINER',
        active: true,
        organizationId
      },
      select: {
        id: true,
        name: true,
        email: true,
        locations: {
          where: { locationId: { in: locationIds } },
          select: { locationId: true }
        }
      }
    })

    // Group trainers by location
    const trainersByLocation = new Map<string, typeof allTrainers>()
    for (const trainer of allTrainers) {
      for (const loc of trainer.locations) {
        const existing = trainersByLocation.get(loc.locationId) || []
        existing.push(trainer)
        trainersByLocation.set(loc.locationId, existing)
      }
    }

    // Build response with trainer details
    const locationsWithDetails = locations.map((location) => {
      const trainers = trainersByLocation.get(location.id) || []
      // Remove the locations field from trainer objects in response
      const cleanTrainers = trainers.map(({ locations: _, ...rest }) => rest)

      return {
        ...location,
        trainers: cleanTrainers,
        trainerCount: cleanTrainers.length,
        clientCount: location._count.clients,
        sessionsThisMonth: location._count.sessions
      }
    })

    return NextResponse.json({ locations: locationsWithDetails })
  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins and PT managers can create locations
  if (session.user.role !== 'ADMIN' && session.user.role !== 'PT_MANAGER') {
    return NextResponse.json(
      { error: 'Only administrators can create locations' },
      { status: 403 }
    )
  }

  try {
    // Get organization context
    const orgId = await getOrganizationId()
    
    // Check usage limits for location creation
    const canAdd = await canAddLocation(orgId)
    if (!canAdd.allowed) {
      return NextResponse.json(
        { 
          error: canAdd.reason,
          needsUpgrade: true,
          usage: canAdd.usage 
        },
        { status: 403 }
      )
    }
    const body = await request.json()
    const { name } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      )
    }

    // Get organization context
    const organizationId = await getOrganizationId()
    
    // Check if location with same name exists in this organization
    const existing = await prisma.location.findFirst({
      where: { 
        name: name.trim(),
        organizationId
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A location with this name already exists' },
        { status: 400 }
      )
    }

    const location = await prisma.location.create({
      data: {
        name: name.trim(),
        active: true,
        organizationId // Set organization for new location
      }
    })

    // TODO: Add audit log

    return NextResponse.json(location, { status: 201 })
  } catch (error) {
    console.error('Error creating location:', error)
    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 }
    )
  }
}