'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Building2, UserCheck, Mail, Lock, User } from 'lucide-react'

interface AcceptInvitationClientProps {
  invitation: {
    email: string
    role: string
    organization: {
      name: string
    }
    invitedBy: {
      name: string
      email: string
    }
    expiresAt: Date
  }
  token: string
  isLoggedIn: boolean
  currentUserEmail?: string | null
}

export default function AcceptInvitationClient({
  invitation,
  token,
  isLoggedIn,
  currentUserEmail,
}: AcceptInvitationClientProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'initial' | 'signup' | 'login'>('initial')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Check if user needs to create account or just accept
  const needsAccount = !isLoggedIn || currentUserEmail !== invitation.email
  const wrongAccount = isLoggedIn && currentUserEmail !== invitation.email

  const handleAccept = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          name: mode === 'signup' ? name : undefined,
          password: mode === 'signup' ? password : undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.newUser) {
          // New user created - redirect to login
          router.push('/login?welcome=true')
        } else {
          // Existing user accepted - redirect to dashboard
          router.push('/dashboard?invitation=accepted')
        }
      } else {
        setError(data.error || 'Failed to accept invitation')
        if (data.error?.includes('already exists')) {
          setMode('login')
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    await handleAccept()
  }

  const roleLabels: Record<string, string> = {
    TRAINER: 'Trainer',
    PT_MANAGER: 'PT Manager',
    CLUB_MANAGER: 'Club Manager',
    ADMIN: 'Administrator',
  }

  // Calculate days until expiration
  const daysUntilExpiry = Math.ceil(
    (new Date(invitation.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="min-h-screen bg-background-secondary flex items-center justify-center py-12">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-white p-6 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-3" />
            <h1 className="text-2xl font-bold">
              Join {invitation.organization.name}
            </h1>
          </div>

          {/* Content */}
          <div className="p-6">
            {mode === 'initial' && (
              <>
                <div className="mb-6 text-center">
                  <p className="text-text-secondary mb-4">
                    <span className="font-medium text-text-primary">{invitation.invitedBy.name}</span> has invited you to join as a{' '}
                    <span className="font-medium text-text-primary">{roleLabels[invitation.role] || invitation.role}</span>
                  </p>
                  
                  <div className="bg-background-secondary rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
                      <Mail className="w-4 h-4" />
                      <span>{invitation.email}</span>
                    </div>
                  </div>

                  {daysUntilExpiry <= 2 && (
                    <p className="text-warning-600 text-sm">
                      ⚠️ This invitation expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {wrongAccount && (
                  <div className="mb-6 p-4 bg-warning-50 border border-warning-200 rounded-lg">
                    <p className="text-sm text-warning-800">
                      You're currently logged in as <strong>{currentUserEmail}</strong>.
                      This invitation was sent to <strong>{invitation.email}</strong>.
                      Please log out and log in with the correct account.
                    </p>
                  </div>
                )}

                {!isLoggedIn && (
                  <>
                    <div className="space-y-3">
                      <Button
                        onClick={() => setMode('signup')}
                        className="w-full"
                        size="lg"
                      >
                        <UserCheck className="w-5 h-5 mr-2" />
                        Create Account & Accept
                      </Button>
                      
                      <Button
                        onClick={() => setMode('login')}
                        variant="outline"
                        className="w-full"
                        size="lg"
                      >
                        I already have an account
                      </Button>
                    </div>
                  </>
                )}

                {isLoggedIn && !wrongAccount && (
                  <Button
                    onClick={handleAccept}
                    className="w-full"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? 'Accepting...' : 'Accept Invitation'}
                  </Button>
                )}
              </>
            )}

            {mode === 'signup' && (
              <>
                <h2 className="text-xl font-bold mb-4">Create Your Account</h2>
                <form onSubmit={handleSignup}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Email
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-background-secondary rounded-md">
                      <Mail className="w-4 h-4 text-text-tertiary" />
                      <span className="text-sm">{invitation.email}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="At least 8 characters"
                        required
                        minLength={8}
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Re-enter your password"
                        required
                        minLength={8}
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-md">
                      <p className="text-sm text-error-600">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMode('initial')}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? 'Creating...' : 'Create Account'}
                    </Button>
                  </div>
                </form>
              </>
            )}

            {mode === 'login' && (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold mb-2">Already Have an Account?</h2>
                  <p className="text-text-secondary text-sm">
                    Please log in with your existing account for {invitation.email} to accept this invitation.
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-md">
                    <p className="text-sm text-error-600">{error}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setMode('initial')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => router.push(`/login?redirect=/invitation/${token}`)}
                    className="flex-1"
                  >
                    Go to Login
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-text-secondary mt-6">
          © 2024 FitSync. All rights reserved.
        </p>
      </div>
    </div>
  )
}