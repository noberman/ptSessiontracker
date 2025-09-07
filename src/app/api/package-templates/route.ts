import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const templates = await prisma.packageTemplate.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Failed to fetch package templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch package templates' },
      { status: 500 }
    )
  }
}

// Create a new package template (admin only)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only admins can create package templates' },
      { status: 403 }
    )
  }

  try {
    const data = await request.json()
    
    // Validate required fields
    if (!data.name || !data.displayName || !data.category || 
        !data.sessions || !data.price) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate session value
    const sessionValue = data.price / data.sessions

    const template = await prisma.packageTemplate.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        category: data.category,
        sessions: data.sessions,
        price: data.price,
        sessionValue: sessionValue,
        sortOrder: data.sortOrder || 0,
        active: data.active !== false
      }
    })

    return NextResponse.json(template)
  } catch (error: any) {
    console.error('Failed to create package template:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A template with this name already exists' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create package template' },
      { status: 500 }
    )
  }
}