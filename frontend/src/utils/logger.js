/**
 * Frontend Logger — simple logging utility for monitoring
 * Logs to console and can be extended to send to backend
 */

const isDev = import.meta.env.DEV

export const logger = {
  /**
   * Log info level
   */
  info: (message, data = {}) => {
    if (isDev) console.log(`[INFO] ${message}`, data)
    else sendLog('info', message, data)
  },

  /**
   * Log warning level
   */
  warn: (message, data = {}) => {
    if (isDev) console.warn(`[WARN] ${message}`, data)
    else sendLog('warning', message, data)
  },

  /**
   * Log error level
   */
  error: (message, error = {}) => {
    console.error(`[ERROR] ${message}`, error)
    sendLog('error', message, {
      error_message: error.message,
      error_stack: error.stack,
    })
  },

  /**
   * Log critical error
   */
  critical: (message, error = {}) => {
    console.error(`[CRITICAL] ${message}`, error)
    sendLog('critical', message, {
      error_message: error.message,
      error_stack: error.stack,
    })
  },
}

/**
 * Send log to backend (optional — currently just logs to console)
 */
function sendLog(level, message, data) {
  // Send to backend if needed (e.g., logging service)
  // This is placeholder for future logging service integration
  const timestamp = new Date().toISOString()
  const logEntry = { timestamp, level, message, data }

  if (level === 'error' || level === 'critical') {
    // For errors, you could send to backend in production
    console.error('[LOG_ENTRY]', logEntry)
  }
}

export default logger
