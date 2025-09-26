'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Sparkles, ChevronRight, CheckCircle, ArrowRight, Mail, MousePointer } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { DemoSessionTable } from '../DemoSessionTable'
import { DemoCommissionReport } from '../DemoCommissionReport'
import { CompletionModal } from '../CompletionModal'
import { fakeSessions, fakeCommissionData } from '@/lib/demo-data'

interface DemoStepProps {
  onComplete: () => void
  isLoading?: boolean
}

type DemoStage = 'intro' | 'show-sessions' | 'create-client' | 'create-session' | 'email-sent' | 'show-commission' | 'complete'

export function DemoStep({ onComplete, isLoading = false }: DemoStepProps) {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [demoStage, setDemoStage] = useState<DemoStage>('intro')
  const [testClient, setTestClient] = useState({ 
    name: `${session?.user?.name || 'Test'} (Demo)`, 
    email: session?.user?.email || '',
    phone: ''
  })
  const [createdClient, setCreatedClient] = useState<any>(null)
  const [createdPackage, setCreatedPackage] = useState<any>(null)
  const [createdSession, setCreatedSession] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const [showNewSessionPrompt, setShowNewSessionPrompt] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false)

  // Enhanced sessions with user's demo session
  const [allSessions, setAllSessions] = useState(fakeSessions)
  const [allCommissions, setAllCommissions] = useState(fakeCommissionData)

  useEffect(() => {
    if (demoStage === 'show-sessions') {
      // Show the prompt after a short delay
      setTimeout(() => setShowNewSessionPrompt(true), 500)
    }
  }, [demoStage])

  const handleStartDemo = () => {
    console.log('🔵 Starting demo walkthrough')
    setDemoStage('show-sessions')
  }

  const handleNewSessionClick = () => {
    setShowNewSessionPrompt(false)
    setDemoStage('create-client')
  }

  const handleCreateClient = async () => {
    setIsCreating(true)
    setError('')
    
    try {
      // Create demo client
      const clientResponse = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...testClient,
          locationId: session?.user?.locationId,
          isDemo: true
        })
      })

      if (!clientResponse.ok) {
        const error = await clientResponse.json()
        throw new Error(error.error || 'Failed to create client')
      }

      const client = await clientResponse.json()
      setCreatedClient(client)
      console.log('🔵 Created demo client:', client)

      // Create a demo package for the client
      const packageResponse = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          name: 'Demo Package - 10 Sessions',
          totalSessions: 10,
          totalValue: 500,
          sessionValue: 50,
          isDemo: true
        })
      })

      if (!packageResponse.ok) {
        const error = await packageResponse.json()
        throw new Error(error.error || 'Failed to create package')
      }

      const pkg = await packageResponse.json()
      setCreatedPackage(pkg)
      console.log('🔵 Created demo package:', pkg)
      
      setDemoStage('create-session')
    } catch (error: any) {
      console.error('Failed to create demo client:', error)
      setError(error.message || 'Failed to create demo data')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateSession = async () => {
    setIsCreating(true)
    setError('')
    
    try {
      // Create demo session
      const sessionResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: createdClient.id,
          packageId: createdPackage.id,
          sessionDate: new Date().toISOString(),
          sessionTime: new Date().toLocaleTimeString(),
          notes: 'Demo session created during onboarding',
          trainerId: session?.user?.id,
          isDemo: true
        })
      })

      if (!sessionResponse.ok) {
        const error = await sessionResponse.json()
        throw new Error(error.error || 'Failed to create session')
      }

      const sessionData = await sessionResponse.json()
      setCreatedSession(sessionData)
      console.log('🔵 Created demo session:', sessionData)
      
      // Add the new session to the table
      const newSession = {
        id: sessionData.id,
        sessionDate: new Date(),
        trainer: {
          name: session?.user?.name || 'You',
          email: session?.user?.email || ''
        },
        client: {
          name: testClient.name,
          email: testClient.email
        },
        location: {
          name: sessionData.location?.name || 'Your Location'
        },
        package: {
          name: 'Demo Package - 10 Sessions'
        },
        sessionValue: 50,
        validated: false,
        validatedAt: null
      }
      
      setAllSessions([...allSessions, newSession])
      setDemoStage('email-sent')
    } catch (error: any) {
      console.error('Failed to create demo session:', error)
      setError(error.message || 'Failed to create session')
    } finally {
      setIsCreating(false)
    }
  }

  const handleValidationComplete = () => {
    // Update session to validated
    setAllSessions(sessions => 
      sessions.map(s => 
        s.id === createdSession?.id 
          ? { ...s, validated: true, validatedAt: new Date() }
          : s
      )
    )
    
    // Add user to commission report
    const userCommission = {
      trainer: {
        name: session?.user?.name || 'You',
        email: session?.user?.email || ''
      },
      sessionsCount: 1,
      currentTier: 'Tier 1',
      rate: 40,
      sessionValue: 50,
      commission: 20
    }
    
    setAllCommissions([...fakeCommissionData, userCommission])
    setDemoStage('show-commission')
  }

  const handleDemoComplete = async () => {
    console.log('🔵 handleDemoComplete called')
    console.log('🔵 Current URL:', window.location.href)
    console.log('🔵 Marking onboarding as complete first...')
    
    setIsCompletingOnboarding(true)
    
    try {
      // First mark onboarding as complete
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedDemo: true })
      })
      
      if (!response.ok) {
        console.error('Failed to mark onboarding complete:', response.status)
        throw new Error('Failed to complete onboarding')
      }
      
      console.log('✅ Onboarding marked as complete in database')
      console.log('🔵 Refreshing session...')
      
      // Force session refresh to get updated onboardingCompletedAt
      await update()
      
      console.log('✅ Session refreshed')
      console.log('🔵 Waiting a moment for session to propagate...')
      
      // Small delay to ensure session propagates
      await new Promise(resolve => setTimeout(resolve, 500))
      
      console.log('🔵 Attempting to navigate to: /dashboard?onboarding=complete')
      
      // Now navigate to dashboard with completion query param
      window.location.href = '/dashboard?onboarding=complete'
      console.log('🔵 Navigation command executed')
    } catch (error) {
      console.error('Error completing onboarding:', error)
      setIsCompletingOnboarding(false)
      setError('Failed to complete onboarding. Please try again.')
    }
  }

  const handleClearDemoData = async () => {
    try {
      await fetch('/api/demo/cleanup', { method: 'DELETE' })
      console.log('🔵 Demo data cleared')
    } catch (error) {
      console.error('Failed to clear demo data:', error)
    }
  }

  // Intro screen
  if (demoStage === 'intro') {
    return (
      <Card className="p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-text-primary mb-2">
            See FitSync in Action
          </h2>
          <p className="text-text-secondary">
            Let's walk through creating and validating a real session
          </p>
        </div>

        <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-3">What you'll experience:</h3>
          <ol className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">1.</span>
              See the Sessions dashboard with example data
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">2.</span>
              Create a test client and log a real session
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">3.</span>
              Receive an actual validation email
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">4.</span>
              View the commission report with your earnings
            </li>
          </ol>
        </div>

        <div className="text-center">
          <Button
            onClick={handleStartDemo}
            size="lg"
            className="min-w-[200px]"
          >
            Start Walkthrough
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    )
  }

  // Show Sessions Table
  if (demoStage === 'show-sessions') {
    return (
      <div className="space-y-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">Sessions</h2>
              <p className="text-sm text-text-secondary">
                This is where you'll manage all training sessions
              </p>
            </div>
            <div className="relative">
              <Button
                onClick={handleNewSessionClick}
                className="relative"
              >
                Log New Session
              </Button>
              {showNewSessionPrompt && (
                <div className="absolute -top-16 right-0 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap animate-bounce">
                  <MousePointer className="w-4 h-4 inline mr-1" />
                  Click here to log a session
                  <div className="absolute bottom-0 right-8 transform translate-y-full">
                    <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DemoSessionTable 
            sessions={allSessions}
            highlightedId={createdSession?.id}
          />

          {createdSession && (
            <div className="mt-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
              <p className="text-sm text-primary-800">
                <span className="font-semibold">📍 Your session:</span> The highlighted row shows the session you'll create
              </p>
            </div>
          )}
        </Card>
      </div>
    )
  }

  // Create Client screen
  if (demoStage === 'create-client') {
    return (
      <div className="space-y-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary font-bold">1</span>
            </div>
            <div>
              <h3 className="font-semibold">Create a Test Client</h3>
              <p className="text-sm text-text-secondary">
                First, let's create a client using your email address
              </p>
            </div>
          </div>

          <div className="bg-background rounded-lg border-2 border-primary/20 p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client Name</label>
                <Input
                  value={testClient.name}
                  onChange={(e) => setTestClient({...testClient, name: e.target.value})}
                  placeholder="Client name"
                />
                <p className="text-xs text-text-secondary mt-1">
                  We've added "(Demo)" to identify this as test data
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <Input
                  type="email"
                  value={testClient.email}
                  onChange={(e) => setTestClient({...testClient, email: e.target.value})}
                  placeholder="your@email.com"
                />
                <p className="text-xs text-text-secondary mt-1">
                  This is where the validation email will be sent
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phone (Optional)</label>
                <Input
                  value={testClient.phone}
                  onChange={(e) => setTestClient({...testClient, phone: e.target.value})}
                  placeholder="Phone number"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-md">
              <p className="text-sm text-error-600">{error}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleCreateClient}
              disabled={!testClient.name || !testClient.email || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Client & Continue'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Create Session screen
  if (demoStage === 'create-session') {
    return (
      <div className="space-y-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary font-bold">2</span>
            </div>
            <div>
              <h3 className="font-semibold">Log a Training Session</h3>
              <p className="text-sm text-text-secondary">
                Now let's log a session for your test client
              </p>
            </div>
          </div>

          <div className="bg-background rounded-lg border-2 border-primary/20 p-6">
            <p className="text-sm text-primary font-medium mb-4">
              ℹ️ This is the same form your trainers will use daily
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client</label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="font-medium">{createdClient?.name}</p>
                  <p className="text-sm text-text-secondary">{createdClient?.email}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Package</label>
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="font-medium">Demo Package - 10 Sessions</p>
                  <p className="text-sm text-text-secondary">$50 per session</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <Input
                    type="date"
                    value={new Date().toISOString().split('T')[0]}
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time</label>
                  <Input
                    type="time"
                    value={new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                    disabled
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <Input
                  value="Demo session created during onboarding"
                  disabled
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-md">
              <p className="text-sm text-error-600">{error}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleCreateSession}
              disabled={isCreating}
              className="bg-primary"
            >
              {isCreating ? 'Creating Session...' : 'Log Session'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Email Sent screen
  if (demoStage === 'email-sent') {
    return (
      <div className="space-y-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary font-bold">3</span>
            </div>
            <div>
              <h3 className="font-semibold">Check Your Email</h3>
              <p className="text-sm text-text-secondary">
                We've sent a validation request to your email
              </p>
            </div>
          </div>

          <div className="text-center py-8">
            <Mail className="w-16 h-16 text-primary mx-auto mb-4" />
            <p className="text-lg mb-2">Validation email sent to:</p>
            <p className="text-xl font-bold text-primary mb-6">{testClient.email}</p>
            
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
              <p className="text-sm text-text-primary">
                Check your inbox and click the validation link. This is how your clients will confirm their sessions.
              </p>
            </div>

            <Button
              onClick={handleValidationComplete}
              size="lg"
              className="min-w-[200px]"
            >
              I've Validated the Session
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Show Commission Report
  if (demoStage === 'show-commission') {
    return (
      <div className="space-y-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <div>
              <h3 className="font-semibold">Session Validated!</h3>
              <p className="text-sm text-text-secondary">
                Here's your commission report showing all trainer earnings
              </p>
            </div>
          </div>

          <DemoCommissionReport 
            commissions={allCommissions}
            highlightedEmail={session?.user?.email || ''}
          />

          <div className="mt-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
            <p className="text-sm text-primary-800">
              <span className="font-semibold">📍 Your commission:</span> The highlighted row shows your $20 commission from the validated session
            </p>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary mb-4">
              This commission will appear in your monthly payroll report
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-md max-w-md mx-auto">
                <p className="text-sm text-error-600">{error}</p>
              </div>
            )}
            
            <Button
              type="button"
              onClick={handleDemoComplete}
              disabled={isCompletingOnboarding}
              size="lg"
              className="min-w-[200px]"
            >
              {isCompletingOnboarding ? 'Completing...' : 'Complete Tour & Go to Dashboard'}
              {!isCompletingOnboarding && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return null
}