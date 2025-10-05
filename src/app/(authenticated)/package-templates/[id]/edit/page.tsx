import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ChevronLeft } from 'lucide-react'
import { PackageTemplateForm } from '@/components/package-templates/PackageTemplateForm'
import { prisma } from '@/lib/prisma'

export default async function EditPackageTemplatePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Only admins can edit templates
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const template = await prisma.packageType.findUnique({
    where: { id }
  })

  if (!template) {
    redirect('/package-templates')
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/package-templates">
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Templates
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">Edit Package Template</h1>
        <p className="text-sm text-text-secondary mt-1">
          Update package template details
        </p>
      </div>

      <PackageTemplateForm template={{
        id: template.id,
        name: template.name,
        displayName: template.name, // Using name as displayName
        category: 'general', // Default category
        sessions: template.defaultSessions || 0,
        price: template.defaultPrice || 0,
        active: template.isActive,
        sortOrder: template.sortOrder
      }} />
    </div>
  )
}