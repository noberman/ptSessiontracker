import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate demo data for the current user's context
    const demoData = {
      client: {
        id: 'demo-client-1',
        name: 'Alex Johnson (Demo)',
        email: 'alex.demo@example.com',
        isDemo: true
      },
      packages: [
        { 
          id: 'demo-package-1',
          name: '10 Session Package',
          totalSessions: 10,
          remainingSessions: 9,
          price: 500
        },
        { 
          id: 'demo-package-2',
          name: '20 Session Package',
          totalSessions: 20,
          remainingSessions: 20,
          price: 900
        }
      ],
      package: {
        id: 'demo-package-1',
        name: '10 Session Package',
        totalSessions: 10,
        remainingSessions: 9,
        price: 500
      },
      session: {
        date: new Date().toISOString(),
        duration: 60,
        type: 'PERSONAL',
        value: 50,
        commission: 25
      }
    }

    return NextResponse.json(demoData)
  } catch (error) {
    console.error('Error generating demo data:', error)
    return NextResponse.json(
      { error: 'Failed to generate demo data' },
      { status: 500 }
    )
  }
}