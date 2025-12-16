/**
 * Monitoring utilities for diagnosing production crashes
 *
 * Hypotheses being tested:
 * 1. Memory leak - memory grows until process is killed
 * 2. Database connection exhaustion
 * 3. Unhandled promise rejections
 * 4. Event loop blocking / slow requests
 */

// Only run monitoring in production
const isProduction = process.env.NODE_ENV === 'production'

// Track if monitoring has been initialized (prevent duplicates)
let monitoringInitialized = false

// Memory usage history for trend detection
const memoryHistory: { timestamp: Date; heapUsed: number; rss: number }[] = []
const MAX_HISTORY = 60 // Keep last 60 samples

/**
 * Log memory usage with trend analysis
 */
function logMemoryUsage() {
  const mem = process.memoryUsage()
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024)
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024)
  const rssMB = Math.round(mem.rss / 1024 / 1024)
  const externalMB = Math.round(mem.external / 1024 / 1024)

  // Add to history
  memoryHistory.push({
    timestamp: new Date(),
    heapUsed: heapUsedMB,
    rss: rssMB,
  })

  // Keep only last N samples
  if (memoryHistory.length > MAX_HISTORY) {
    memoryHistory.shift()
  }

  // Calculate trend (if we have enough data)
  let trend = ''
  if (memoryHistory.length >= 5) {
    const recent = memoryHistory.slice(-5)
    const oldest = recent[0].heapUsed
    const newest = recent[recent.length - 1].heapUsed
    const diff = newest - oldest

    if (diff > 50) {
      trend = '📈 RISING FAST (+' + diff + 'MB in 5 samples)'
    } else if (diff > 20) {
      trend = '📈 Rising (+' + diff + 'MB)'
    } else if (diff < -20) {
      trend = '📉 Falling (' + diff + 'MB)'
    } else {
      trend = '➡️ Stable'
    }
  }

  // Warning thresholds
  const warnings: string[] = []
  if (heapUsedMB > 500) warnings.push('⚠️ HIGH HEAP')
  if (rssMB > 1000) warnings.push('⚠️ HIGH RSS')
  if (rssMB > 2000) warnings.push('🚨 CRITICAL RSS - CRASH IMMINENT')

  console.log(
    `[MONITOR] Memory: Heap ${heapUsedMB}/${heapTotalMB}MB | RSS ${rssMB}MB | External ${externalMB}MB | ${trend} ${warnings.join(' ')}`
  )

  // If memory is critically high, log a detailed dump
  if (rssMB > 1500) {
    console.log('[MONITOR] 🚨 CRITICAL MEMORY WARNING - Full dump:')
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      memory: mem,
      memoryMB: { heapUsed: heapUsedMB, heapTotal: heapTotalMB, rss: rssMB, external: externalMB },
      uptime: process.uptime(),
      history: memoryHistory.slice(-10),
    }, null, 2))
  }
}

/**
 * Log event loop lag (detects blocking operations)
 */
let lastLoopCheck = Date.now()
function checkEventLoopLag() {
  const now = Date.now()
  const expectedInterval = 5000 // We check every 5 seconds
  const actualInterval = now - lastLoopCheck
  const lag = actualInterval - expectedInterval

  lastLoopCheck = now

  if (lag > 1000) {
    console.log(`[MONITOR] ⚠️ EVENT LOOP LAG: ${lag}ms (expected ${expectedInterval}ms, actual ${actualInterval}ms)`)
  } else if (lag > 100) {
    console.log(`[MONITOR] Event loop lag: ${lag}ms`)
  }
}

/**
 * Setup unhandled error catching
 */
function setupErrorHandlers() {
  process.on('uncaughtException', (error) => {
    console.error('[MONITOR] 🚨 UNCAUGHT EXCEPTION:', error.message)
    console.error('[MONITOR] Stack:', error.stack)
    console.error('[MONITOR] Memory at crash:', JSON.stringify(process.memoryUsage()))
    // Don't exit - let the process continue or let Railway handle it
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[MONITOR] 🚨 UNHANDLED REJECTION:', reason)
    console.error('[MONITOR] Promise:', promise)
    console.error('[MONITOR] Memory at rejection:', JSON.stringify(process.memoryUsage()))
  })

  // Catch SIGTERM (what Railway sends before killing)
  process.on('SIGTERM', () => {
    console.log('[MONITOR] 🛑 SIGTERM RECEIVED - Railway is killing the process')
    console.log('[MONITOR] Final memory state:', JSON.stringify(process.memoryUsage()))
    console.log('[MONITOR] Process uptime:', process.uptime(), 'seconds')
    console.log('[MONITOR] Memory history (last 10):', JSON.stringify(memoryHistory.slice(-10)))

    // Give time for logs to flush
    setTimeout(() => {
      process.exit(0)
    }, 1000)
  })

  process.on('SIGINT', () => {
    console.log('[MONITOR] 🛑 SIGINT RECEIVED')
    process.exit(0)
  })
}

/**
 * Log startup info
 */
function logStartup() {
  console.log('[MONITOR] ========================================')
  console.log('[MONITOR] 🚀 Application starting')
  console.log('[MONITOR] Environment:', process.env.NODE_ENV)
  console.log('[MONITOR] Node version:', process.version)
  console.log('[MONITOR] Platform:', process.platform)
  console.log('[MONITOR] PID:', process.pid)
  console.log('[MONITOR] Initial memory:', JSON.stringify(process.memoryUsage()))
  console.log('[MONITOR] ========================================')
}

/**
 * Initialize all monitoring
 * Call this once at app startup
 */
export function initMonitoring() {
  if (monitoringInitialized) {
    console.log('[MONITOR] Already initialized, skipping')
    return
  }

  monitoringInitialized = true

  logStartup()
  setupErrorHandlers()

  // Only run periodic monitoring in production to avoid noise in dev
  if (isProduction) {
    // Log memory every 60 seconds
    setInterval(logMemoryUsage, 60 * 1000)

    // Check event loop lag every 5 seconds
    setInterval(checkEventLoopLag, 5 * 1000)

    // Initial memory log
    logMemoryUsage()

    console.log('[MONITOR] ✅ Production monitoring active - logging every 60s')
  } else {
    console.log('[MONITOR] Development mode - periodic logging disabled')
  }
}

/**
 * Middleware helper to log slow requests
 * Usage: wrap your API handlers
 */
export function withRequestLogging<T>(
  handler: () => Promise<T>,
  context: { route: string; method: string }
): Promise<T> {
  const start = Date.now()

  return handler()
    .then((result) => {
      const duration = Date.now() - start
      if (duration > 1000) {
        console.log(`[MONITOR] ⚠️ SLOW REQUEST: ${context.method} ${context.route} took ${duration}ms`)
      } else if (duration > 500) {
        console.log(`[MONITOR] Slow request: ${context.method} ${context.route} took ${duration}ms`)
      }
      return result
    })
    .catch((error) => {
      const duration = Date.now() - start
      console.error(`[MONITOR] ❌ REQUEST FAILED: ${context.method} ${context.route} after ${duration}ms:`, error.message)
      throw error
    })
}

/**
 * Log database query timing
 */
export function logDbQuery(operation: string, duration: number, details?: string) {
  if (duration > 1000) {
    console.log(`[MONITOR] ⚠️ SLOW DB QUERY: ${operation} took ${duration}ms ${details || ''}`)
  } else if (duration > 500 && isProduction) {
    console.log(`[MONITOR] Slow DB query: ${operation} took ${duration}ms`)
  }
}

// Auto-initialize when this module is imported
initMonitoring()
