import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrganizationId } from '@/lib/organization-context'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import {
  getActivePackageWhereClause,
  getExpiringSoonPackageWhereClause,
  getAtRiskPackageWhereClause,
  CLIENT_METRICS_CONFIG
} from '@/lib/package-status'

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
    // Get organization context and timezone
    const organizationId = await getOrganizationId()
    
    // Get organization timezone
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { timezone: true }
    })
    const orgTimezone = org?.timezone || 'Asia/Singapore'
    
    // Calculate date range based on period IN THE ORGANIZATION'S TIMEZONE
    let dateFrom: Date
    let dateTo: Date
    
    if (period === 'custom' && startDate && endDate) {
      // Custom dates are already in the right timezone from the frontend
      dateFrom = new Date(startDate)
      dateTo = new Date(endDate)
    } else if (period === 'day') {
      // Today in org's timezone
      const now = new Date()
      dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      
      // Convert from org timezone to UTC for database query
      dateFrom = fromZonedTime(dateFrom, orgTimezone)
      dateTo = fromZonedTime(dateTo, orgTimezone)
    } else if (period === 'week') {
      // Last 7 days in org's timezone
      const now = new Date()
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      dateFrom = new Date(weekAgo.getFullYear(), weekAgo.getMonth(), weekAgo.getDate(), 0, 0, 0)
      dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      
      // Convert from org timezone to UTC for database query
      dateFrom = fromZonedTime(dateFrom, orgTimezone)
      dateTo = fromZonedTime(dateTo, orgTimezone)
    } else if (period === 'lastMonth') {
      // Last month boundaries in org's timezone
      const now = new Date()
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
      const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
      
      dateFrom = new Date(year, lastMonth, 1, 0, 0, 0)
      const lastDay = new Date(year, lastMonth + 1, 0).getDate()
      dateTo = new Date(year, lastMonth, lastDay, 23, 59, 59, 999)
      
      // Convert from org timezone to UTC for database query
      dateFrom = fromZonedTime(dateFrom, orgTimezone)
      dateTo = fromZonedTime(dateTo, orgTimezone)
    } else { // month (default - shows entire current month)
      // Current month boundaries in org's timezone
      const now = new Date()
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      dateTo = new Date(now.getFullYear(), now.getMonth(), lastDay, 23, 59, 59, 999)
      
      // Convert from org timezone to UTC for database query
      dateFrom = fromZonedTime(dateFrom, orgTimezone)
      dateTo = fromZonedTime(dateTo, orgTimezone)
    }
    
    // Build where clause based on user role
    // eslint-disable-next-line prefer-const
    let sessionsWhere: any = {
      sessionDate: {
        gte: dateFrom,
        lte: dateTo
      },
      trainer: {
        organizationId // Filter sessions by organization
      }
    }

    // eslint-disable-next-line prefer-const
    let clientsWhere: any = { 
      active: true,
      organizationId // Direct filter by organization (includes unassigned clients)
    }
    // eslint-disable-next-line prefer-const
    let trainersWhere: any = { 
      role: { in: ['TRAINER', 'PT_MANAGER'] }, // Include PT_MANAGER since they can also log sessions
      active: true,
      organizationId // Filter trainers by organization
    }

    // Role-specific filtering
    if (session.user.role === 'TRAINER') {
      // Trainer sees only their own sessions
      sessionsWhere.trainerId = session.user.id
      sessionsWhere.trainer = { 
        id: session.user.id,
        organizationId 
      }
      
      // For "My Clients" card - show only clients where trainer is primary trainer
      clientsWhere.primaryTrainerId = session.user.id
      
      // Get trainer's own stats
      const [
        totalSessions,
        validatedSessions,
        pendingValidations,
        totalSessionValue,
        myClients,
        todaysSessions,
        recentSessions,
        // Client metrics
        totalClients,
        activeClients,
        notStartedClients,
        atRiskClients
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

        // Today's sessions in org timezone
        prisma.session.findMany({
          where: {
            trainerId: session.user.id,
            sessionDate: {
              gte: fromZonedTime(new Date(new Date().setHours(0, 0, 0, 0)), orgTimezone),
              lte: fromZonedTime(new Date(new Date().setHours(23, 59, 59, 999)), orgTimezone)
            }
          },
          select: {
            id: true,
            sessionDate: true,
            validated: true,
            createdAt: true,  // Add createdAt for correct time display
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
        }),

        // Total clients assigned to this trainer
        prisma.client.count({ where: clientsWhere }),

        // Active clients (have active package)
        prisma.client.count({
          where: {
            ...clientsWhere,
            packages: { some: getActivePackageWhereClause() }
          }
        }),

        // Not Started clients (have active package but no sessions against it)
        prisma.client.findMany({
          where: {
            ...clientsWhere,
            packages: { some: getActivePackageWhereClause() },
            NOT: {
              sessions: {
                some: { package: getActivePackageWhereClause() }
              }
            }
          },
          select: {
            id: true,
            name: true,
            email: true,
            packages: {
              where: getActivePackageWhereClause(),
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                name: true,
                remainingSessions: true,
                totalSessions: true,
                expiresAt: true,
                createdAt: true
              }
            }
          },
          orderBy: { name: 'asc' }
        }),

        // At Risk clients (expiring soon OR low sessions, but only if they have exactly 1 active package)
        // We fetch clients with at-risk packages and their active packages, then filter in code
        prisma.client.findMany({
          where: {
            ...clientsWhere,
            packages: {
              some: getAtRiskPackageWhereClause()
            }
          },
          select: {
            id: true,
            name: true,
            email: true,
            packages: {
              where: getActivePackageWhereClause(),
              orderBy: { expiresAt: 'asc' },
              select: {
                id: true,
                name: true,
                remainingSessions: true,
                totalSessions: true,
                expiresAt: true
              }
            }
          },
          orderBy: { name: 'asc' }
        })
      ])

      const validationRate = totalSessions > 0
        ? Math.round((validatedSessions / totalSessions) * 100)
        : 0

      // Filter at-risk clients to only those with exactly 1 active package
      // (if they have 2+ active packages, they've already renewed)
      const filteredAtRiskClients = atRiskClients
        .filter(client => client.packages.length === 1)
        .map(client => ({
          ...client,
          packages: client.packages // Keep only the at-risk package info
        }))

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
          },
          // Client metrics for trainer
          clientMetrics: {
            total: totalClients,
            active: activeClients,
            notStarted: notStartedClients.length,
            atRisk: filteredAtRiskClients.length
          }
        },
        todaysSessions,
        myClients,
        pendingValidationSessions: recentSessions,
        // Clients needing attention
        clientsNeedingAttention: {
          notStarted: notStartedClients,
          atRisk: filteredAtRiskClients
        },
        userRole: session.user.role
      })
      
    } else if (session.user.role === 'CLUB_MANAGER' || session.user.role === 'PT_MANAGER') {
      // Club managers and PT Managers see data from their accessible locations
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
      
      if (accessibleLocationIds.length > 0) {
        // If filter is specified, use it only if it's in the accessible locations
        if (filterLocationId && accessibleLocationIds.includes(filterLocationId)) {
          sessionsWhere.locationId = filterLocationId
          clientsWhere.locationId = filterLocationId
          trainersWhere.locations = { some: { locationId: filterLocationId } }
        } else {
          // Otherwise show all accessible locations
          sessionsWhere.locationId = { in: accessibleLocationIds }
          clientsWhere.locationId = { in: accessibleLocationIds }
          trainersWhere.locations = { some: { locationId: { in: accessibleLocationIds } } }
        }
      } else {
        // No locations accessible - show nothing
        sessionsWhere.id = 'no-access'
        clientsWhere.id = 'no-access'
        trainersWhere.id = 'no-access'
      }
    }
    // Admin sees everything (no additional filters)
    // But can filter by location if specified
    if (session.user.role === 'ADMIN' && filterLocationId) {
      sessionsWhere.locationId = filterLocationId
      clientsWhere.locationId = filterLocationId
      trainersWhere.locations = { some: { locationId: filterLocationId } }
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
        totalPackageSales,
        trainerStats,
        dailyStats,
        activeTrainers,
        // Client metrics - snapshots
        totalClients,
        activeClientsWithPackages,
        notStartedClients,
        atRiskClients,
        lostClients,
        unassignedClients,
        // Other metrics
        lowValidationTrainers,
        peakActivityHours
      ] = await Promise.all([
        // Total sessions
        prisma.session.count({ where: sessionsWhere }),
        
        // Validated sessions
        prisma.session.count({
          where: { ...sessionsWhere, validated: true }
        }),

        // Total package sales (packages created in this period)
        prisma.package.aggregate({
          where: {
            organizationId,
            createdAt: { gte: dateFrom, lte: dateTo },
            ...(clientsWhere.locationId
              ? { client: { locationId: typeof clientsWhere.locationId === 'string' ? clientsWhere.locationId : clientsWhere.locationId } }
              : {})
          },
          _sum: { totalValue: true }
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

        // =====================================================================
        // CLIENT METRICS - SNAPSHOTS (Current State)
        // =====================================================================

        // Total clients (all client profiles)
        prisma.client.count({ where: clientsWhere }),

        // Active clients (have at least one active package)
        prisma.client.count({
          where: {
            ...clientsWhere,
            packages: {
              some: getActivePackageWhereClause()
            }
          }
        }),

        // Not Started clients (have active package but no sessions against any active package)
        prisma.client.count({
          where: {
            ...clientsWhere,
            // Has at least one active package
            packages: {
              some: getActivePackageWhereClause()
            },
            // But no sessions exist against any of their active packages
            NOT: {
              sessions: {
                some: {
                  package: getActivePackageWhereClause()
                }
              }
            }
          }
        }),

        // At-Risk clients (expiring soon OR low sessions, only if they have exactly 1 active package)
        // Fetch clients and filter in code since Prisma can't easily express "exactly 1 active package"
        prisma.client.findMany({
          where: {
            ...clientsWhere,
            packages: {
              some: getAtRiskPackageWhereClause()
            }
          },
          select: {
            id: true,
            packages: {
              where: getActivePackageWhereClause(),
              select: { id: true }
            }
          }
        }),

        // Lost clients (had packages before but none are currently active)
        prisma.client.count({
          where: {
            ...clientsWhere,
            // Has had at least one package
            packages: {
              some: {}
            },
            // But none are currently active
            NOT: {
              packages: {
                some: getActivePackageWhereClause()
              }
            }
          }
        }),

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
        
        // Peak activity hours (converted to org timezone)
        prisma.session.findMany({
          where: sessionsWhere,
          select: { sessionDate: true }
        }).then(sessions => {
          const hourCounts = new Array(24).fill(0)
          sessions.forEach(session => {
            // Convert UTC date to org timezone before extracting hour
            const localDate = toZonedTime(new Date(session.sessionDate), orgTimezone)
            const hour = localDate.getHours()
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
          locations: {
            select: {
              locationId: true
            }
          }
        },
        orderBy: { name: 'asc' }
      })
      
      // Get all locations for PT Managers and Admins
      let allLocations = null
      if (session.user.role === 'PT_MANAGER' || session.user.role === 'ADMIN') {
        allLocations = await prisma.location.findMany({
          where: { active: true, organizationId },
          select: {
            id: true,
            name: true
          },
          orderBy: { name: 'asc' }
        })
      }
      
      // Get trainer details for those with sessions
      // const trainerIds = [...new Set(trainerStats.map(stat => stat.trainerId))]

      // Combine trainer stats with trainer info (including locations)
      const trainerStatsWithInfo = trainerStats.map(stat => {
        const trainer = allTrainers.find(t => t.id === stat.trainerId)
        return {
          trainer: trainer ? {
            id: trainer.id,
            name: trainer.name,
            email: trainer.email,
            locationIds: trainer.locations ? trainer.locations.map(l => l.locationId) : []
          } : null,
          sessionCount: stat._count.id,
          totalValue: stat._sum.sessionValue || 0
        }
      }).sort((a, b) => b.totalValue - a.totalValue)

      const validationRate = totalSessions > 0
        ? Math.round((validatedSessions / totalSessions) * 100)
        : 0

      // Filter at-risk clients to only those with exactly 1 active package
      // (if they have 2+ active packages, they've already renewed)
      const filteredAtRiskCount = atRiskClients.filter(
        (client: { packages: { id: string }[] }) => client.packages.length === 1
      ).length

      // Calculate average sessions per day/week
      const daysDiff = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24))
      const weeksDiff = Math.ceil(daysDiff / 7)
      const averagePerDay = daysDiff > 0 ? (totalSessions / daysDiff).toFixed(1) : '0'
      const averagePerWeek = weeksDiff > 0 ? (totalSessions / weeksDiff).toFixed(1) : '0'

      // =====================================================================
      // CLIENT METRICS - PERIOD BASED (Within Time Filter)
      // =====================================================================

      // Build location filter for package queries
      const packageLocationFilter = clientsWhere.locationId
        ? { client: { locationId: clientsWhere.locationId } }
        : clientsWhere.locationId?.in
        ? { client: { locationId: { in: clientsWhere.locationId.in } } }
        : {}

      // Get packages created in the period for new/resold calculations
      const packagesInPeriod = await prisma.package.findMany({
        where: {
          organizationId,
          createdAt: { gte: dateFrom, lte: dateTo },
          ...packageLocationFilter
        },
        select: {
          id: true,
          clientId: true,
          createdAt: true
        }
      })

      // Calculate New Clients (purchased package in period with no prior sessions in 30 days)
      const newClientIds = new Set<string>()
      const resoldPackageCount = { count: 0 }

      for (const pkg of packagesInPeriod) {
        const lookbackDate = new Date(pkg.createdAt)
        lookbackDate.setDate(lookbackDate.getDate() - CLIENT_METRICS_CONFIG.NEW_CLIENT_LOOKBACK_DAYS)

        // Check for prior sessions
        const priorSession = await prisma.session.findFirst({
          where: {
            clientId: pkg.clientId,
            sessionDate: {
              gte: lookbackDate,
              lt: pkg.createdAt
            }
          }
        })

        // Check for other active packages at time of purchase (for resold)
        const hadActivePackageAtPurchase = await prisma.package.findFirst({
          where: {
            clientId: pkg.clientId,
            id: { not: pkg.id },
            remainingSessions: { gt: 0 },
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: pkg.createdAt } }
            ]
          }
        })

        if (!priorSession) {
          // No prior sessions = new client
          newClientIds.add(pkg.clientId)
        }

        if (hadActivePackageAtPurchase || priorSession) {
          // Had active package or recent session = resold
          resoldPackageCount.count++
        }
      }

      // Calculate Newly Lost Clients (became lost during this period)
      // Clients whose most recent package ended in this period and have no active package now
      const newlyLostClients = await prisma.client.count({
        where: {
          ...clientsWhere,
          // Has a package that ended in this period (completed or expired)
          packages: {
            some: {
              OR: [
                // Completed in period (remainingSessions went to 0)
                { remainingSessions: 0, updatedAt: { gte: dateFrom, lte: dateTo } },
                // Expired in period
                { expiresAt: { gte: dateFrom, lte: dateTo } }
              ]
            }
          },
          // And has no active package now
          NOT: {
            packages: {
              some: getActivePackageWhereClause()
            }
          }
        }
      })

      // =====================================================================
      // PER-TRAINER CLIENT HEALTH METRICS
      // =====================================================================

      // Get all trainers who have clients assigned (regardless of their role)
      const trainersWithClients = await prisma.user.findMany({
        where: {
          organizationId,
          id: {
            in: await prisma.client.findMany({
              where: { ...clientsWhere, primaryTrainerId: { not: null } },
              select: { primaryTrainerId: true },
              distinct: ['primaryTrainerId']
            }).then(clients => clients.map(c => c.primaryTrainerId!).filter(Boolean))
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          locations: {
            select: { locationId: true }
          }
        },
        orderBy: { name: 'asc' }
      })

      // Calculate client health metrics for each trainer with clients
      const trainerClientHealth = await Promise.all(
        trainersWithClients.map(async (trainer) => {
          const trainerClientsWhere = {
            ...clientsWhere,
            primaryTrainerId: trainer.id
          }

          // Snapshot metrics
          const [total, active, notStarted, atRiskClientsRaw] = await Promise.all([
            // Total clients assigned to this trainer
            prisma.client.count({ where: trainerClientsWhere }),

            // Active clients (have at least one active package)
            prisma.client.count({
              where: {
                ...trainerClientsWhere,
                packages: { some: getActivePackageWhereClause() }
              }
            }),

            // Not Started (have active package but no sessions against it)
            prisma.client.count({
              where: {
                ...trainerClientsWhere,
                packages: { some: getActivePackageWhereClause() },
                NOT: {
                  sessions: {
                    some: { package: getActivePackageWhereClause() }
                  }
                }
              }
            }),

            // At Risk (expiring soon OR low sessions, only if they have exactly 1 active package)
            prisma.client.findMany({
              where: {
                ...trainerClientsWhere,
                packages: {
                  some: getAtRiskPackageWhereClause()
                }
              },
              select: {
                id: true,
                packages: {
                  where: getActivePackageWhereClause(),
                  select: { id: true }
                }
              }
            })
          ])

          // Filter at-risk to only clients with exactly 1 active package
          const atRisk = atRiskClientsRaw.filter(
            (client: { packages: { id: string }[] }) => client.packages.length === 1
          ).length

          // Period-based metrics for this trainer
          // Get packages created in the period for this trainer's clients
          const trainerPackagesInPeriod = await prisma.package.findMany({
            where: {
              organizationId,
              createdAt: { gte: dateFrom, lte: dateTo },
              client: { primaryTrainerId: trainer.id, ...clientsWhere }
            },
            select: {
              id: true,
              clientId: true,
              createdAt: true
            }
          })

          // Calculate new clients and resold for this trainer
          const trainerNewClientIds = new Set<string>()
          let trainerResoldCount = 0

          for (const pkg of trainerPackagesInPeriod) {
            const lookbackDate = new Date(pkg.createdAt)
            lookbackDate.setDate(lookbackDate.getDate() - CLIENT_METRICS_CONFIG.NEW_CLIENT_LOOKBACK_DAYS)

            const [priorSession, hadActivePackageAtPurchase] = await Promise.all([
              prisma.session.findFirst({
                where: {
                  clientId: pkg.clientId,
                  sessionDate: { gte: lookbackDate, lt: pkg.createdAt },
                  packageId: { not: pkg.id }
                }
              }),
              prisma.package.findFirst({
                where: {
                  clientId: pkg.clientId,
                  id: { not: pkg.id },
                  remainingSessions: { gt: 0 },
                  OR: [{ expiresAt: null }, { expiresAt: { gt: pkg.createdAt } }]
                }
              })
            ])

            if (!priorSession) {
              trainerNewClientIds.add(pkg.clientId)
            }
            if (hadActivePackageAtPurchase || priorSession) {
              trainerResoldCount++
            }
          }

          // Newly lost clients for this trainer (within period)
          const trainerNewlyLost = await prisma.client.count({
            where: {
              ...trainerClientsWhere,
              packages: {
                some: {
                  OR: [
                    { remainingSessions: 0, updatedAt: { gte: dateFrom, lte: dateTo } },
                    { expiresAt: { gte: dateFrom, lte: dateTo } }
                  ]
                }
              },
              NOT: { packages: { some: getActivePackageWhereClause() } }
            }
          })

          // Get trainer's location names for display
          const trainerLocations = allLocations
            ? trainer.locations
                .map(l => allLocations.find(loc => loc.id === l.locationId))
                .filter(Boolean)
                .map(loc => loc!.name)
            : []

          return {
            trainerId: trainer.id,
            trainerName: trainer.name,
            trainerEmail: trainer.email,
            locationNames: trainerLocations,
            total,
            active,
            notStarted,
            atRisk,
            // Period-based metrics
            newClients: trainerNewClientIds.size,
            resold: trainerResoldCount,
            newlyLost: trainerNewlyLost
          }
        })
      )

      // Filter out trainers with no clients and sort by total clients descending
      const trainerClientHealthFiltered = trainerClientHealth
        .filter(t => t.total > 0)
        .sort((a, b) => b.total - a.total)

      // Also calculate metrics for unassigned clients (no primaryTrainerId)
      const unassignedClientsWhere = {
        ...clientsWhere,
        primaryTrainerId: null
      }

      const [
        unassignedTotal,
        unassignedActive,
        unassignedNotStarted,
        unassignedAtRiskRaw
      ] = await Promise.all([
        prisma.client.count({ where: unassignedClientsWhere }),
        prisma.client.count({
          where: { ...unassignedClientsWhere, packages: { some: getActivePackageWhereClause() } }
        }),
        prisma.client.count({
          where: {
            ...unassignedClientsWhere,
            packages: { some: getActivePackageWhereClause() },
            NOT: { sessions: { some: { package: getActivePackageWhereClause() } } }
          }
        }),
        prisma.client.findMany({
          where: {
            ...unassignedClientsWhere,
            packages: { some: getAtRiskPackageWhereClause() }
          },
          select: {
            id: true,
            packages: {
              where: getActivePackageWhereClause(),
              select: { id: true }
            }
          }
        })
      ])

      // Filter at-risk to only clients with exactly 1 active package
      const unassignedAtRisk = unassignedAtRiskRaw.filter(
        (client: { packages: { id: string }[] }) => client.packages.length === 1
      ).length

      // Period-based metrics for unassigned clients
      const unassignedPackagesInPeriod = await prisma.package.findMany({
        where: {
          organizationId,
          createdAt: { gte: dateFrom, lte: dateTo },
          client: { primaryTrainerId: null, ...clientsWhere }
        },
        select: { id: true, clientId: true, createdAt: true }
      })

      const unassignedNewClientIds = new Set<string>()
      let unassignedResoldCount = 0

      for (const pkg of unassignedPackagesInPeriod) {
        const lookbackDate = new Date(pkg.createdAt)
        lookbackDate.setDate(lookbackDate.getDate() - CLIENT_METRICS_CONFIG.NEW_CLIENT_LOOKBACK_DAYS)

        const [priorSession, hadActivePackageAtPurchase] = await Promise.all([
          prisma.session.findFirst({
            where: { clientId: pkg.clientId, sessionDate: { gte: lookbackDate, lt: pkg.createdAt }, packageId: { not: pkg.id } }
          }),
          prisma.package.findFirst({
            where: {
              clientId: pkg.clientId,
              id: { not: pkg.id },
              remainingSessions: { gt: 0 },
              OR: [{ expiresAt: null }, { expiresAt: { gt: pkg.createdAt } }]
            }
          })
        ])

        if (!priorSession) unassignedNewClientIds.add(pkg.clientId)
        if (hadActivePackageAtPurchase || priorSession) unassignedResoldCount++
      }

      const unassignedNewlyLost = await prisma.client.count({
        where: {
          ...unassignedClientsWhere,
          packages: {
            some: {
              OR: [
                { remainingSessions: 0, updatedAt: { gte: dateFrom, lte: dateTo } },
                { expiresAt: { gte: dateFrom, lte: dateTo } }
              ]
            }
          },
          NOT: { packages: { some: getActivePackageWhereClause() } }
        }
      })

      // Add unassigned row if there are unassigned clients
      const unassignedRow = unassignedTotal > 0 ? {
        trainerId: 'unassigned',
        trainerName: 'Unassigned',
        trainerEmail: '',
        locationNames: [],
        total: unassignedTotal,
        active: unassignedActive,
        notStarted: unassignedNotStarted,
        atRisk: unassignedAtRisk,
        newClients: unassignedNewClientIds.size,
        resold: unassignedResoldCount,
        newlyLost: unassignedNewlyLost
      } : null

      // Combine trainer rows with unassigned row
      const allClientHealth = unassignedRow
        ? [...trainerClientHealthFiltered, unassignedRow]
        : trainerClientHealthFiltered

      return NextResponse.json({
        stats: {
          totalSessions,
          validatedSessions,
          totalSales: totalPackageSales._sum.totalValue || 0,
          validationRate,
          activeTrainers,
          // Client metrics - snapshots
          clientMetrics: {
            total: totalClients,
            active: activeClientsWithPackages,
            notStarted: notStartedClients,
            atRisk: filteredAtRiskCount,
            lost: lostClients
          },
          // Client metrics - period based
          clientMetricsPeriod: {
            newClients: newClientIds.size,
            resoldPackages: resoldPackageCount.count,
            newlyLost: newlyLostClients
          },
          unassignedClients,
          averagePerDay,
          averagePerWeek,
          period: {
            from: dateFrom,
            to: dateTo
          }
        },
        trainerStats: trainerStatsWithInfo,
        trainerClientHealth: allClientHealth,
        allTrainers: allTrainers.map(t => ({
          ...t,
          locationIds: t.locations ? t.locations.map(l => l.locationId) : [],
          // For backward compatibility, set locationId to first location
          locationId: t.locations && t.locations.length > 0 ? t.locations[0].locationId : null
        })), // Include all trainers for filtering
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