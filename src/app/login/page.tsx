'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showTestCredentials, setShowTestCredentials] = useState(false)
  
  useEffect(() => {
    // Debug logging for staging
    if (typeof window !== 'undefined' && 
        (window.location.hostname.includes('staging') || window.location.hostname.includes('railway'))) {
      console.log('=== LOGIN PAGE DEBUG (staging) ===')
      console.log('Hostname:', window.location.hostname)
      console.log('Full URL:', window.location.href)
    }
    // Only show test credentials if NOT in production
    // Check if URL contains 'staging' or if we're on localhost
    const isProduction = typeof window !== 'undefined' && 
      !window.location.hostname.includes('staging') && 
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1')
    
    setShowTestCredentials(!isProduction)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    console.log('🚀 LOGIN: Starting login attempt')
    console.log('📧 LOGIN: Email:', email)
    console.log('🌍 LOGIN: Current URL:', window.location.href)
    console.log('🔗 LOGIN: NextAuth endpoint:', '/api/auth/callback/credentials')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      console.log('📨 LOGIN: SignIn result:', result)
      console.log('❓ LOGIN: Has error?', !!result?.error)
      console.log('✅ LOGIN: OK status?', result?.ok)
      console.log('🔗 LOGIN: Result URL:', result?.url)

      if (result?.error) {
        console.log('❌ LOGIN: Authentication failed:', result.error)
        setError('Invalid email or password')
      } else {
        console.log('✅ LOGIN: Authentication successful, redirecting...')
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error) {
      console.error('💥 LOGIN: Exception during sign in:', error)
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-secondary">
      <Card className="w-full max-w-md space-y-8" padding="xl">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Image 
              src="/Logo-Icon.svg" 
              alt="FitSync" 
              width={200} 
              height={60}
              className="h-16 w-auto"
              priority
            />
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            Personal Training Session Tracker
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            Sign in to manage your fitness business
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-lg bg-error-50 border border-error-200 p-4">
              <p className="text-sm text-error-700">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        {showTestCredentials && (
          <div className="mt-6 rounded-lg bg-background-secondary border border-border-light p-4">
            <p className="text-xs text-text-secondary mb-2 font-medium">Test Credentials:</p>
            <div className="space-y-1 text-xs text-text-secondary">
              <p><strong className="text-text-primary">Admin:</strong> admin@ptsession.com / admin123</p>
              <p><strong className="text-text-primary">Manager:</strong> manager@woodsquare.com / manager123</p>
              <p><strong className="text-text-primary">Trainer:</strong> john@woodsquare.com / trainer123</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}