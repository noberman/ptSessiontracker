import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'month' // month, week, day, custom
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const filterTrainerIds = searchParams.get('trainerIds')?.split(',').filter(Boolean)
  const filterLocationId = searchParams.get('locationId')

  try {
    // Calculate date range based on period
    let dateFrom: Date
    let dateTo: Date = new Date()
    
    if (period === 'custom' && startDate && endDate) {
      dateFrom = new Date(startDate)
      dateTo = new Date(endDate)
    } else if (period === 'day') {
      dateFrom = new Date()
      dateFrom.setHours(0, 0, 0, 0)
      
      // Set dateTo to end of today
      dateTo = new Date()
      dateTo.setHours(23, 59, 59, 999)
    } else if (period === 'week') {
      dateFrom = new Date()
      dateFrom.setDate(dateFrom.getDate() - 7)
      dateFrom.setHours(0, 0, 0, 0)
      
      // Set dateTo to end of today
      dateTo = new Date()
      dateTo.setHours(23, 59, 59, 999)
    } else if (period === 'lastMonth') {
      // Last month - from first day to last day of previous month
      dateFrom = new Date()
      dateFrom.setMonth(dateFrom.getMonth() - 1)
      dateFrom.setDate(1)
      dateFrom.setHours(0, 0, 0, 0)
      
      dateTo = new Date()
      dateTo.setDate(0) // Sets to last day of previous month
      dateTo.setHours(23, 59, 59, 999)
    } else { // month (default - shows entire current month)
      dateFrom = new Date()
      dateFrom.setDate(1)
      dateFrom.setHours(0, 0, 0, 0)
      
      // Set dateTo to the last day of current month at 23:59:59
      dateTo = new Date(dateFrom.getFullYear(), dateFrom.getMonth() + 1, 0)
      dateTo.setHours(23, 59, 59, 999)
    }

    // Build where clause based on user role
    // eslint-disable-next-line prefer-const
    let sessionsWhere: any = {
      sessionDate: {
        gte: dateFrom,
        lte: dateTo
      }
    }

    // eslint-disable-next-line prefer-const
    let clientsWhere: any = { active: true }
    // eslint-disable-next-line prefer-const
    let trainersWhere: any = { role: 'TRAINER', active: true }

    // Role-specific filtering
    if (session.user.role === 'TRAINER') {
      // Trainer sees only their own data
      sessionsWhere.trainerId = session.user.id
      clientsWhere.primaryTrainerId = session.user.id
      
      // Get trainer's own stats
      const [
        totalSessions,
        validatedSessions,
        pendingValidations,
        totalSessionValue,
        myClients,
        todaysSessions,
        recentSessions
      ] = await Promise.all([
        // Total sessions this period
        prisma.session.count({ where: sessionsWhere }),
        
        // Validated sessions
        prisma.session.count({ 
          where: { ...sessionsWhere, validated: true } 
        }),
        
        // Pending validations
        prisma.session.count({ 
          where: { 
            ...sessionsWhere, 
            validated: false,
            validationExpiry: { gte: new Date() }
          } 
        }),
        
        // Total session value
        prisma.session.aggregate({
          where: sessionsWhere,
          _sum: { sessionValue: true }
        }),
        
        // My clients
        prisma.client.findMany({
          where: clientsWhere,
          select: {
            id: true,
            name: true,
            email: true,
            packages: {
              where: { active: true },
              select: {
                id: true,
                name: true,
                remainingSessions: true,
                totalSessions: true
              }
            }
          },
          orderBy: { name: 'asc' }
        }),
        
        // Today's sessions
        prisma.session.findMany({
          where: {
            trainerId: session.user.id,
            sessionDate: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lte: new Date(new Date().setHours(23, 59, 59, 999))
            }
          },
          include: {
            client: {
              select: {
                name: true,
                email: true
              }
            },
            package: {
              select: {
                name: true
              }
            }
          },
          orderBy: { sessionDate: 'desc' }
        }),
        
        // Recent sessions with pending validation
        prisma.session.findMany({
          where: {
            trainerId: session.user.id,
            validated: false,
            validationExpiry: { gte: new Date() }
          },
          include: {
            client: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: { sessionDate: 'desc' },
          take: 5
        })
      ])

      const validationRate = totalSessions > 0 
        ? Math.round((validatedSessions / totalSessions) * 100)
        : 0

      return NextResponse.json({
        stats: {
          totalSessions,
          validatedSessions,
          pendingValidations,
          totalSessionValue: totalSessionValue._sum.sessionValue || 0,
          validationRate,
          period: {
            from: dateFrom,
            to: dateTo
          }
        },
        todaysSessions,
        myClients,
        pendingValidationSessions: recentSessions,
        userRole: session.user.role
      })
      
    } else if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
      // Club manager sees their location's data
      sessionsWhere.locationId = session.user.locationId
      clientsWhere.locationId = session.user.locationId
      trainersWhere.locationId = session.user.locationId
      
    } else if (session.user.role === 'PT_MANAGER') {
      // PT Manager sees all locations (no filter needed)
      // But can filter by location if specified
      if (filterLocationId) {
        sessionsWhere.locationId = filterLocationId
        clientsWhere.locationId = filterLocationId
        trainersWhere.locationId = filterLocationId
      }
    }
    // Admin sees everything (no additional filters)
    // But can filter by location if specified
    if (session.user.role === 'ADMIN' && filterLocationId) {
      sessionsWhere.locationId = filterLocationId
      clientsWhere.locationId = filterLocationId
      trainersWhere.locationId = filterLocationId
    }
    
    // Apply trainer filter if specified (for all manager/admin roles)
    if (filterTrainerIds && filterTrainerIds.length > 0 && session.user.role !== 'TRAINER') {
      sessionsWhere.trainerId = { in: filterTrainerIds }
      // Note: This filter only affects session data, not the list of trainers shown
    }

    // For managers and admins, get aggregate data
    if (session.user.role !== 'TRAINER') {
      const [
        totalSessions,
        validatedSessions,
        totalSessionValue,
        trainerStats,
        dailyStats,
        activeTrainers,
        activeClients,
        unassignedClients,
        lowValidationTrainers,
        peakActivityHours
      ] = await Promise.all([
        // Total sessions
        prisma.session.count({ where: sessionsWhere }),
        
        // Validated sessions
        prisma.session.count({ 
          where: { ...sessionsWhere, validated: true } 
        }),
        
        // Total session value
        prisma.session.aggregate({
          where: sessionsWhere,
          _sum: { sessionValue: true }
        }),
        
        // Stats by trainer (already filtered by sessionsWhere which includes trainer filter)
        prisma.session.groupBy({
          by: ['trainerId'],
          where: sessionsWhere,
          _count: { id: true },
          _sum: { sessionValue: true }
        }),
        
        // Daily stats for chart (including trainer breakdown)
        prisma.session.findMany({
          where: sessionsWhere,
          select: {
            sessionDate: true,
            sessionValue: true,
            validated: true,
            trainerId: true
          }
        }).then(sessions => {
          // Create a map for ALL days in the range
          const dailyMap = new Map<string, { count: number, value: number, validated_count: number, trainerSessions?: Map<string, number> }>()
          
          // Initialize all days in the range with zeros
          const currentDate = new Date(dateFrom)
          while (currentDate <= dateTo) {
            const dateKey = currentDate.toISOString().split('T')[0]
            dailyMap.set(dateKey, { 
              count: 0, 
              value: 0, 
              validated_count: 0, 
              trainerSessions: new Map() 
            })
            currentDate.setDate(currentDate.getDate() + 1)
          }
          
          // Now populate with actual session data
          sessions.forEach(session => {
            const dateKey = session.sessionDate.toISOString().split('T')[0]
            const existing = dailyMap.get(dateKey) || { count: 0, value: 0, validated_count: 0, trainerSessions: new Map() }
            
            // Track sessions by trainer for this date
            const trainerSessions = existing.trainerSessions || new Map()
            const currentTrainerCount = trainerSessions.get(session.trainerId) || 0
            trainerSessions.set(session.trainerId, currentTrainerCount + 1)
            
            dailyMap.set(dateKey, {
              count: existing.count + 1,
              value: existing.value + (session.sessionValue || 0),
              validated_count: existing.validated_count + (session.validated ? 1 : 0),
              trainerSessions
            })
          })
          
          // Convert to array and sort
          return Array.from(dailyMap.entries())
            .map(([date, stats]) => ({ 
              date, 
              count: stats.count,
              value: stats.value,
              validated_count: stats.validated_count,
              trainerSessions: stats.trainerSessions ? Array.from(stats.trainerSessions.entries()).map(([trainerId, count]) => ({ trainerId, count })) : []
            }))
            .sort((a, b) => b.date.localeCompare(a.date))
        }),
        
        // Active trainers (if filtering by specific trainers, count only those)
        filterTrainerIds && filterTrainerIds.length > 0 
          ? filterTrainerIds.length
          : prisma.user.count({ where: trainersWhere }),
        
        // Active clients
        prisma.client.count({ where: clientsWhere }),
        
        // Unassigned clients
        prisma.client.count({ 
          where: { 
            ...clientsWhere,
            primaryTrainerId: null 
          } 
        }),
        
        // Low validation trainers (< 70% validation rate)
        prisma.session.groupBy({
          by: ['trainerId'],
          where: sessionsWhere,
          _count: { id: true }
        }).then(async (trainerSessions) => {
          const lowValidation = []
          for (const trainer of trainerSessions) {
            const validatedCount = await prisma.session.count({
              where: {
                ...sessionsWhere,
                trainerId: trainer.trainerId,
                validated: true
              }
            })
            const validationRate = (validatedCount / trainer._count.id) * 100
            if (validationRate < 70) {
              const trainerInfo = await prisma.user.findUnique({
                where: { id: trainer.trainerId },
                select: { name: true, email: true }
              })
              lowValidation.push({
                ...trainerInfo,
                validationRate: Math.round(validationRate),
                totalSessions: trainer._count.id,
                validatedSessions: validatedCount
              })
            }
          }
          return lowValidation
        }),
        
        // Peak activity hours
        prisma.session.findMany({
          where: sessionsWhere,
          select: { sessionDate: true }
        }).then(sessions => {
          const hourCounts = new Array(24).fill(0)
          sessions.forEach(session => {
            const hour = new Date(session.sessionDate).getHours()
            hourCounts[hour]++
          })
          return hourCounts.map((count, hour) => ({ hour, count }))
        })
      ])

      // Get ALL trainers (not just those with sessions) with their locations
      const allTrainers = await prisma.user.findMany({
        where: trainersWhere,
        select: {
          id: true,
          name: true,
          email: true,
          locationId: true
        },
        orderBy: { name: 'asc' }
      })
      
      // Get all locations for PT Managers and Admins
      let allLocations = null
      if (session.user.role === 'PT_MANAGER' || session.user.role === 'ADMIN') {
        allLocations = await prisma.location.findMany({
          select: {
            id: true,
            name: true
          },
          orderBy: { name: 'asc' }
        })
      }
      
      // Get trainer details for those with sessions
      // const trainerIds = [...new Set(trainerStats.map(stat => stat.trainerId))]

      // Combine trainer stats with trainer info (including locationId)
      const trainerStatsWithInfo = trainerStats.map(stat => {
        const trainer = allTrainers.find(t => t.id === stat.trainerId)
        return {
          trainer: trainer ? {
            id: trainer.id,
            name: trainer.name,
            email: trainer.email,
            locationId: trainer.locationId
          } : null,
          sessionCount: stat._count.id,
          totalValue: stat._sum.sessionValue || 0
        }
      }).sort((a, b) => b.totalValue - a.totalValue)

      const validationRate = totalSessions > 0 
        ? Math.round((validatedSessions / totalSessions) * 100)
        : 0
      
      // Calculate average sessions per day/week
      const daysDiff = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24))
      const weeksDiff = Math.ceil(daysDiff / 7)
      const averagePerDay = daysDiff > 0 ? (totalSessions / daysDiff).toFixed(1) : '0'
      const averagePerWeek = weeksDiff > 0 ? (totalSessions / weeksDiff).toFixed(1) : '0'

      return NextResponse.json({
        stats: {
          totalSessions,
          validatedSessions,
          totalSessionValue: totalSessionValue._sum.sessionValue || 0,
          validationRate,
          activeTrainers,
          activeClients,
          unassignedClients,
          averagePerDay,
          averagePerWeek,
          period: {
            from: dateFrom,
            to: dateTo
          }
        },
        trainerStats: trainerStatsWithInfo,
        allTrainers, // Include all trainers for filtering
        allLocations, // Include all locations for filtering (PT_MANAGER and ADMIN only)
        dailyStats,
        lowValidationTrainers,
        peakActivityHours,
        userRole: session.user.role
      })
    }
    
    // Default return (should not reach here)
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}