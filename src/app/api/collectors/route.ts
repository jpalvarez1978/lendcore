import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CollectorCRUDService } from '@/services/collectorCRUDService'
import { hasPermission } from '@/lib/constants/permissions'
import { permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage } from '@/lib/utils/errorMessages'

/**
 * GET /api/collectors
 * Obtener lista de cobradores
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'COLLECTION_VIEW')) {
      return permissionDeniedResponse(
        request,
        session,
        'api/collectors',
        'COLLECTION_VIEW'
      )
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const collectors = await CollectorCRUDService.getAllCollectors(includeInactive)

    return NextResponse.json(collectors)
  } catch (error: unknown) {
    console.error('Error fetching collectors:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al obtener cobradores') },
      { status: 500 }
    )
  }
}

/**
 * POST /api/collectors
 * Crear nuevo cobrador
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'COLLECTION_EDIT')) {
      return permissionDeniedResponse(
        request,
        session,
        'api/collectors',
        'COLLECTION_EDIT'
      )
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const { name, email, phone } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Nombre y email son requeridos' },
        { status: 400 }
      )
    }

    const collector = await CollectorCRUDService.createCollector({
      name,
      email,
      phone,
    })

    return NextResponse.json(collector, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating collector:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al crear cobrador') },
      { status: 500 }
    )
  }
}
