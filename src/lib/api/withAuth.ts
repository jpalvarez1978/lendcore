/**
 * withAuth - Middleware centralizado para autenticación y autorización en APIs
 *
 * Elimina boilerplate repetitivo de auth/permisos en cada route handler
 *
 * @example
 * // Antes:
 * export async function GET(request: NextRequest) {
 *   const session = await auth()
 *   if (!session?.user) {
 *     return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
 *   }
 *   if (!hasPermission(session.user.role, 'SOME_PERMISSION')) {
 *     return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
 *   }
 *   // ... logic
 * }
 *
 * // Después:
 * export const GET = withAuth(
 *   async (request, context, session) => {
 *     // ... logic (session ya está validada)
 *   },
 *   { permission: 'SOME_PERMISSION' }
 * )
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, type AppPermission } from '@/lib/constants/permissions'
import { UserRole } from '@prisma/client'

export interface AuthSession {
  user: {
    id: string
    email: string
    name: string
    role: UserRole
  }
}

export interface RouteContext {
  params: Promise<Record<string, string>>
}

export interface WithAuthOptions {
  /** Permiso requerido para acceder al endpoint */
  permission?: AppPermission
  /** Roles permitidos (alternativa a permission) */
  roles?: UserRole[]
  /** Si es true, requiere autenticación pero sin verificar permisos específicos */
  authOnly?: boolean
}

type AuthenticatedHandler<T = unknown> = (
  request: NextRequest,
  context: RouteContext,
  session: AuthSession
) => Promise<NextResponse<T>>

/**
 * Higher-order function para proteger route handlers con autenticación
 */
export function withAuth<T = unknown>(
  handler: AuthenticatedHandler<T>,
  options: WithAuthOptions = {}
): (request: NextRequest, context: RouteContext) => Promise<NextResponse<T | { error: string }>> {
  return async (request: NextRequest, context: RouteContext) => {
    try {
      // Verificar sesión
      const session = await auth()

      if (!session?.user) {
        return NextResponse.json(
          { error: 'No autorizado' },
          { status: 401 }
        ) as NextResponse<{ error: string }>
      }

      const { permission, roles, authOnly } = options

      // Si solo requiere autenticación (authOnly), permitir
      if (authOnly) {
        return handler(request, context, session as AuthSession)
      }

      // Verificar permiso específico
      if (permission && !hasPermission(session.user.role, permission)) {
        return NextResponse.json(
          { error: 'Acceso denegado' },
          { status: 403 }
        ) as NextResponse<{ error: string }>
      }

      // Verificar roles específicos
      if (roles && roles.length > 0 && !roles.includes(session.user.role)) {
        return NextResponse.json(
          { error: 'Rol no autorizado' },
          { status: 403 }
        ) as NextResponse<{ error: string }>
      }

      // Ejecutar handler con sesión validada
      return handler(request, context, session as AuthSession)
    } catch (error) {
      console.error('Error en withAuth:', error)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      ) as NextResponse<{ error: string }>
    }
  }
}

/**
 * Versión simplificada que solo requiere autenticación
 */
export function withAuthOnly<T = unknown>(
  handler: AuthenticatedHandler<T>
): (request: NextRequest, context: RouteContext) => Promise<NextResponse<T | { error: string }>> {
  return withAuth(handler, { authOnly: true })
}

/**
 * Versión para endpoints que requieren rol ADMIN
 */
export function withAdminAuth<T = unknown>(
  handler: AuthenticatedHandler<T>
): (request: NextRequest, context: RouteContext) => Promise<NextResponse<T | { error: string }>> {
  return withAuth(handler, { roles: ['ADMIN'] })
}

/**
 * Versión para endpoints que requieren rol ADMIN o ANALYST
 */
export function withAnalystAuth<T = unknown>(
  handler: AuthenticatedHandler<T>
): (request: NextRequest, context: RouteContext) => Promise<NextResponse<T | { error: string }>> {
  return withAuth(handler, { roles: ['ADMIN', 'ANALYST'] })
}
