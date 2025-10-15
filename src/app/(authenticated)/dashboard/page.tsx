import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardWrapper } from '@/components/dashboard/DashboardWrapper'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // The middleware handles onboarding redirect, so if we're here, user can see dashboard
  
  return (
    <DashboardWrapper 
      userId={session.user.id}
      userName={session.user.name || ''}
      actualRole={session.user.role}
    />
  )
}