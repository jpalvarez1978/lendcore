/**
 * Logger Utility - Sistema de logging centralizado
 *
 * Características:
 * - Niveles de log (debug, info, warn, error)
 * - Metadata estructurada
 * - Timestamps
 * - Contexto de usuario/request
 * - Preparado para integración con servicios externos
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  userId?: string
  requestId?: string
  action?: string
  entityType?: string
  entityId?: string
  ip?: string
  userAgent?: string
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

// Configuración según entorno
const LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * Determina si un nivel de log debe ser mostrado
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL]
}

/**
 * Formatea una entrada de log
 */
function formatLogEntry(entry: LogEntry): string {
  if (IS_PRODUCTION) {
    // En producción, usar JSON estructurado para mejor parsing
    return JSON.stringify(entry)
  }

  // En desarrollo, formato legible
  const { timestamp, level, message, context, error } = entry
  let output = `[${timestamp}] ${level.toUpperCase()}: ${message}`

  if (context && Object.keys(context).length > 0) {
    output += ` | ${JSON.stringify(context)}`
  }

  if (error) {
    output += `\n  Error: ${error.name}: ${error.message}`
    if (error.stack) {
      output += `\n  Stack: ${error.stack.split('\n').slice(1, 4).join('\n  ')}`
    }
  }

  return output
}

/**
 * Escribe el log a la salida correspondiente
 */
function writeLog(level: LogLevel, entry: LogEntry): void {
  const formattedLog = formatLogEntry(entry)

  switch (level) {
    case 'debug':
    case 'info':
      console.log(formattedLog)
      break
    case 'warn':
      console.warn(formattedLog)
      break
    case 'error':
      console.error(formattedLog)
      break
  }

  // Aquí puedes agregar integraciones externas
  // Ejemplo: enviar a un servicio de logging como DataDog, LogRocket, etc.
  if (IS_PRODUCTION && level === 'error') {
    // TODO: Integrar con servicio de error tracking
    // Sentry.captureException(entry.error)
    // DataDog.log(entry)
  }
}

/**
 * Logger principal
 */
export const logger = {
  /**
   * Log de debug - Solo en desarrollo
   */
  debug(message: string, context?: LogContext): void {
    if (!shouldLog('debug')) return

    writeLog('debug', {
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context,
    })
  },

  /**
   * Log informativo
   */
  info(message: string, context?: LogContext): void {
    if (!shouldLog('info')) return

    writeLog('info', {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
    })
  },

  /**
   * Log de advertencia
   */
  warn(message: string, context?: LogContext): void {
    if (!shouldLog('warn')) return

    writeLog('warn', {
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
    })
  },

  /**
   * Log de error
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!shouldLog('error')) return

    const errorInfo = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : error
        ? { name: 'Unknown', message: String(error) }
        : undefined

    writeLog('error', {
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
      error: errorInfo,
    })
  },

  /**
   * Crea un logger con contexto predefinido
   */
  withContext(baseContext: LogContext) {
    return {
      debug: (message: string, context?: LogContext) =>
        logger.debug(message, { ...baseContext, ...context }),
      info: (message: string, context?: LogContext) =>
        logger.info(message, { ...baseContext, ...context }),
      warn: (message: string, context?: LogContext) =>
        logger.warn(message, { ...baseContext, ...context }),
      error: (message: string, error?: Error | unknown, context?: LogContext) =>
        logger.error(message, error, { ...baseContext, ...context }),
    }
  },

  /**
   * Log de acción de usuario (auditoría ligera)
   */
  action(action: string, context: LogContext): void {
    logger.info(`User action: ${action}`, { action, ...context })
  },

  /**
   * Log de performance
   */
  performance(operation: string, durationMs: number, context?: LogContext): void {
    const level: LogLevel = durationMs > 1000 ? 'warn' : 'info'
    const message = `Performance: ${operation} completed in ${durationMs}ms`

    if (level === 'warn') {
      logger.warn(message, { operation, durationMs, ...context })
    } else {
      logger.info(message, { operation, durationMs, ...context })
    }
  },
}

/**
 * Timer para medir duración de operaciones
 */
export function createTimer(operation: string, context?: LogContext) {
  const start = Date.now()

  return {
    end: () => {
      const duration = Date.now() - start
      logger.performance(operation, duration, context)
      return duration
    },
  }
}

/**
 * Wrapper para funciones async con logging automático
 */
export async function withLogging<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const timer = createTimer(operation, context)

  try {
    const result = await fn()
    timer.end()
    return result
  } catch (error) {
    timer.end()
    logger.error(`Operation failed: ${operation}`, error, context)
    throw error
  }
}
