'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Plus, X, Users, Mail } from 'lucide-react'

interface Invitation {
  email: string
  role: 'TRAINER' | 'PT_MANAGER'
}

interface TeamInviteStepProps {
  organizationName: string
  onNext: (data: { invitations: Invitation[] }) => void
  onSkip: () => void
}

export function TeamInviteStep({ organizationName, onNext, onSkip }: TeamInviteStepProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [currentEmail, setCurrentEmail] = useState('')
  const [currentRole, setCurrentRole] = useState<'TRAINER' | 'PT_MANAGER'>('TRAINER')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSkip, setShowSkip] = useState(false)

  // Show skip button after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleAddInvitation = () => {
    if (!currentEmail) return

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(currentEmail)) {
      setError('Please enter a valid email address')
      return
    }

    // Check for duplicates
    if (invitations.some(inv => inv.email === currentEmail)) {
      setError('This email has already been added')
      return
    }

    setInvitations([...invitations, { email: currentEmail, role: currentRole }])
    setCurrentEmail('')
    setError('')
  }

  const handleRemoveInvitation = (index: number) => {
    setInvitations(invitations.filter((_, i) => i !== index))
  }

  const handleBulkPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text')
    const emails = pastedText.split(/[,;\n\t]+/).map(e => e.trim()).filter(Boolean)
    
    if (emails.length > 1) {
      e.preventDefault()
      const validEmails = emails.filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      
      const newInvitations = validEmails
        .filter(email => !invitations.some(inv => inv.email === email))
        .map(email => ({ email, role: currentRole }))
      
      setInvitations([...invitations, ...newInvitations])
      setCurrentEmail('')
      
      if (validEmails.length < emails.length) {
        setError(`Added ${validEmails.length} valid emails. ${emails.length - validEmails.length} were invalid.`)
      }
    }
  }

  const handleSendInvitations = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Send invitations one by one
      const results = await Promise.allSettled(
        invitations.map(inv =>
          fetch('/api/invitations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: inv.email,
              role: inv.role,
            }),
          })
        )
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      
      if (successful > 0) {
        onNext({ invitations })
      } else {
        setError('Failed to send invitations. Please try again.')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleContinue = () => {
    if (invitations.length > 0) {
      handleSendInvitations()
    } else {
      onSkip()
    }
  }

  return (
    <Card className="p-8 md:p-10">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Invite your team members
        </h2>
        <p className="text-text-secondary">
          They&apos;ll receive an email invitation to join {organizationName}
        </p>
        <p className="text-sm text-primary mt-2">
          Free plan includes 2 team members
        </p>
      </div>

      {/* Add Team Member Form */}
      <div className="mb-6">
        <div className="flex gap-2 mb-2">
          <Input
            type="email"
            placeholder="Enter email address"
            value={currentEmail}
            onChange={(e) => setCurrentEmail(e.target.value)}
            onPaste={handleBulkPaste}
            onKeyPress={(e) => e.key === 'Enter' && handleAddInvitation()}
            className="flex-1"
          />
          <select
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value as 'TRAINER' | 'PT_MANAGER')}
            className="px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="TRAINER">Trainer</option>
            <option value="PT_MANAGER">PT Manager</option>
          </select>
          <Button
            type="button"
            onClick={handleAddInvitation}
            disabled={!currentEmail}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-text-secondary">
          Tip: Paste multiple emails from Excel or CSV to add in bulk
        </p>
      </div>

      {/* Invitations List */}
      {invitations.length > 0 && (
        <div className="mb-6">
          <div className="space-y-2">
            {invitations.map((inv, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm">{inv.email}</span>
                  <span className="text-xs bg-primary-100 text-primary px-2 py-1 rounded">
                    {inv.role.replace('_', ' ')}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveInvitation(index)}
                  className="text-text-secondary hover:text-error"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-sm text-text-secondary mt-2">
            {invitations.length} invitation{invitations.length !== 1 ? 's' : ''} ready to send
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-md">
          <p className="text-sm text-error-600">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button
          variant="ghost"
          onClick={onSkip}
          disabled={isLoading}
          className={`transition-opacity ${showSkip ? 'opacity-100' : 'opacity-0'}`}
        >
          Skip for now
        </Button>
        
        <Button
          onClick={handleContinue}
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? 'Sending...' : 
           invitations.length > 0 ? 'Send Invitations & Continue' : 'Continue'}
        </Button>
      </div>
    </Card>
  )
}