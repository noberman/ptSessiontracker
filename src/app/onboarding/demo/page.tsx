'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import { Sparkles, CheckCircle, DollarSign, Mail, Play, User } from 'lucide-react'

type DemoMode = 'quick' | 'full' | null

export default function DemoPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [demoMode, setDemoMode] = useState<DemoMode>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [demoData, setDemoData] = useState<any>(null)
  const [fullDemoStep, setFullDemoStep] = useState(1)
  const [testClientEmail, setTestClientEmail] = useState(session?.user?.email || '')
  const [error, setError] = useState('')

  // Generate demo data on mount
  useEffect(() => {
    generateDemoData()
  }, [])

  const generateDemoData = async () => {
    try {
      const response = await fetch('/api/onboarding/demo-data', {
        method: 'POST',
      })
      const data = await response.json()
      setDemoData(data)
    } catch (error) {
      console.error('Failed to generate demo data:', error)
    }
  }

  const handleQuickDemo = () => {
    setDemoMode('quick')
  }

  const handleFullDemo = () => {
    setDemoMode('full')
  }

  const handleCreateTestClient = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Create test client with user's email
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${session?.user?.name} (Test)`,
          email: testClientEmail,
          isTest: true, // Mark as test for easy cleanup
        }),
      })

      if (!response.ok) throw new Error('Failed to create test client')

      const client = await response.json()
      
      // Create a package for the client
      const packageResponse = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          name: demoData?.packages?.[0]?.name || '10 Session Package',
          totalSessions: 10,
          remainingSessions: 10,
          price: 500,
        }),
      })

      if (!packageResponse.ok) throw new Error('Failed to create package')

      setFullDemoStep(2)
    } catch (err: any) {
      setError(err.message || 'Failed to create test client')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogSession = async () => {
    setIsLoading(true)
    try {
      // Log a test session
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: demoData?.client?.id,
          packageId: demoData?.package?.id,
          date: new Date().toISOString(),
          duration: 60,
          type: 'PERSONAL',
          value: 50,
        }),
      })

      if (!response.ok) throw new Error('Failed to log session')

      setFullDemoStep(3)
    } catch (err: any) {
      setError(err.message || 'Failed to log session')
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = () => {
    // Clear onboarding progress
    localStorage.removeItem('onboarding_progress')
    
    // Mark onboarding as complete
    localStorage.setItem('onboarding_completed', 'true')
    
    // Redirect to dashboard
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <OnboardingProgress currentStep={6} />
        
        {!demoMode ? (
          // Demo Mode Selection
          <Card className="p-8 md:p-10 max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                Let&apos;s see FitSync in action!
              </h2>
              <p className="text-text-secondary">
                How would you like to experience FitSync?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Quick Demo Option */}
              <Card 
                className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={handleQuickDemo}
              >
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-success-100 rounded-full mb-3">
                    <Play className="w-6 h-6 text-success-600" />
                  </div>
                  <h3 className="font-semibold text-text-primary mb-2">
                    Quick Demo
                  </h3>
                  <p className="text-sm text-text-secondary mb-3">
                    See instant calculations with test data
                  </p>
                  <p className="text-xs text-primary font-medium">
                    30 seconds
                  </p>
                  <div className="mt-4">
                    <span className="inline-block bg-primary-100 text-primary text-xs px-2 py-1 rounded">
                      Recommended
                    </span>
                  </div>
                </div>
              </Card>

              {/* Full Experience Option */}
              <Card 
                className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={handleFullDemo}
              >
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-3">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-text-primary mb-2">
                    Try It Yourself
                  </h3>
                  <p className="text-sm text-text-secondary mb-3">
                    Experience full validation with your email
                  </p>
                  <p className="text-xs text-primary font-medium">
                    2 minutes
                  </p>
                </div>
              </Card>
            </div>

            <div className="text-center mt-6">
              <Button
                variant="ghost"
                onClick={handleComplete}
              >
                Skip demo and go to dashboard
              </Button>
            </div>
          </Card>
        ) : demoMode === 'quick' ? (
          // Quick Demo View
          <Card className="p-8 md:p-10 max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <CheckCircle className="w-12 h-12 text-success-600 mx-auto mb-3" />
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                Demo Session Results
              </h2>
            </div>

            <div className="bg-background-secondary rounded-lg p-6 mb-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Client</p>
                  <p className="font-medium">Alex Johnson (Demo)</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Package</p>
                  <p className="font-medium">10 Sessions ($500)</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Session Date</p>
                  <p className="font-medium">Yesterday</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Status</p>
                  <p className="font-medium text-success-600">✓ Client validated</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-secondary">Session value</span>
                  <span className="font-medium">$50</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary">Your commission (50%)</span>
                  <span className="text-xl font-bold text-success-600">$25</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-success-50 rounded-lg">
                <p className="text-sm text-success-700 text-center">
                  Month to date earnings: $25
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => setDemoMode('full')}
              >
                Try it with my email
              </Button>
              <Button onClick={handleComplete}>
                Go to Dashboard
              </Button>
            </div>
          </Card>
        ) : (
          // Full Demo Experience
          <Card className="p-8 md:p-10 max-w-3xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-text-primary mb-2">
                Try the Full Experience
              </h2>
              
              {/* Progress Steps */}
              <div className="flex items-center justify-between mb-6">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step < fullDemoStep ? 'bg-success-600 text-white' :
                      step === fullDemoStep ? 'bg-primary text-white' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {step < fullDemoStep ? '✓' : step}
                    </div>
                    {step < 4 && (
                      <div className={`w-full h-1 ${
                        step < fullDemoStep ? 'bg-success-600' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {fullDemoStep === 1 && (
              <div>
                <h3 className="font-semibold mb-4">Step 1: Create a test client with your email</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Client Name</label>
                    <Input
                      value={`${session?.user?.name} (Test)`}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <Input
                      type="email"
                      value={testClientEmail}
                      onChange={(e) => setTestClientEmail(e.target.value)}
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Package</label>
                    <Input
                      value={demoData?.packages?.[0]?.name || '10 Session Package'}
                      disabled
                    />
                  </div>
                  <Button 
                    onClick={handleCreateTestClient}
                    disabled={isLoading || !testClientEmail}
                    className="w-full"
                  >
                    {isLoading ? 'Creating...' : 'Create Client'}
                  </Button>
                </div>
              </div>
            )}

            {fullDemoStep === 2 && (
              <div>
                <h3 className="font-semibold mb-4">Step 2: Log a session</h3>
                <div className="bg-background-secondary rounded-lg p-4 mb-4">
                  <p className="text-sm text-text-secondary mb-2">Session Details:</p>
                  <div className="space-y-1">
                    <p className="text-sm">Client: {session?.user?.name} (Test)</p>
                    <p className="text-sm">Package: 10 Sessions (9 remaining)</p>
                    <p className="text-sm">Duration: 60 minutes</p>
                    <p className="text-sm">Value: $50</p>
                  </div>
                </div>
                <Button 
                  onClick={handleLogSession}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Logging...' : 'Log Session'}
                </Button>
              </div>
            )}

            {fullDemoStep === 3 && (
              <div>
                <h3 className="font-semibold mb-4">Step 3: Check your email!</h3>
                <div className="text-center py-8">
                  <Mail className="w-16 h-16 text-primary mx-auto mb-4" />
                  <p className="text-text-secondary mb-4">
                    We sent a validation request to <strong>{testClientEmail}</strong>
                  </p>
                  <p className="text-sm text-text-secondary">
                    Click the link in your email to validate the session
                  </p>
                </div>
                <Button 
                  onClick={() => setFullDemoStep(4)}
                  variant="outline"
                  className="w-full"
                >
                  I&apos;ve validated the session
                </Button>
              </div>
            )}

            {fullDemoStep === 4 && (
              <div>
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-success-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Session validated! ✨</h3>
                  <div className="inline-block bg-success-50 rounded-lg p-4 mb-4">
                    <DollarSign className="w-8 h-8 text-success-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-success-700">$25</p>
                    <p className="text-sm text-success-600">Commission earned</p>
                  </div>
                  <p className="text-text-secondary mb-6">
                    This is how your clients will validate their sessions!
                  </p>
                  <Button onClick={handleComplete} size="lg">
                    Awesome! Go to Dashboard
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-md">
                <p className="text-sm text-error-600">{error}</p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}