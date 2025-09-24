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

    const packageTypes = await prisma.packageTemplate.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { createdAt: 'desc' }
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

    const packageType = await prisma.packageTemplate.create({
      data: {
        organizationId: session.user.organizationId,
        name,
        defaultSessions: Number(defaultSessions),
        defaultPrice: Number(defaultPrice),
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