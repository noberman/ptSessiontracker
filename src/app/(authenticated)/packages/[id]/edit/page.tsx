import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PackageForm } from '@/components/packages/PackageForm'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default async function EditPackagePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Trainers cannot edit packages
  if (session.user.role === 'TRAINER') {
    redirect('/packages')
  }

  // Fetch package data
  const packageData = await prisma.package.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          locationId: true,
        },
      },
    },
  })

  if (!packageData) {
    redirect('/packages')
  }

  // Check permissions for club managers
  if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
    if (packageData.client.locationId !== session.user.locationId) {
      redirect('/packages')
    }
  }

  // Fetch available clients
  const where: any = { active: true }
  
  if (session.user.role === 'CLUB_MANAGER' && session.user.locationId) {
    where.locationId = session.user.locationId
  }

  const clients = await prisma.client.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  // Ensure the current client is in the list
  if (!clients.find(c => c.id === packageData.clientId)) {
    clients.push({
      id: packageData.client.id,
      name: packageData.client.name,
      email: packageData.client.email,
    })
  }

  const formattedPackage = {
    ...packageData,
    startDate: packageData.startDate?.toISOString(),
    expiresAt: packageData.expiresAt?.toISOString(),
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Edit Package</h1>
          <p className="text-sm text-text-secondary mt-1">
            Update package details for {packageData.client.name}
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href="/packages">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </div>

      <PackageForm
        packageData={formattedPackage}
        clients={clients}
        currentUserRole={session.user.role}
      />
    </div>
  )
}