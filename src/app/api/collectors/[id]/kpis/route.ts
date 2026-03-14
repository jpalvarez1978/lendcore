import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CollectorService } from '@/services/collectorService'
import { hasPermission } from '@/lib/constants/permissions'
import { permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage } from '@/lib/utils/errorMessages'

/**
 * GET /api/collectors/[id]/kpis
 * Obtener KPIs de un cobrador específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'COLLECTION_VIEW')) {
      return permissionDeniedResponse(
        request,
        session,
        `api/collectors/${id}/kpis`,
        'COLLECTION_VIEW'
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

    const kpis = await CollectorService.getCollectorKPIs(id, startDate, endDate)

    return NextResponse.json(kpis)
  } catch (error: unknown) {
    console.error('Error fetching collector KPIs:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al obtener KPIs del cobrador') },
      { status: 500 }
    )
  }
}
