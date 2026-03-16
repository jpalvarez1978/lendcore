/**
 * Utilidad para logging seguro de errores en APIs
 *
 * Proporciona logging detallado en servidor y mensajes genéricos para cliente
 * para evitar exposición de información sensible.
 */

/**
 * Tipos de errores comunes
 */
export type ErrorType =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_API_ERROR'
  | 'INTERNAL_ERROR'

/**
 * Información de contexto para el error
 */
export interface ErrorContext {
  userId?: string
  endpoint?: string
  method?: string
  params?: Record<string, unknown>
  timestamp?: Date
}

/**
 * Log de error en servidor con contexto completo
 *
 * En desarrollo: Muestra stack trace completo
 * En producción: Log estructurado para monitoreo
 *
 * @param error - Error original
 * @param type - Tipo de error
 * @param context - Contexto adicional
 */
export function logServerError(
  error: unknown,
  type: ErrorType,
  context?: ErrorContext
): void {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const timestamp = context?.timestamp || new Date()

  // Estructura base del log
  const logEntry = {
    timestamp: timestamp.toISOString(),
    type,
    endpoint: context?.endpoint,
    method: context?.method,
    userId: context?.userId,
    params: context?.params,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      ...(isDevelopment && { stack: error.stack }),
    } : {
      message: String(error),
    },
  }

  // En desarrollo: Log completo con colores
  if (isDevelopment) {
    console.error('🔴 API Error:', JSON.stringify(logEntry, null, 2))
  } else {
    // En producción: Log estructurado para herramientas de monitoreo
    console.error(JSON.stringify(logEntry))
  }
}

/**
 * Obtiene mensaje de error seguro para el cliente
 *
 * Evita exponer detalles internos de implementación o datos sensibles
 *
 * @param type - Tipo de error
 * @param customMessage - Mensaje personalizado opcional
 * @returns Mensaje genérico seguro para el cliente
 */
export function getClientErrorMessage(
  type: ErrorType,
  customMessage?: string
): string {
  if (customMessage && process.env.NODE_ENV === 'development') {
    return customMessage
  }

  switch (type) {
    case 'VALIDATION_ERROR':
      return 'Los datos proporcionados no son válidos. Por favor, verifica e intenta nuevamente.'

    case 'NOT_FOUND':
      return 'El recurso solicitado no fue encontrado.'

    case 'UNAUTHORIZED':
      return 'No autorizado. Por favor, inicia sesión nuevamente.'

    case 'FORBIDDEN':
      return 'No tienes permisos para realizar esta acción.'

    case 'DATABASE_ERROR':
      return 'Error al procesar la solicitud. Por favor, intenta nuevamente.'

    case 'EXTERNAL_API_ERROR':
      return 'Error de conexión con servicio externo. Por favor, intenta más tarde.'

    case 'INTERNAL_ERROR':
    default:
      return 'Error interno del servidor. Nuestro equipo ha sido notificado.'
  }
}

/**
 * Obtiene código de estado HTTP apropiado para el tipo de error
 *
 * @param type - Tipo de error
 * @returns Código HTTP
 */
export function getErrorStatusCode(type: ErrorType): number {
  switch (type) {
    case 'VALIDATION_ERROR':
      return 400

    case 'UNAUTHORIZED':
      return 401

    case 'FORBIDDEN':
      return 403

    case 'NOT_FOUND':
      return 404

    case 'DATABASE_ERROR':
    case 'EXTERNAL_API_ERROR':
      return 503

    case 'INTERNAL_ERROR':
    default:
      return 500
  }
}

/**
 * Helper todo-en-uno para manejar errores en route handlers
 *
 * Ejemplo de uso:
 * ```typescript
 * try {
 *   // ... código de la API
 * } catch (error) {
 *   return handleApiError(error, {
 *     type: 'DATABASE_ERROR',
 *     context: {
 *       endpoint: '/api/clients',
 *       method: 'POST',
 *       userId: session.user.id,
 *     },
 *   })
 * }
 * ```
 */
export function handleApiError(
  error: unknown,
  options: {
    type: ErrorType
    context?: ErrorContext
    customMessage?: string
  }
): Response {
  // Log completo en servidor
  logServerError(error, options.type, options.context)

  // Mensaje genérico para cliente
  const clientMessage = getClientErrorMessage(options.type, options.customMessage)
  const statusCode = getErrorStatusCode(options.type)

  return Response.json(
    {
      success: false,
      error: clientMessage,
      ...(process.env.NODE_ENV === 'development' && {
        _debug: {
          type: options.type,
          originalError: error instanceof Error ? error.message : String(error),
        },
      }),
    },
    { status: statusCode }
  )
}
