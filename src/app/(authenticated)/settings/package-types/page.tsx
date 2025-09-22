import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PackageTypesTab } from '@/components/packages/PackageTypesTab'

export default async function PackageTypesSettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }
  
  // Only allow ADMIN, PT_MANAGER, and CLUB_MANAGER roles
  const userRole = session.user.role?.toUpperCase()
  if (userRole !== 'ADMIN' && userRole !== 'PT_MANAGER' && userRole !== 'CLUB_MANAGER') {
    redirect('/dashboard')
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Package Types</h1>
        <p className="text-sm text-text-secondary mt-1">
          Configure the package types available for your organization
        </p>
      </div>
      
      <PackageTypesTab />
    </div>
  )
}