import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/Button'
import { PackageTemplatesTable } from '@/components/package-templates/PackageTemplatesTable'

export default async function PackageTemplatesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Only admins can access this page
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const templates = await prisma.packageType.findMany({
    orderBy: [
      { category: 'asc' },
      { sortOrder: 'asc' }
    ]
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Package Templates</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage package templates and pricing
          </p>
        </div>
        <Link href="/package-templates/new">
          <Button>Add Template</Button>
        </Link>
      </div>

      <PackageTemplatesTable templates={templates} />
    </div>
  )
}