/**
 * Middleware de Rate Limiting para Next.js API Routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter, RateLimitConfigs, getClientIP, formatBlockDuration } from './rateLimiter'
import { SecurityService } from '@/services/securityService'

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  blockDurationMs?: number
}

/**
 * Aplicar rate limiting a una ruta
 */
export async function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  identifier?: string // email, userId, etc.
): Promise<NextResponse | null> {
  const ip = getClientIP(request)
  const endpoint = request.nextUrl.pathname

  const logExceededLimit = (key: string) => {
    void SecurityService.logRateLimitExceeded(key, ip, endpoint, config.maxAttempts + 1).catch(error => {
      console.error('Error logging rate limit event:', error)
    })
  }

  // Verificar por IP (siempre)
  const ipCheck = RateLimiter.checkByIP(ip, config)

  if (!ipCheck.allowed) {
    logExceededLimit(ip)

    const message = ipCheck.blockedUntil
      ? `Demasiadas peticiones. Bloqueado por ${formatBlockDuration(ipCheck.blockedUntil)}`
      : 'Demasiadas peticiones. Intenta más tarde'

    return NextResponse.json(
      {
        error: message,
        retryAfter: ipCheck.resetAt.toISOString(),
        blockedUntil: ipCheck.blockedUntil?.toISOString(),
      },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((ipCheck.resetAt.getTime() - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': config.maxAttempts.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': ipCheck.resetAt.toISOString(),
        },
      }
    )
  }

  // Verificar por identifier si se proporciona (email, userId)
  if (identifier) {
    const identifierCheck = RateLimiter.check(identifier, config)

    if (!identifierCheck.allowed) {
      logExceededLimit(identifier)

      const message = identifierCheck.blockedUntil
        ? `Demasiados intentos. Bloqueado por ${formatBlockDuration(identifierCheck.blockedUntil)}`
        : 'Demasiados intentos. Intenta más tarde'

      return NextResponse.json(
        {
          error: message,
          retryAfter: identifierCheck.resetAt.toISOString(),
          blockedUntil: identifierCheck.blockedUntil?.toISOString(),
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((identifierCheck.resetAt.getTime() - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': config.maxAttempts.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': identifierCheck.resetAt.toISOString(),
          },
        }
      )
    }
  }

  // Permitir request, pero agregar headers informativos
  return null // null = allowed, la ruta continúa
}

/**
 * Helper rápido para login
 */
export async function withLoginRateLimit(request: NextRequest, email: string) {
  return withRateLimit(request, RateLimitConfigs.LOGIN, `email:${email}`)
}

/**
 * Helper rápido para export
 */
export async function withExportRateLimit(request: NextRequest, userId: string) {
  return withRateLimit(request, RateLimitConfigs.EXPORT, `export:${userId}`)
}

/**
 * Helper rápido para creación de recursos
 */
export async function withCreateRateLimit(request: NextRequest, userId: string) {
  return withRateLimit(request, RateLimitConfigs.CREATE_RESOURCE, `create:${userId}`)
}

/**
 * Helper para API general
 */
export async function withAPIRateLimit(request: NextRequest) {
  return withRateLimit(request, RateLimitConfigs.API_GENERAL)
}
