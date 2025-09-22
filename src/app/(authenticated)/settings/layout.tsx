import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SettingsNav } from '@/components/settings/SettingsNav'

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
    <div className="flex min-h-screen">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r bg-background-secondary">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-6">Settings</h2>
          <SettingsNav />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        {children}
      </div>
    </div>
  )
}