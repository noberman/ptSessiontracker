import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ChevronLeft } from 'lucide-react'
import { PackageTemplateForm } from '@/components/package-templates/PackageTemplateForm'

export default async function NewPackageTemplatePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Only admins can create templates
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
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
        <h1 className="text-2xl font-bold text-text-primary">Create Package Template</h1>
        <p className="text-sm text-text-secondary mt-1">
          Add a new package template for clients
        </p>
      </div>

      <PackageTemplateForm />
    </div>
  )
}