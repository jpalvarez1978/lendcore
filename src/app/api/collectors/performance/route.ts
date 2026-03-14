import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CollectorService } from '@/services/collectorService'
import { hasPermission } from '@/lib/constants/permissions'
import { permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage } from '@/lib/utils/errorMessages'

/**
 * GET /api/collectors/performance
 * Obtener ranking de rendimiento de todos los cobradores
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'REPORTS_VIEW')) {
      return permissionDeniedResponse(
        request,
        session,
        'api/collectors/performance',
        'REPORTS_VIEW'
      )
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const startDate = startDateParam ? new Date(startDateParam) : undefined
    const endDate = endDateParam ? new Date(endDateParam) : undefined

    const performance = await CollectorService.getCollectorPerformance(startDate, endDate)

    return NextResponse.json(performance)
  } catch (error: unknown) {
    console.error('Error fetching collector performance:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al obtener rendimiento de cobradores') },
      { status: 500 }
    )
  }
}
