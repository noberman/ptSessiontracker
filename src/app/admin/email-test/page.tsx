'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export default function EmailTestPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null)

  const handleSendTest = async () => {
    if (!email) {
      setResult({ error: 'Please enter an email address' })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message })
      } else {
        setResult({ error: data.error || 'Failed to send test email' })
      }
    } catch (error: any) {
      setResult({ error: error.message || 'Network error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-secondary">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Email Configuration Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-text-secondary mb-4">
                Send a test email to verify your email configuration is working correctly.
                This feature is only available to administrators.
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
                Test Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="test@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            {result && (
              <div className={`rounded-lg p-4 ${
                result.success 
                  ? 'bg-success-50 border border-success-200' 
                  : 'bg-error-50 border border-error-200'
              }`}>
                <p className={`text-sm ${
                  result.success ? 'text-success-700' : 'text-error-700'
                }`}>
                  {result.success ? '✅ ' : '❌ '}
                  {result.message || result.error}
                </p>
              </div>
            )}

            <div className="bg-background-secondary rounded-lg p-4">
              <h4 className="text-sm font-medium text-text-primary mb-2">
                Configuration Status:
              </h4>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>• Environment: {process.env.NODE_ENV || 'development'}</li>
                <li>• Email Service: Resend</li>
                <li>• From: {process.env.RESEND_FROM_EMAIL || 'Not configured'}</li>
                <li>• API Key: {process.env.RESEND_API_KEY ? '✅ Configured' : '❌ Not configured'}</li>
              </ul>
            </div>

            <Button
              onClick={handleSendTest}
              disabled={loading || !email}
              className="w-full"
            >
              {loading ? 'Sending...' : 'Send Test Email'}
            </Button>

            <div className="text-xs text-text-secondary">
              <p>Note: In development mode without an API key, emails will be logged to the console instead of being sent.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}