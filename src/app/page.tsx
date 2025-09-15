import { headers } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LandingPage from '@/components/LandingPage'

export default async function Home() {
  const headersList = await headers()
  const hostname = headersList.get('host') || ''
  
  // Debug logging for staging
  if (hostname.includes('staging') || hostname.includes('railway')) {
    console.log('=== ROOT PAGE DEBUG (staging) ===')
    console.log('Hostname:', hostname)
    console.log('NODE_ENV:', process.env.NODE_ENV)
  }
  
  // Check if we're on the app subdomain
  const isOnStagingDomain = hostname.includes('staging') || hostname.includes('railway')
  
  // For staging: always show landing page at root
  // For production: check if app subdomain
  const isAppDomain = !isOnStagingDomain && (hostname.includes('app.') || hostname.includes('localhost') || hostname.includes('127.0.0.1'))
  
  if (isAppDomain) {
    // App subdomain behavior - redirect to dashboard or login
    const session = await getServerSession(authOptions)
    
    if (session) {
      redirect('/dashboard')
    } else {
      redirect('/login')
    }
  } else {
    // Landing domain or staging - show landing page
    return <LandingPage />
  }
}