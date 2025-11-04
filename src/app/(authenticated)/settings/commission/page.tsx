import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CommissionProfileList } from '@/components/commission/CommissionProfileList'

export default async function CommissionSettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }
  
  // Only allow ADMIN and PT_MANAGER roles for v2
  const userRole = session.user.role?.toUpperCase()
  if (userRole !== 'ADMIN' && userRole !== 'PT_MANAGER') {
    redirect('/dashboard')
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Commission Profiles</h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage commission structures for different trainer levels and specializations
        </p>
      </div>
      
      <CommissionProfileList userRole={userRole} />
    </div>
  )
}