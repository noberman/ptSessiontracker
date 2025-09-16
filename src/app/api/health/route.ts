import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET() {
  try {
    // Test database connection
    const userCount = await prisma.user.count()
    const sessionCount = await prisma.session.count()
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      counts: {
        users: userCount,
        sessions: sessionCount
      },
      environment: process.env.NODE_ENV,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      nextAuthUrl: process.env.NEXTAUTH_URL || 'not set'
    })
  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({
      status: 'unhealthy',
      database: 'disconnected',
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}