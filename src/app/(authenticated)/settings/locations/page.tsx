import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LocationsTab } from '@/components/packages/LocationsTab'

export default async function LocationsSettingsPage() {
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
        <h1 className="text-2xl font-bold text-text-primary">Locations</h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage your gym locations where sessions are conducted
        </p>
      </div>
      
      <LocationsTab />
    </div>
  )
}