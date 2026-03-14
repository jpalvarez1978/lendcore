import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CollectorService } from '@/services/collectorService'
import { hasPermission } from '@/lib/constants/permissions'
import { permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage } from '@/lib/utils/errorMessages'

/**
 * GET /api/collectors/unassigned-loans
 * Obtener préstamos sin asignar (disponibles para asignación)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'COLLECTION_EDIT')) {
      return permissionDeniedResponse(
        request,
        session,
        'api/collectors/unassigned-loans',
        'COLLECTION_EDIT'
      )
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { searchParams } = new URL(request.url)
    const includeAllStatuses = searchParams.get('includeAll') === 'true'

    const loans = await CollectorService.getUnassignedLoans(includeAllStatuses)

    return NextResponse.json(loans)
  } catch (error: unknown) {
    console.error('Error fetching unassigned loans:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al obtener préstamos sin asignar') },
      { status: 500 }
    )
  }
}
