import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ClientTable } from '@/components/clients/ClientTable'
import { ClientSearch } from '@/components/clients/ClientSearch'
import { Button } from '@/components/ui/Button'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    page?: string
    search?: string
    locationId?: string
    primaryTrainerId?: string
    active?: string 
  }>
}) {
  const params = await searchParams
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const page = parseInt(params.page || '1')
  const limit = 10
  const search = params.search || ''
  const locationId = params.locationId || ''
  const primaryTrainerId = params.primaryTrainerId || ''
  const active = params.active !== 'false'
  
  const skip = (page - 1) * limit

  const where: any = {}

  // Default to active clients unless explicitly requested
  if (params.active !== undefined) {
    where.active = active
  } else {
    where.active = true
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (locationId) {
    where.locationId = locationId
  }

  if (primaryTrainerId) {
    where.primaryTrainerId = primaryTrainerId
  }

  // Restrict based on user role
  if (session.user.role === 'TRAINER') {
    where.primaryTrainerId = session.user.id
  } else if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
    where.locationId = session.user.locationId
  }

  const [clients, total, locations, trainers] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        active: true,
        locationId: true,
        primaryTrainerId: true,
        location: {
          select: {
            name: true,
          },
        },
        primaryTrainer: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            sessions: true,
            packages: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.client.count({ where }),
    // Get locations for filter
    session.user.role === 'CLUB_MANAGER' && session.user.locationId
      ? prisma.location.findMany({
          where: { id: session.user.locationId },
          select: { id: true, name: true },
        })
      : prisma.location.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
    // Get trainers for filter
    prisma.user.findMany({
      where: {
        role: 'TRAINER',
        active: true,
        ...(session.user.role === 'CLUB_MANAGER' && session.user.locationId
          ? { locationId: session.user.locationId }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    }),
  ])

  const pagination = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }

  const canEdit = ['CLUB_MANAGER', 'PT_MANAGER', 'ADMIN'].includes(session.user.role)
  const canDelete = session.user.role === 'ADMIN'
  const canCreate = session.user.role !== 'TRAINER'

  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Clients</h1>
            <p className="text-sm text-text-secondary mt-1">
              Manage client profiles and assignments
            </p>
          </div>
          <div className="flex space-x-3">
            {canCreate && (
              <>
                <Link href="/clients/import">
                  <Button variant="outline">Import CSV</Button>
                </Link>
                <Link href="/clients/new">
                  <Button>Add New Client</Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="mb-6">
          <ClientSearch 
            locations={locations}
            trainers={trainers}
            showInactive={session.user.role === 'ADMIN'}
          />
        </div>

        <ClientTable
          initialClients={clients}
          pagination={pagination}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </div>
    </div>
  )
}