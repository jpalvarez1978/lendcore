import { NextRequest, NextResponse } from 'next/server'
import { getClientIP } from './rateLimiter'
import { SecurityService } from '@/services/securityService'

interface PermissionContext {
  user?: {
    id?: string
    email?: string | null
  }
}

export function clampIntegerParam(
  value: string | null,
  defaultValue: number,
  min: number,
  max: number
) {
  const parsed = Number.parseInt(value || '', 10)

  if (Number.isNaN(parsed)) {
    return defaultValue
  }

  return Math.min(max, Math.max(min, parsed))
}

export function parseOptionalDateParam(value: string | null) {
  if (!value) return undefined

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function sanitizeSearchQuery(value: string | null, maxLength: number = 80) {
  return (value || '').trim().slice(0, maxLength)
}

export function buildSafeTimestampFilename(prefix: string, extension: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `${prefix}-${timestamp}.${extension}`
}

export async function permissionDeniedResponse(
  request: NextRequest,
  session: PermissionContext | null | undefined,
  resource: string,
  requiredPermission: string
) {
  await SecurityService.logUnauthorizedAccess(
    session?.user?.id,
    session?.user?.email || undefined,
    getClientIP(request),
    resource,
    requiredPermission
  )

  return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
}
