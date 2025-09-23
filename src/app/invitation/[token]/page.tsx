import AcceptInvitationClient from './AcceptInvitationClient'
import { getInvitationByToken } from '@/lib/invitation-service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface PageProps {
  params: Promise<{
    token: string
  }>
}

export default async function AcceptInvitationPage({ params }: PageProps) {
  const { token } = await params
  const session = await getServerSession(authOptions)
  
  // Get invitation details
  const invitation = await getInvitationByToken(token)
  
  if (!invitation) {
    return (
      <div className="min-h-screen bg-background-secondary flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-text-primary mb-4">
              Invalid Invitation
            </h1>
            <p className="text-text-secondary mb-6">
              This invitation link is invalid or has already been used.
            </p>
            <a 
              href="/login"
              className="text-primary hover:text-primary-dark underline"
            >
              Go to login
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (invitation.status === 'EXPIRED') {
    return (
      <div className="min-h-screen bg-background-secondary flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-text-primary mb-4">
              Invitation Expired
            </h1>
            <p className="text-text-secondary mb-6">
              This invitation has expired. Please contact {invitation.invitedBy.name} or your organization administrator for a new invitation.
            </p>
            <a 
              href="/login"
              className="text-primary hover:text-primary-dark underline"
            >
              Go to login
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (invitation.status === 'ACCEPTED') {
    return (
      <div className="min-h-screen bg-background-secondary flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-text-primary mb-4">
              Invitation Already Accepted
            </h1>
            <p className="text-text-secondary mb-6">
              This invitation has already been accepted. Please log in to access your account.
            </p>
            <a 
              href="/login"
              className="inline-block px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              Go to login
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (invitation.status === 'CANCELLED') {
    return (
      <div className="min-h-screen bg-background-secondary flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-text-primary mb-4">
              Invitation Cancelled
            </h1>
            <p className="text-text-secondary mb-6">
              This invitation has been cancelled. Please contact your organization administrator for assistance.
            </p>
            <a 
              href="/login"
              className="text-primary hover:text-primary-dark underline"
            >
              Go to login
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AcceptInvitationClient 
      invitation={invitation}
      token={token}
      isLoggedIn={!!session}
      currentUserEmail={session?.user?.email}
    />
  )
}