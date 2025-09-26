import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  // Redirect to login if not authenticated
  if (!session) {
    redirect('/login')
  }

  // The middleware handles all onboarding logic
  // This layout just provides the wrapper
  // Don't do any redirects here - let middleware handle it

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      {children}
    </div>
  )
}