'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Sparkles } from 'lucide-react'

interface WelcomeStepProps {
  adminName: string
  organizationName: string
  onNext: (data?: { welcomePoll?: string }) => void
}

export function WelcomeStep({ adminName, organizationName, onNext }: WelcomeStepProps) {
  console.log('🟢 WelcomeStep rendered - VERSION: NO POLL, NO MESSAGE BUTTON')
  console.log('🟢 Component location: src/components/onboarding/steps/WelcomeStep.tsx')
  
  const handleContinue = () => {
    console.log('🟢 Continue clicked in WelcomeStep')
    onNext()
  }

  return (
    <Card className="p-8 md:p-10">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold text-text-primary mb-4">
          Welcome to FitSync, {adminName}! 👋
        </h2>
      </div>

      <div className="bg-background-secondary rounded-lg p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <p className="text-text-primary mb-4">
              Hi, I&apos;m Noah - I built FitSync because I saw how broken 
              commission tracking was in gyms. As a trainer/manager myself, 
              I experienced the spreadsheet nightmare firsthand.
            </p>
            <p className="text-text-primary mb-4">
              FitSync is still evolving, and YOUR feedback shapes what 
              we build next. We read every message.
            </p>
            <p className="text-text-primary font-medium">
              Let&apos;s get {organizationName} set up!
            </p>
            <p className="text-sm text-text-secondary mt-2">
              - Noah, Founder
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          size="lg"
        >
          Continue →
        </Button>
      </div>
    </Card>
  )
}