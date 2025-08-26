import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { UserTable } from '@/components/users/UserTable'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { UserSearch } from '@/components/users/UserSearch'

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; role?: string; locationId?: string }>
}) {
  const params = await searchParams
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Only managers and admins can view user list
  if (!['CLUB_MANAGER', 'PT_MANAGER', 'ADMIN'].includes(session.user.role)) {
    redirect('/dashboard')
  }

  const page = parseInt(params.page || '1')
  const limit = 10
  const search = params.search || ''
  const role = params.role || ''
  const locationId = params.locationId || ''
  
  const skip = (page - 1) * limit

  const where: any = {
    active: true,
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (role) {
    where.role = role
  }

  if (locationId) {
    where.locationId = locationId
  }

  // Restrict club managers to their location
  if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
    where.locationId = session.user.locationId
  }

  const [users, total, locations] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        locationId: true,
        location: {
          select: {
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.user.count({ where }),
    prisma.location.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ])

  const pagination = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }

  const canEdit = ['PT_MANAGER', 'ADMIN'].includes(session.user.role) || 
                  session.user.role === 'CLUB_MANAGER'
  const canDelete = session.user.role === 'ADMIN'

  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Users</h1>
            <p className="text-sm text-text-secondary mt-1">
              Manage trainers and staff members
            </p>
          </div>
          {canEdit && (
            <Link href="/users/new">
              <Button>Add New User</Button>
            </Link>
          )}
        </div>

        <div className="mb-6">
          <UserSearch 
            locations={session.user.role === 'CLUB_MANAGER' ? [] : locations}
            currentRole={session.user.role}
          />
        </div>

        <UserTable
          initialUsers={users}
          pagination={pagination}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      </div>
    </div>
  )
}