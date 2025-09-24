'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress'
import Image from 'next/image'

export default function WelcomePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [selectedReason, setSelectedReason] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const handleContinue = async () => {
    setIsLoading(true)
    
    // Save selected reason for analytics (optional)
    if (selectedReason) {
      try {
        await fetch('/api/onboarding/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: selectedReason }),
        })
      } catch (error) {
        // Non-blocking, just log
        console.log('Failed to save analytics:', error)
      }
    }

    // Save onboarding progress
    localStorage.setItem('onboarding_progress', JSON.stringify({
      currentStep: 2,
      completedSteps: ['welcome'],
      data: { welcomeReason: selectedReason }
    }))

    router.push('/onboarding/team')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <OnboardingProgress currentStep={1} />
        
        <Card className="p-8 md:p-12 max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Welcome to FitSync, {session?.user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-text-secondary">
              Let's get your organization set up in just a few minutes
            </p>
          </div>

          {/* Founder Message */}
          <div className="bg-primary-50 rounded-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">NO</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-text-primary mb-3">
                  Hi, I'm Noah - I built FitSync because I saw how broken commission tracking was in gyms. 
                  As a trainer/manager myself, I experienced the spreadsheet nightmare firsthand.
                </p>
                <p className="text-text-primary mb-3">
                  FitSync is still evolving, and <strong>YOUR feedback shapes what we build next</strong>. 
                  We read every message.
                </p>
                <p className="text-text-secondary text-sm italic">
                  - Noah, Founder
                </p>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => {
                    // This will trigger the feedback widget when implemented
                    if (typeof window !== 'undefined' && (window as any).openFeedbackWidget) {
                      (window as any).openFeedbackWidget()
                    }
                  }}
                >
                  Questions? Message me
                </Button>
              </div>
            </div>
          </div>

          {/* Optional Quick Poll */}
          <div className="mb-8">
            <p className="text-sm font-medium text-text-primary mb-3">
              What brought you to FitSync? (optional)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                'Commission headaches',
                'Client management',
                'Team coordination',
                'Other'
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelectedReason(reason)}
                  className={`
                    p-3 rounded-lg border-2 text-left transition-all
                    ${selectedReason === reason 
                      ? 'border-primary bg-primary-50 text-primary' 
                      : 'border-border hover:border-primary-200 text-text-primary'
                    }
                  `}
                >
                  <span className="text-sm">{reason}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Continue Button */}
          <div className="flex justify-center">
            <Button 
              onClick={handleContinue}
              disabled={isLoading}
              size="lg"
              className="min-w-[200px]"
            >
              {isLoading ? 'Loading...' : 'Continue →'}
            </Button>
          </div>

          {/* Skip text */}
          <p className="text-center text-xs text-text-secondary mt-4">
            Takes less than 5 minutes to complete
          </p>
        </Card>
      </div>
    </div>
  )
}