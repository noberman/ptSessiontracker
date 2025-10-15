import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins and PT managers can access trainer summaries
  if (!['ADMIN', 'PT_MANAGER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'month'
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  try {
    // Calculate date range based on period
    let dateFrom: Date
    let dateTo: Date = new Date()
    
    if (period === 'custom' && startDate && endDate) {
      dateFrom = new Date(startDate)
      dateTo = new Date(endDate)
    } else if (period === 'last_month') {
      const now = new Date()
      dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      dateTo = new Date(now.getFullYear(), now.getMonth(), 0) // Last day of previous month
    } else if (period === 'quarter') {
      const now = new Date()
      const currentQuarter = Math.floor(now.getMonth() / 3)
      dateFrom = new Date(now.getFullYear(), currentQuarter * 3, 1)
      dateTo = now
    } else { // month (default)
      dateFrom = new Date()
      dateFrom.setDate(1)
      dateFrom.setHours(0, 0, 0, 0)
    }

    // Get all trainers
    const trainers = await prisma.user.findMany({
      where: {
        role: 'TRAINER',
        active: true
      },
      include: {
        locations: {
          include: {
            location: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Get session data for each trainer
    const summaries = await Promise.all(trainers.map(async (trainer) => {
      const [sessionData, validatedCount] = await Promise.all([
        prisma.session.aggregate({
          where: {
            trainerId: trainer.id,
            sessionDate: {
              gte: dateFrom,
              lte: dateTo
            }
          },
          _count: { id: true },
          _sum: { sessionValue: true }
        }),
        prisma.session.count({
          where: {
            trainerId: trainer.id,
            sessionDate: {
              gte: dateFrom,
              lte: dateTo
            },
            validated: true
          }
        })
      ])

      const sessionCount = sessionData._count.id || 0
      const totalValue = sessionData._sum.sessionValue || 0
      const validationRate = sessionCount > 0 
        ? Math.round((validatedCount / sessionCount) * 100)
        : 0

      return {
        trainer: {
          id: trainer.id,
          name: trainer.name,
          email: trainer.email,
          locations: trainer.locations.map(l => l.location.name),
          location: trainer.locations.length > 0 ? trainer.locations[0].location.name : null // Backward compatibility
        },
        period: `${dateFrom.toLocaleDateString()} - ${dateTo.toLocaleDateString()}`,
        sessionCount,
        totalValue,
        validatedCount,
        validationRate
      }
    }))

    // Filter out trainers with no sessions if needed
    const filteredSummaries = summaries.filter(s => s.sessionCount > 0)

    return NextResponse.json({
      summaries: filteredSummaries,
      period: {
        from: dateFrom,
        to: dateTo
      }
    })
  } catch (error) {
    console.error('Error fetching trainer summaries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trainer summaries' },
      { status: 500 }
    )
  }
}