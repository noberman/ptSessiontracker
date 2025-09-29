'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Loader2, AlertCircle, Shield } from 'lucide-react'

export default function TempLoginPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    
    if (!token) {
      setStatus('error')
      setErrorMessage('No token provided')
      return
    }

    // Handle the temporary token login
    handleTempLogin(token)
  }, [searchParams])

  const handleTempLogin = async (token: string) => {
    try {
      // Sign in with the temp token
      const result = await signIn('temp-token', {
        token,
        redirect: false
      })

      if (result?.error) {
        setStatus('error')
        setErrorMessage(result.error)
      } else if (result?.ok) {
        setStatus('success')
        // Redirect to dashboard after successful login
        setTimeout(() => {
          router.push('/dashboard')
        }, 1000)
      } else {
        setStatus('error')
        setErrorMessage('Login failed')
      }
    } catch (error: any) {
      setStatus('error')
      setErrorMessage(error.message || 'An error occurred during login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          {/* Super Admin Warning Banner */}
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <div className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              <span className="font-semibold">Super Admin Mode</span>
            </div>
            <p className="text-sm mt-1">
              This is a temporary login session for debugging purposes.
            </p>
          </div>

          {status === 'loading' && (
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary-600" />
              <h2 className="text-xl font-semibold mb-2">Authenticating...</h2>
              <p className="text-gray-500">
                Validating temporary access token
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">Login Successful</h2>
              <p className="text-gray-500">
                Redirecting to dashboard...
              </p>
              <p className="text-sm text-gray-400 mt-4">
                Session expires in 1 hour
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Login Failed</h2>
              <p className="text-red-600 mb-4">
                {errorMessage}
              </p>
              <button
                onClick={() => window.close()}
                className="text-sm text-gray-500 underline hover:text-gray-700"
              >
                Close this window
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}