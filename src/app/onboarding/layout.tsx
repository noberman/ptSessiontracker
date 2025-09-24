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

  // If user already has an organization, they shouldn't be in onboarding
  // This prevents invited users or existing users from accessing onboarding
  if (session.user.organizationId) {
    redirect('/dashboard')
  }
  
  // Only users without an organization should reach onboarding
  // This is for new sign-ups or Google sign-in first-time users

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white">
      {children}
    </div>
  )
}