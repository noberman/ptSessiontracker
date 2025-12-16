/**
 * Next.js Instrumentation
 * This file runs once when the server starts
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import monitoring (this auto-initializes it)
    await import('@/lib/monitoring')

    console.log('[INSTRUMENTATION] Server instrumentation registered')
  }
}
