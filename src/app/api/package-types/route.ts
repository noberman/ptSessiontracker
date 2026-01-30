import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse URL to get query parameters
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    console.log('📦 Package Types API - Fetching for org:', {
      organizationId: session.user.organizationId,
      userId: session.user.id,
      userEmail: session.user.email,
      includeInactive
    })

    const packageTypes = await prisma.packageType.findMany({
      where: { 
        organizationId: session.user.organizationId,
        ...(includeInactive ? {} : { isActive: true })
      },
      orderBy: { sortOrder: 'asc' }
    })

    console.log('📦 Package Types API - Found:', {
      count: packageTypes.length,
      types: packageTypes.map(pt => ({ 
        id: pt.id, 
        name: pt.name,
        orgId: pt.organizationId 
      }))
    })

    return NextResponse.json(packageTypes)
  } catch (error) {
    console.error('Error fetching package types:', error)
    return NextResponse.json(
      { error: 'Failed to fetch package types' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, defaultSessions, defaultPrice } = await request.json()

    // Validate input
    if (!name || !defaultSessions || defaultPrice === undefined) {
      return NextResponse.json(
        { error: 'Name, sessions, and price are required' },
        { status: 400 }
      )
    }

    // Check if a package type with this name already exists
    const existing = await prisma.packageType.findFirst({
      where: {
        organizationId: session.user.organizationId,
        name: { equals: name, mode: 'insensitive' },
      },
      select: { id: true, isActive: true },
    })

    if (existing) {
      if (!existing.isActive) {
        return NextResponse.json(
          { error: `A package type named "${name}" already exists in your archived types. You can reactivate it from the Archived tab in Package Types settings.` },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'A package type with this name already exists' },
        { status: 409 }
      )
    }

    // Get the highest sortOrder for this organization
    const maxSortOrder = await prisma.packageType.findFirst({
      where: { organizationId: session.user.organizationId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true }
    })

    const packageType = await prisma.packageType.create({
      data: {
        organizationId: session.user.organizationId,
        name,
        defaultSessions: Number(defaultSessions),
        defaultPrice: Number(defaultPrice),
        sortOrder: (maxSortOrder?.sortOrder ?? -1) + 1
      }
    })

    return NextResponse.json(packageType)
  } catch (error) {
    console.error('Error creating package type:', error)
    return NextResponse.json(
      { error: 'Failed to create package type' },
      { status: 500 }
    )
  }
}