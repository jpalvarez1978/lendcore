import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AuditService } from '@/services/auditService'
import { hasPermission } from '@/lib/constants/permissions'
import { AuditAction } from '@prisma/client'
import {
  clampIntegerParam,
  parseOptionalDateParam,
  permissionDeniedResponse,
  sanitizeSearchQuery,
} from '@/lib/security/apiRouteUtils'
import { PAGINATION_LIMITS } from '@/lib/utils/apiParams'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage } from '@/lib/utils/errorMessages'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'AUDIT_VIEW')) {
      return permissionDeniedResponse(request, session, 'api/audit', 'AUDIT_VIEW')
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const searchParams = request.nextUrl.searchParams
    const actionParam = searchParams.get('action')
    const action =
      actionParam && Object.values(AuditAction).includes(actionParam as AuditAction)
        ? (actionParam as AuditAction)
        : undefined
    const startDate = parseOptionalDateParam(searchParams.get('startDate'))
    const endDate = parseOptionalDateParam(searchParams.get('endDate'))

    if (actionParam && !action) {
      return NextResponse.json({ error: 'Acción de auditoría inválida' }, { status: 400 })
    }

    if (startDate === null || endDate === null) {
      return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 })
    }

    const filters = {
      userId: searchParams.get('userId') || undefined,
      action,
      entityType: searchParams.get('entityType') || undefined,
      entityId: searchParams.get('entityId') || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: sanitizeSearchQuery(searchParams.get('search'), 100) || undefined,
    }

    const page = clampIntegerParam(
      searchParams.get('page'),
      PAGINATION_LIMITS.DEFAULT_PAGE,
      PAGINATION_LIMITS.MIN_PAGE,
      PAGINATION_LIMITS.MAX_PAGE
    )
    const pageSize = clampIntegerParam(
      searchParams.get('pageSize'),
      PAGINATION_LIMITS.DEFAULT_PAGE_SIZE,
      PAGINATION_LIMITS.MIN_PAGE_SIZE,
      PAGINATION_LIMITS.MAX_PAGE_SIZE
    )

    // Convert page/pageSize to limit/offset for backward compatibility
    const limit = clampIntegerParam(searchParams.get('limit'), pageSize, 1, 500)
    const offset = clampIntegerParam(searchParams.get('offset'), (page - 1) * pageSize, 0, 10000)

    const result = await AuditService.getLogs(filters, limit, offset)

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al obtener auditoría') },
      { status: 500 }
    )
  }
}
