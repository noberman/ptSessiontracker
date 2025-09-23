'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { X, Mail, UserPlus, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface InviteModalProps {
  organizationId: string
  isOpen?: boolean
  onClose?: () => void
}

export default function InviteModal({ 
  organizationId, 
  isOpen = false,
  onClose 
}: InviteModalProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'TRAINER' | 'PT_MANAGER' | 'CLUB_MANAGER'>('TRAINER')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [bulkEmails, setBulkEmails] = useState<string[]>([])
  const [bulkMode, setBulkMode] = useState(false)

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const detectBulkPaste = (value: string) => {
    // Check if the pasted content has multiple emails
    const potentialEmails = value.split(/[\n,;|\t]+/).map(e => e.trim()).filter(Boolean)
    if (potentialEmails.length > 1) {
      const validEmails = potentialEmails.filter(validateEmail)
      if (validEmails.length > 0) {
        setBulkEmails(validEmails)
        setBulkMode(true)
        setEmail('')
        return true
      }
    }
    return false
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text')
    if (detectBulkPaste(pastedText)) {
      e.preventDefault()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const emailsToInvite = bulkMode ? bulkEmails : [email]

    // Validate emails
    for (const emailToCheck of emailsToInvite) {
      if (!validateEmail(emailToCheck)) {
        setError(`Invalid email address: ${emailToCheck}`)
        return
      }
    }

    setLoading(true)

    try {
      let successCount = 0
      let failedEmails: string[] = []

      for (const emailToInvite of emailsToInvite) {
        const response = await fetch('/api/invitations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: emailToInvite,
            role,
          }),
        })

        const data = await response.json()

        if (response.ok) {
          successCount++
        } else {
          failedEmails.push(`${emailToInvite}: ${data.error}`)
        }
      }

      if (successCount > 0) {
        setSuccess(true)
        if (bulkMode) {
          setBulkEmails([])
          setBulkMode(false)
        } else {
          setEmail('')
        }
        
        // Close modal after a short delay
        setTimeout(() => {
          router.refresh()
          if (onClose) onClose()
        }, 2000)
      }

      if (failedEmails.length > 0) {
        setError(failedEmails.join('\n'))
      }
    } catch (err) {
      setError('Failed to send invitation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const removeEmail = (emailToRemove: string) => {
    setBulkEmails(bulkEmails.filter(e => e !== emailToRemove))
    if (bulkEmails.length <= 1) {
      setBulkMode(false)
      setEmail(bulkEmails[0] || '')
    }
  }

  if (!isOpen) {
    return null
  }

  const handleClose = () => {
    if (onClose) onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-md w-full mx-4 relative">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-text-primary">
                  Invite Team Member{bulkMode ? 's' : ''}
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="text-text-secondary hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Email Input */}
              {!bulkMode ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Email Address
                  </label>
                  <textarea
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onPaste={handlePaste}
                    placeholder="Enter email or paste multiple emails"
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    rows={1}
                    required
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    Tip: Paste multiple emails from Excel or CSV to invite in bulk
                  </p>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Email Addresses ({bulkEmails.length})
                  </label>
                  <div className="border border-border rounded-md p-2 max-h-32 overflow-y-auto">
                    {bulkEmails.map((email) => (
                      <div key={email} className="flex items-center justify-between py-1">
                        <span className="text-sm">{email}</span>
                        <button
                          type="button"
                          onClick={() => removeEmail(email)}
                          className="text-error hover:text-error-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkMode(false)
                      setEmail('')
                      setBulkEmails([])
                    }}
                    className="text-sm text-primary hover:underline mt-1"
                  >
                    Switch to single invitation
                  </button>
                </div>
              )}

              {/* Role Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="TRAINER">Trainer</option>
                  <option value="PT_MANAGER">PT Manager</option>
                  <option value="CLUB_MANAGER">Club Manager</option>
                </select>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-error-600 mt-0.5" />
                    <div className="text-sm text-error-600 whitespace-pre-line">{error}</div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="mb-4 p-3 bg-success-50 border border-success-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-success-600" />
                    <span className="text-sm text-success-600">
                      Invitation{bulkEmails.length > 1 ? 's' : ''} sent successfully!
                    </span>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Sending...' : `Send Invitation${bulkMode ? 's' : ''}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}