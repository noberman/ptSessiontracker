import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ClientImportForm } from '@/components/clients/ClientImportForm'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ChevronLeft } from 'lucide-react'

export default async function ClientImportPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Only managers and admins can import
  if (!['ADMIN', 'PT_MANAGER', 'CLUB_MANAGER'].includes(session.user.role)) {
    redirect('/clients')
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/clients">
          <Button variant="ghost" size="sm" className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Clients
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">Import Clients & Packages</h1>
        <p className="text-sm text-text-secondary mt-1">
          Bulk import clients with their package balances from a CSV file
        </p>
      </div>

      <ClientImportForm userRole={session.user.role} />
    </div>
  )
}