import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOrganizationId } from '@/lib/organization-context'
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
  const trainerId = searchParams.get('trainerId') // 'unassigned' for unassigned clients
  const metric = searchParams.get('metric') // total, active, notStarted, atRisk, new, resold, lost
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  if (!trainerId || !metric) {
    return NextResponse.json({ error: 'trainerId and metric are required' }, { status: 400 })
  }

  try {
    const organizationId = await getOrganizationId()

    // Base where clause for clients
    const baseWhere: any = {
      organizationId,
      active: true, // Not archived
      primaryTrainerId: trainerId === 'unassigned' ? null : trainerId
    }

    let clients: any[] = []

    // Parse dates for period metrics
    const periodStart = dateFrom ? new Date(dateFrom) : null
    const periodEnd = dateTo ? new Date(dateTo) : null

    switch (metric) {
      case 'total':
        // All clients assigned to this trainer
        clients = await prisma.client.findMany({
          where: baseWhere,
          select: {
            id: true,
            name: true,
            email: true,
            packages: {
              where: { active: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
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
        break

      case 'active':
        // Clients with active packages
        clients = await prisma.client.findMany({
          where: {
            ...baseWhere,
            packages: { some: getActivePackageWhereClause() }
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
                expiresAt: true
              }
            }
          },
          orderBy: { name: 'asc' }
        })
        break

      case 'notStarted':
        // Clients with active package but no sessions against it
        clients = await prisma.client.findMany({
          where: {
            ...baseWhere,
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
                expiresAt: true
              }
            }
          },
          orderBy: { name: 'asc' }
        })
        break

      case 'atRisk':
        // Clients at risk: expiring soon OR low sessions, but only if they have exactly 1 active package
        // (if they have 2+ active packages, they've already renewed)
        const atRiskRaw = await prisma.client.findMany({
          where: {
            ...baseWhere,
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
        // Filter to only clients with exactly 1 active package
        clients = atRiskRaw
          .filter(client => client.packages.length === 1)
          .map(client => ({
            ...client,
            packages: client.packages // Keep the at-risk package
          }))
        break

      case 'new':
        // New clients this period - purchased package with no prior sessions in 30 days
        if (!periodStart || !periodEnd) {
          return NextResponse.json({ error: 'dateFrom and dateTo required for period metrics' }, { status: 400 })
        }

        // Get packages created in period for this trainer's clients
        const newPackages = await prisma.package.findMany({
          where: {
            organizationId,
            createdAt: { gte: periodStart, lte: periodEnd },
            client: { ...baseWhere }
          },
          include: {
            client: {
              select: { id: true, name: true, email: true }
            }
          }
        })

        // Filter to truly new clients (no prior sessions on OTHER packages)
        const newClientIds = new Set<string>()
        for (const pkg of newPackages) {
          const lookbackDate = new Date(pkg.createdAt)
          lookbackDate.setDate(lookbackDate.getDate() - CLIENT_METRICS_CONFIG.NEW_CLIENT_LOOKBACK_DAYS)

          const priorSession = await prisma.session.findFirst({
            where: {
              clientId: pkg.clientId,
              sessionDate: { gte: lookbackDate, lt: pkg.createdAt },
              packageId: { not: pkg.id }
            }
          })

          if (!priorSession) {
            newClientIds.add(pkg.clientId)
          }
        }

        // Get the client details with their new package
        clients = await prisma.client.findMany({
          where: {
            id: { in: Array.from(newClientIds) }
          },
          select: {
            id: true,
            name: true,
            email: true,
            packages: {
              where: {
                createdAt: { gte: periodStart, lte: periodEnd }
              },
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
        })
        break

      case 'resold':
        // Resold packages this period
        if (!periodStart || !periodEnd) {
          return NextResponse.json({ error: 'dateFrom and dateTo required for period metrics' }, { status: 400 })
        }

        const resoldPackages = await prisma.package.findMany({
          where: {
            organizationId,
            createdAt: { gte: periodStart, lte: periodEnd },
            client: { ...baseWhere }
          },
          include: {
            client: {
              select: { id: true, name: true, email: true }
            }
          }
        })

        // Filter to resold (had active package or recent session on OTHER packages)
        const resoldResults: any[] = []
        for (const pkg of resoldPackages) {
          const lookbackDate = new Date(pkg.createdAt)
          lookbackDate.setDate(lookbackDate.getDate() - CLIENT_METRICS_CONFIG.NEW_CLIENT_LOOKBACK_DAYS)

          const [priorSession, hadActivePackage] = await Promise.all([
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

          if (hadActivePackage || priorSession) {
            resoldResults.push({
              id: pkg.client.id,
              name: pkg.client.name,
              email: pkg.client.email,
              packages: [{
                id: pkg.id,
                name: pkg.name,
                remainingSessions: pkg.remainingSessions,
                totalSessions: pkg.totalSessions,
                expiresAt: pkg.expiresAt,
                createdAt: pkg.createdAt
              }]
            })
          }
        }
        clients = resoldResults
        break

      case 'lost':
        // Clients lost this period (package ended, no replacement)
        if (!periodStart || !periodEnd) {
          return NextResponse.json({ error: 'dateFrom and dateTo required for period metrics' }, { status: 400 })
        }

        clients = await prisma.client.findMany({
          where: {
            ...baseWhere,
            packages: {
              some: {
                OR: [
                  { remainingSessions: 0, updatedAt: { gte: periodStart, lte: periodEnd } },
                  { expiresAt: { gte: periodStart, lte: periodEnd } }
                ]
              }
            },
            NOT: { packages: { some: getActivePackageWhereClause() } }
          },
          select: {
            id: true,
            name: true,
            email: true,
            packages: {
              where: {
                OR: [
                  { remainingSessions: 0, updatedAt: { gte: periodStart, lte: periodEnd } },
                  { expiresAt: { gte: periodStart, lte: periodEnd } }
                ]
              },
              orderBy: { updatedAt: 'desc' },
              take: 1,
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
        break

      default:
        return NextResponse.json({ error: 'Invalid metric' }, { status: 400 })
    }

    return NextResponse.json({ clients })

  } catch (error) {
    console.error('Error fetching dashboard clients:', error)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}
