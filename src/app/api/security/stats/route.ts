import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { SecurityService } from '@/services/securityService'
import { hasPermission } from '@/lib/constants/permissions'
import { clampIntegerParam, permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage } from '@/lib/utils/errorMessages'

/**
 * GET /api/security/stats
 * Obtener estadísticas de seguridad
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo ADMIN puede ver estadísticas de seguridad
    if (!hasPermission(session.user.role, 'AUDIT_VIEW')) {
      return permissionDeniedResponse(request, session, 'api/security/stats', 'AUDIT_VIEW')
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { searchParams } = new URL(request.url)
    const daysBack = clampIntegerParam(searchParams.get('days'), 7, 1, 90)

    const stats = await SecurityService.getSecurityStats(daysBack)

    return NextResponse.json(stats)
  } catch (error: unknown) {
    console.error('Error fetching security stats:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al obtener estadísticas de seguridad') },
      { status: 500 }
    )
  }
}
