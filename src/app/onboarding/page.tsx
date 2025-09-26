'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import { Button } from '@/components/ui/Button'
import { LogOut } from 'lucide-react'

// Import step components (we'll create these next)
import { OrgSetupStep } from '@/components/onboarding/steps/OrgSetupStep'
import { WelcomeStep } from '@/components/onboarding/steps/WelcomeStep'
import { TeamInviteStep } from '@/components/onboarding/steps/TeamInviteStep'
import { PackageSetupStep } from '@/components/onboarding/steps/PackageSetupStep'
import { CommissionSetupStep } from '@/components/onboarding/steps/CommissionSetupStep'
import { BillingStep } from '@/components/onboarding/steps/BillingStep'
import { DemoStep } from '@/components/onboarding/steps/DemoStep'

interface OnboardingData {
  organizationName?: string
  locationName?: string
  welcomePoll?: string
  invitations?: Array<{ email: string; role: string }>
  packages?: Array<{ name: string; sessions: number; price: number }>
  commissionMethod?: string
  commissionTiers?: Array<{ min: number; max?: number; percentage: number }>
  demoChoice?: 'quick' | 'full'
}

export default function OnboardingWizard() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  
  // Determine starting step based on whether user has org
  const [currentStep, setCurrentStep] = useState(() => {
    // Google users without org start at step 1
    // Email signup users (with org) start at step 2
    return 1 // Default to 1, will update when session loads
  })
  
  const [wizardData, setWizardData] = useState<OnboardingData>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Block dashboard access until essentials complete
  const essentialStepsComplete = currentStep > 5 // After commission setup

  // Initialize onboarding state
  useEffect(() => {
    // Wait for session to load
    if (status === 'loading') {
      return
    }

    if (!session?.user) {
      return
    }
    
    // Initialize step based on organization status
    if (!isInitialized) {
      // Users with existing org skip step 1 (org setup) and start at step 2 (welcome)
      const hasOrganization = !!session.user.organizationId
      console.log('🔵 User has organization:', hasOrganization, 'Org ID:', session.user.organizationId)
      
      const initialStep = hasOrganization ? 2 : 1
      
      // Restore progress from localStorage
      const savedProgress = localStorage.getItem('onboarding_state')
      if (savedProgress) {
        try {
          const progress = JSON.parse(savedProgress)
          // Check if this saved state is for the current user
          // If the saved email doesn't match current user, clear it
          if (progress.userEmail && progress.userEmail !== session.user.email) {
            console.log('🔵 Clearing localStorage - different user detected')
            console.log('   Saved email:', progress.userEmail, 'Current email:', session.user.email)
            localStorage.removeItem('onboarding_state')
            setCurrentStep(initialStep)
            setWizardData({})
          } else {
            // Make sure we don't go back to step 1 if user has org
            const minStep = hasOrganization ? 2 : 1
            const restoredStep = Math.max(progress.currentStep || initialStep, minStep)
            console.log('🔵 Restoring saved progress - Step:', restoredStep)
            setCurrentStep(restoredStep)
            setWizardData(progress.data || {})
          }
        } catch (e) {
          console.error('Error parsing saved progress:', e)
          localStorage.removeItem('onboarding_state')
          setCurrentStep(initialStep)
        }
      } else {
        console.log('🔵 No saved progress - Starting at step:', initialStep)
        setCurrentStep(initialStep)
      }
      
      setIsInitialized(true)
    }
  }, [session, status, isInitialized])

  // Save progress to localStorage
  useEffect(() => {
    if (wizardData && Object.keys(wizardData).length > 0 && session?.user?.email) {
      localStorage.setItem('onboarding_state', JSON.stringify({
        currentStep,
        data: wizardData,
        userEmail: session.user.email // Save user email to detect user changes
      }))
    }
  }, [currentStep, wizardData, session?.user?.email])

  const handleNext = (data?: Partial<OnboardingData>) => {
    console.log('🔵 handleNext called - current step:', currentStep, 'data:', data)
    if (data) {
      setWizardData(prev => ({ ...prev, ...data }))
    }
    const nextStep = currentStep + 1
    console.log('🔵 Moving to step:', nextStep)
    setCurrentStep(nextStep)
  }

  const handleBack = () => {
    console.log('🔵 handleBack called - current step:', currentStep)
    // If user has organization, don't go back to step 1
    const minStep = session?.user?.organizationId ? 2 : 1
    const prevStep = Math.max(minStep, currentStep - 1)
    console.log('🔵 Moving back to step:', prevStep, 'Min step:', minStep)
    setCurrentStep(prevStep)
  }

  const handleSkip = () => {
    console.log('🔵 handleSkip called - current step:', currentStep)
    const nextStep = currentStep + 1
    console.log('🔵 Skipping to step:', nextStep)
    setCurrentStep(nextStep)
  }

  const handleComplete = async () => {
    console.log('🔵 handleComplete called - wizardData:', wizardData)
    setIsLoading(true)
    try {
      // Mark onboarding as complete
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wizardData)
      })

      if (!response.ok) throw new Error('Failed to complete onboarding')

      // Update session to reflect completion
      await update()
      
      // Clear localStorage
      localStorage.removeItem('onboarding_state')
      
      // Navigate to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Error completing onboarding:', error)
      setIsLoading(false)
    }
  }

  // Debug logging
  useEffect(() => {
    console.log('🔵 Current step changed to:', currentStep)
  }, [currentStep])

  // Show loading state while checking session
  if (status === 'loading' || !isInitialized) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-primary-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading onboarding...</p>
        </div>
      </div>
    )
  }

  // Don't render if no session
  if (!session?.user) {
    console.log('🔴 No session found, returning null')
    return null
  }

  console.log('🔵 Rendering step:', currentStep)
  
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary-50 to-white">
      {/* Progress indicator always visible at top */}
      <div className="absolute top-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between">
          <OnboardingProgress currentStep={currentStep} totalSteps={7} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-gray-600 hover:text-gray-800"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="h-full pt-32 pb-24 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-4xl mx-auto px-4"
          >
            {currentStep === 1 && !session.user.organizationId && (
              <OrgSetupStep onNext={handleNext} />
            )}
            {/* Auto-skip step 1 if user has org but somehow ended up on step 1 */}
            {currentStep === 1 && session.user.organizationId && (
              <div>
                {(() => {
                  console.log('🔵 User has org but on step 1, auto-advancing to step 2')
                  setTimeout(() => setCurrentStep(2), 0)
                  return null
                })()}
              </div>
            )}
            {currentStep === 2 && (
              <WelcomeStep 
                adminName={session.user.name || 'there'} 
                organizationName={wizardData.organizationName || session.user.organizationName || ''}
                onNext={handleNext} 
              />
            )}
            {currentStep === 3 && (
              <TeamInviteStep 
                organizationName={wizardData.organizationName || session.user.organizationName || ''}
                onNext={handleNext} 
                onSkip={handleSkip} 
              />
            )}
            {currentStep === 4 && (
              <PackageSetupStep onNext={handleNext} onSkip={handleSkip} />
            )}
            {currentStep === 5 && (
              <CommissionSetupStep onNext={handleNext} />
            )}
            {currentStep === 6 && (
              <BillingStep onNext={handleNext} />
            )}
            {currentStep === 7 && (
              <DemoStep onComplete={handleComplete} isLoading={isLoading} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Navigation controls fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <Button variant="ghost" onClick={handleBack} disabled={isLoading}>
                ← Back
              </Button>
            )}
          </div>
          
          {!essentialStepsComplete && (
            <p className="text-sm text-gray-500">
              Complete setup to access your dashboard
            </p>
          )}
          
          {currentStep === 7 && essentialStepsComplete && (
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                console.log('🔵 Skip demo clicked')
                console.log('🔵 Current URL:', window.location.href)
                console.log('🔵 essentialStepsComplete:', essentialStepsComplete)
                console.log('🔵 currentStep:', currentStep)
                console.log('🔵 Marking onboarding as complete first...')
                
                try {
                  // First mark onboarding as complete
                  const response = await fetch('/api/onboarding/complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ skippedDemo: true })
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
                  
                  console.log('🔵 Attempting to navigate to: /dashboard')
                  
                  // Now navigate to dashboard
                  window.location.href = '/dashboard'
                  console.log('🔵 Navigation command executed')
                } catch (error) {
                  console.error('Error completing onboarding:', error)
                }
              }}
              disabled={isLoading}
            >
              Skip demo and go to dashboard →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}