import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { SecurityService } from '@/services/securityService'
import { hasPermission } from '@/lib/constants/permissions'
import { SecuritySeverity } from '@prisma/client'
import { clampIntegerParam, permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage } from '@/lib/utils/errorMessages'

/**
 * GET /api/security/logs
 * Obtener logs de seguridad
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo ADMIN puede ver logs de seguridad
    if (!hasPermission(session.user.role, 'AUDIT_VIEW')) {
      return permissionDeniedResponse(request, session, 'api/security/logs', 'AUDIT_VIEW')
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { searchParams } = new URL(request.url)
    const limit = clampIntegerParam(searchParams.get('limit'), 50, 1, 200)
    const severityParam = searchParams.get('severity')
    const severity =
      severityParam && Object.values(SecuritySeverity).includes(severityParam as SecuritySeverity)
        ? (severityParam as SecuritySeverity)
        : null

    const logs = await SecurityService.getRecentEvents(limit, severity || undefined)

    return NextResponse.json(logs)
  } catch (error: unknown) {
    console.error('Error fetching security logs:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al obtener logs de seguridad') },
      { status: 500 }
    )
  }
}
