import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CollectorService } from '@/services/collectorService'
import { hasPermission } from '@/lib/constants/permissions'
import { permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage } from '@/lib/utils/errorMessages'

/**
 * GET /api/collectors/[id]/loans
 * Obtener préstamos asignados a un cobrador
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
        `api/collectors/${id}/loans`,
        'COLLECTION_VIEW'
      )
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as 'ACTIVE' | 'PAID' | 'DEFAULTED' | null

    const loans = await CollectorService.getCollectorLoans(
      id,
      status || undefined
    )

    return NextResponse.json(loans)
  } catch (error: unknown) {
    console.error('Error fetching collector loans:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al obtener préstamos del cobrador') },
      { status: 500 }
    )
  }
}
