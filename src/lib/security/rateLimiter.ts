/**
 * Rate Limiter - Control de Límite de Peticiones
 *
 * Previene:
 * - Ataques de fuerza bruta en login
 * - Spam de peticiones
 * - Abuso de APIs
 * - DDoS básicos
 */

interface RateLimitEntry {
  count: number
  resetAt: Date
  blockedUntil?: Date
}

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number // Ventana de tiempo en milisegundos
  blockDurationMs?: number // Tiempo de bloqueo tras exceder límite
}

class RateLimiterStore {
  private store: Map<string, RateLimitEntry> = new Map()

  /**
   * Verificar si una clave (IP, email, userId) puede hacer una petición
   */
  check(key: string, config: RateLimitConfig): {
    allowed: boolean
    remaining: number
    resetAt: Date
    blockedUntil?: Date
  } {
    const now = new Date()
    const entry = this.store.get(key)

    // Si está bloqueado, verificar si ya pasó el tiempo de bloqueo
    if (entry?.blockedUntil && entry.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        blockedUntil: entry.blockedUntil,
      }
    }

    // Si no hay entrada o ya pasó la ventana, reiniciar contador
    if (!entry || entry.resetAt < now) {
      const resetAt = new Date(now.getTime() + config.windowMs)
      this.store.set(key, {
        count: 1,
        resetAt,
      })
      return {
        allowed: true,
        remaining: config.maxAttempts - 1,
        resetAt,
      }
    }

    // Incrementar contador
    entry.count++

    // Si excede el límite, bloquear
    if (entry.count > config.maxAttempts) {
      if (config.blockDurationMs) {
        entry.blockedUntil = new Date(now.getTime() + config.blockDurationMs)
      }
      this.store.set(key, entry)
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        blockedUntil: entry.blockedUntil,
      }
    }

    this.store.set(key, entry)
    return {
      allowed: true,
      remaining: config.maxAttempts - entry.count,
      resetAt: entry.resetAt,
    }
  }

  /**
   * Limpiar entrada (útil tras login exitoso)
   */
  reset(key: string) {
    this.store.delete(key)
  }

  /**
   * Limpiar entradas expiradas (ejecutar periódicamente)
   */
  cleanup() {
    const now = new Date()
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now && (!entry.blockedUntil || entry.blockedUntil < now)) {
        this.store.delete(key)
      }
    }
  }
}

// Singleton store
const rateLimiterStore = new RateLimiterStore()

// Limpiar cada 5 minutos
setInterval(() => rateLimiterStore.cleanup(), 5 * 60 * 1000)

/**
 * Configuraciones predefinidas
 */
export const RateLimitConfigs = {
  // Login: 5 intentos en 15 minutos, bloqueo de 30 minutos
  LOGIN: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutos
    blockDurationMs: 30 * 60 * 1000, // 30 minutos
  },

  // API general: 100 requests por minuto
  API_GENERAL: {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minuto
  },

  // Creación de recursos: 20 por hora
  CREATE_RESOURCE: {
    maxAttempts: 20,
    windowMs: 60 * 60 * 1000, // 1 hora
  },

  // Exportación: 10 por hora
  EXPORT: {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000, // 1 hora
    blockDurationMs: 10 * 60 * 1000, // 10 minutos
  },

  // Emails/SMS: 5 por hora
  COMMUNICATION: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hora
    blockDurationMs: 60 * 60 * 1000, // 1 hora
  },

  // Cambio de contraseña: 3 intentos en 1 hora
  PASSWORD_CHANGE: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hora
    blockDurationMs: 2 * 60 * 60 * 1000, // 2 horas
  },
}

/**
 * Rate Limiter principal
 */
export class RateLimiter {
  /**
   * Verificar límite por IP
   */
  static checkByIP(ip: string, config: RateLimitConfig) {
    return rateLimiterStore.check(`ip:${ip}`, config)
  }

  /**
   * Verificar límite por email
   */
  static checkByEmail(email: string, config: RateLimitConfig) {
    return rateLimiterStore.check(`email:${email}`, config)
  }

  /**
   * Verificar límite por userId
   */
  static checkByUser(userId: string, config: RateLimitConfig) {
    return rateLimiterStore.check(`user:${userId}`, config)
  }

  /**
   * Verificar límite personalizado
   */
  static check(key: string, config: RateLimitConfig) {
    return rateLimiterStore.check(key, config)
  }

  /**
   * Reset de límite
   */
  static reset(key: string) {
    rateLimiterStore.reset(key)
  }

  /**
   * Reset por email (útil tras login exitoso)
   */
  static resetByEmail(email: string) {
    rateLimiterStore.reset(`email:${email}`)
  }

  /**
   * Reset por IP
   */
  static resetByIP(ip: string) {
    rateLimiterStore.reset(`ip:${ip}`)
  }
}

/**
 * Helper para obtener IP del request
 */
export function getClientIP(request: Request): string {
  // Intentar obtener IP real (detrás de proxy/load balancer)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback (en desarrollo local)
  return '127.0.0.1'
}

/**
 * Helper para formatear tiempo restante
 */
export function formatBlockDuration(blockedUntil: Date): string {
  const now = new Date()
  const diffMs = blockedUntil.getTime() - now.getTime()
  const diffMinutes = Math.ceil(diffMs / (60 * 1000))

  if (diffMinutes < 60) {
    return `${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`
  }

  const diffHours = Math.ceil(diffMinutes / 60)
  return `${diffHours} hora${diffHours !== 1 ? 's' : ''}`
}

// ============================================================================
// REDIS-READY ADAPTER PATTERN
// ============================================================================

/**
 * Interface para adaptadores de Rate Limiting
 * Permite swap entre Memory y Redis sin cambiar código
 */
export interface IRateLimiterAdapter {
  check(key: string, config: RateLimitConfig): Promise<{
    allowed: boolean
    remaining: number
    resetAt: Date
    blockedUntil?: Date
  }>
  reset(key: string): Promise<void>
  cleanup?(): Promise<void>
}

/**
 * Adaptador de Memoria (actual)
 * Usado en desarrollo y single-instance deployments
 */
export class RateLimiterMemoryAdapter implements IRateLimiterAdapter {
  private store: Map<string, RateLimitEntry> = new Map()

  async check(
    key: string,
    config: RateLimitConfig
  ): Promise<{
    allowed: boolean
    remaining: number
    resetAt: Date
    blockedUntil?: Date
  }> {
    const now = new Date()
    const entry = this.store.get(key)

    // Si está bloqueado, verificar si ya pasó el tiempo de bloqueo
    if (entry?.blockedUntil && entry.blockedUntil > now) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        blockedUntil: entry.blockedUntil,
      }
    }

    // Si no hay entrada o ya pasó la ventana, reiniciar contador
    if (!entry || entry.resetAt < now) {
      const resetAt = new Date(now.getTime() + config.windowMs)
      this.store.set(key, {
        count: 1,
        resetAt,
      })
      return {
        allowed: true,
        remaining: config.maxAttempts - 1,
        resetAt,
      }
    }

    // Incrementar contador
    entry.count++

    // Si excede el límite, bloquear
    if (entry.count > config.maxAttempts) {
      if (config.blockDurationMs) {
        entry.blockedUntil = new Date(now.getTime() + config.blockDurationMs)
      }
      this.store.set(key, entry)
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
        blockedUntil: entry.blockedUntil,
      }
    }

    this.store.set(key, entry)
    return {
      allowed: true,
      remaining: config.maxAttempts - entry.count,
      resetAt: entry.resetAt,
    }
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key)
  }

  async cleanup(): Promise<void> {
    const now = new Date()
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now && (!entry.blockedUntil || entry.blockedUntil < now)) {
        this.store.delete(key)
      }
    }
  }
}

/**
 * Factory para crear adaptador según configuración
 */
function createRateLimiterAdapter(): IRateLimiterAdapter {
  const redisEnabled = process.env.REDIS_ENABLED === 'true'
  const redisUrl = process.env.REDIS_URL

  if (redisEnabled && redisUrl) {
    console.log('📦 Rate Limiter: Redis habilitado')
    console.warn('⚠️  Redis adapter no implementado aún, usando memoria')
    // TODO: return new RateLimiterRedisAdapter(redisUrl)
    return new RateLimiterMemoryAdapter()
  }

  console.log('📦 Rate Limiter: Usando memoria (development mode)')
  return new RateLimiterMemoryAdapter()
}

// Singleton adapter (reemplaza rateLimiterStore)
const rateLimiterAdapter = createRateLimiterAdapter()

// Cleanup interval (solo si el adapter lo soporta)
if (rateLimiterAdapter.cleanup) {
  setInterval(() => {
    void rateLimiterAdapter.cleanup!().catch((error) => {
      console.error('❌ Error en cleanup de rate limiter:', error)
    })
  }, 5 * 60 * 1000)
}

/**
 * Rate Limiter Async (nueva versión con adapter)
 */
export class RateLimiterAsync {
  /**
   * Verificar límite por IP
   */
  static async checkByIP(ip: string, config: RateLimitConfig) {
    return rateLimiterAdapter.check(`ip:${ip}`, config)
  }

  /**
   * Verificar límite por email
   */
  static async checkByEmail(email: string, config: RateLimitConfig) {
    return rateLimiterAdapter.check(`email:${email}`, config)
  }

  /**
   * Verificar límite por userId
   */
  static async checkByUser(userId: string, config: RateLimitConfig) {
    return rateLimiterAdapter.check(`user:${userId}`, config)
  }

  /**
   * Verificar límite personalizado
   */
  static async check(key: string, config: RateLimitConfig) {
    return rateLimiterAdapter.check(key, config)
  }

  /**
   * Reset de límite
   */
  static async reset(key: string) {
    return rateLimiterAdapter.reset(key)
  }

  /**
   * Reset por email (útil tras login exitoso)
   */
  static async resetByEmail(email: string) {
    return rateLimiterAdapter.reset(`email:${email}`)
  }

  /**
   * Reset por IP
   */
  static async resetByIP(ip: string) {
    return rateLimiterAdapter.reset(`ip:${ip}`)
  }
}
