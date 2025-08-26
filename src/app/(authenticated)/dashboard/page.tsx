import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardWrapper } from '@/components/dashboard/DashboardWrapper'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <DashboardWrapper 
      userId={session.user.id}
      userName={session.user.name}
      actualRole={session.user.role}
      locationId={session.user.locationId}
    />
  )
}