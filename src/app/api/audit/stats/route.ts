import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AuditService } from '@/services/auditService'
import { hasPermission } from '@/lib/constants/permissions'
import { parseOptionalDateParam, permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage } from '@/lib/utils/errorMessages'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'AUDIT_VIEW')) {
      return permissionDeniedResponse(request, session, 'api/audit/stats', 'AUDIT_VIEW')
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = parseOptionalDateParam(searchParams.get('startDate'))
    const endDate = parseOptionalDateParam(searchParams.get('endDate'))

    if (startDate === null || endDate === null) {
      return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 })
    }

    const stats = await AuditService.getStats(startDate || undefined, endDate || undefined)

    return NextResponse.json(stats)
  } catch (error: unknown) {
    console.error('Error fetching audit stats:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al obtener estadísticas de auditoría') },
      { status: 500 }
    )
  }
}
