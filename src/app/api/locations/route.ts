import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrganizationId } from '@/lib/organization-context'
import { canAddLocation } from '@/lib/usage-limits'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get organization context
    const organizationId = await getOrganizationId()
    
    // Build query based on user role
    const whereClause: any = {
      organizationId // Filter by organization
    }
    
    // Club managers can only see their location
    if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
      whereClause.id = session.user.locationId
    }
    
    // Trainers can only see their assigned location
    if (session.user.role === 'TRAINER' && session.user.locationId) {
      whereClause.id = session.user.locationId
    }

    const locations = await prisma.location.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            users: true,
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

    // Get trainer details for each location
    const locationsWithDetails = await Promise.all(
      locations.map(async (location) => {
        const trainers = await prisma.user.findMany({
          where: {
            locationId: location.id,
            role: 'TRAINER',
            active: true,
            organizationId // Filter trainers by org
          },
          select: {
            id: true,
            name: true,
            email: true
          }
        })

        return {
          ...location,
          trainers,
          trainerCount: location._count.users,
          clientCount: location._count.clients,
          sessionsThisMonth: location._count.sessions
        }
      })
    )

    return NextResponse.json(locationsWithDetails)
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