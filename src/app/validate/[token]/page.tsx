'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface SessionData {
  id: string
  sessionDate: string
  sessionValue: number
  notes?: string
  client: {
    name: string
    email: string
  }
  trainer: {
    name: string
    email: string
  }
  location: {
    name: string
  }
  package?: {
    name: string
    packageType: string
  }
}

interface ValidationState {
  status: 'loading' | 'pending' | 'already_validated' | 'expired' | 'error' | 'success'
  session?: SessionData
  validatedAt?: string
  error?: string
  help?: string
}

export default function ValidateSessionPage() {
  const params = useParams()
  const token = params.token as string
  const [state, setState] = useState<ValidationState>({ status: 'loading' })
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    checkValidationStatus()
  }, [token])

  // Auto-validate if session is pending
  useEffect(() => {
    if (state.status === 'pending' && !validating) {
      handleValidate()
    }
  }, [state.status])

  const checkValidationStatus = async () => {
    try {
      const response = await fetch(`/api/sessions/validate/${token}`)
      const data = await response.json()

      if (!response.ok) {
        setState({ 
          status: 'error', 
          error: data.error || 'Invalid validation link',
          help: data.help || null
        })
        return
      }

      setState({
        status: data.status,
        session: data.session,
        validatedAt: data.validatedAt,
        help: data.help || null,
      })
    } catch (error: any) {
      setState({ 
        status: 'error', 
        error: 'Failed to load session information' 
      })
    }
  }

  const handleValidate = async () => {
    setValidating(true)
    
    try {
      const response = await fetch(`/api/sessions/validate/${token}`, {
        method: 'POST',
      })
      const data = await response.json()

      if (response.ok) {
        setState({
          status: 'success',
          session: state.session,
          validatedAt: data.session.validatedAt,
        })
      } else {
        setState({
          status: 'error',
          error: data.error || 'Failed to validate session',
          session: state.session,
        })
      }
    } catch (error: any) {
      setState({
        status: 'error',
        error: 'Network error. Please try again.',
        session: state.session,
      })
    } finally {
      setValidating(false)
    }
  }

  const formatDate = (dateString: string) => {
    // Debug logging to see what we're receiving
    console.log('Raw dateString received:', dateString)
    const date = new Date(dateString)
    console.log('Parsed Date object:', date.toString())
    console.log('ISO String:', date.toISOString())
    console.log('Local time:', date.toLocaleString())
    
    // Format the date and time properly
    const dateFormatted = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const timeFormatted = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    return `${dateFormatted} at ${timeFormatted}`
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-background-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-text-secondary">Loading session information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-secondary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary">PT Session Tracker</h1>
          <p className="mt-2 text-text-secondary">Session Validation</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {state.status === 'pending' && 'Confirm Your Training Session'}
              {state.status === 'already_validated' && '✅ Session Already Validated'}
              {state.status === 'expired' && '⚠️ Validation Link Expired'}
              {state.status === 'error' && '❌ Validation Error'}
              {state.status === 'success' && '✅ Session Validated Successfully'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {state.session && (
              <div className="space-y-4 mb-6">
                <div className="bg-background-secondary rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">Date & Time:</span>
                    <span className="text-sm font-medium text-text-primary">
                      {formatDate(state.session.sessionDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">Trainer:</span>
                    <span className="text-sm font-medium text-text-primary">
                      {state.session.trainer.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">Location:</span>
                    <span className="text-sm font-medium text-text-primary">
                      {state.session.location.name}
                    </span>
                  </div>
                  {state.session.package && (
                    <div className="flex justify-between">
                      <span className="text-sm text-text-secondary">Package:</span>
                      <span className="text-sm font-medium text-text-primary">
                        {state.session.package.name}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-text-secondary">Session Value:</span>
                    <span className="text-sm font-medium text-text-primary">
                      {formatCurrency(state.session.sessionValue)}
                    </span>
                  </div>
                  {state.session.notes && (
                    <div className="pt-2 border-t">
                      <span className="text-sm text-text-secondary">Notes:</span>
                      <p className="text-sm text-text-primary mt-1">{state.session.notes}</p>
                    </div>
                  )}
                </div>

                {state.status === 'pending' && (
                  <>
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                      <p className="text-sm text-text-secondary mb-4">
                        Confirming your training session with {state.session.trainer.name}...
                      </p>
                      <p className="text-xs text-text-secondary">
                        Please wait while we validate your session.
                      </p>
                    </div>
                  </>
                )}

                {state.status === 'already_validated' && state.validatedAt && (
                  <div className="text-center">
                    <p className="text-sm text-success-600 mb-2">
                      This session was validated on {formatDate(state.validatedAt)}
                    </p>
                    <p className="text-sm text-text-secondary">
                      No further action is required.
                    </p>
                  </div>
                )}

                {state.status === 'expired' && (
                  <div className="text-center">
                    <p className="text-sm text-warning-600 mb-2">
                      This validation link has expired.
                    </p>
                    <p className="text-sm text-text-secondary">
                      Please contact your trainer or gym management for assistance.
                    </p>
                  </div>
                )}

                {state.status === 'success' && (
                  <div className="text-center">
                    <div className="mb-4">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-success-100">
                        <svg className="h-6 w-6 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-sm text-success-600 mb-2">
                      Thank you for confirming your session!
                    </p>
                    <p className="text-sm text-text-secondary">
                      Your session has been validated successfully.
                    </p>
                  </div>
                )}
              </div>
            )}

            {state.status === 'error' && (
              <div className="text-center">
                <p className="text-sm text-error-600 mb-2">
                  {state.error}
                </p>
                {state.help && (
                  <p className="text-sm text-text-secondary mb-2">
                    {state.help}
                  </p>
                )}
                {!state.help && (
                  <p className="text-sm text-text-secondary">
                    Please contact support if you need assistance.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-xs text-text-secondary">
            © {new Date().getFullYear()} PT Session Tracker. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}