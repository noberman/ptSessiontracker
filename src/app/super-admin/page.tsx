import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin, getOrganizationsForSuperAdmin } from '@/lib/auth/super-admin'
import SuperAdminDashboard from '@/components/super-admin/SuperAdminDashboard'

export default async function SuperAdminPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/login')
  }

  // Check if user is super admin
  const isAdmin = await isSuperAdmin(session.user.id)
  if (!isAdmin) {
    redirect('/dashboard')
  }

  // Get organizations (include clones in development)
  const includeClones = process.env.NODE_ENV === 'development'
  const organizations = await getOrganizationsForSuperAdmin(includeClones)

  return <SuperAdminDashboard organizations={organizations} />
}