import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CollectorCRUDService } from '@/services/collectorCRUDService'
import { hasPermission } from '@/lib/constants/permissions'
import { permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage } from '@/lib/utils/errorMessages'

/**
 * GET /api/collectors/[id]
 * Obtener cobrador por ID
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
        `api/collectors/${id}`,
        'COLLECTION_VIEW'
      )
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const collector = await CollectorCRUDService.getCollectorById(id)

    return NextResponse.json(collector)
  } catch (error: unknown) {
    console.error('Error fetching collector:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al obtener cobrador') },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/collectors/[id]
 * Actualizar cobrador
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'COLLECTION_EDIT')) {
      return permissionDeniedResponse(
        request,
        session,
        `api/collectors/${id}`,
        'COLLECTION_EDIT'
      )
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const { name, email, phone, isActive } = body

    const updated = await CollectorCRUDService.updateCollector(id, {
      name,
      email,
      phone,
      isActive,
    })

    return NextResponse.json(updated)
  } catch (error: unknown) {
    console.error('Error updating collector:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al actualizar cobrador') },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/collectors/[id]
 * Eliminar cobrador
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'COLLECTION_EDIT')) {
      return permissionDeniedResponse(
        request,
        session,
        `api/collectors/${id}`,
        'COLLECTION_EDIT'
      )
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    await CollectorCRUDService.deleteCollector(id)

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error deleting collector:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al eliminar cobrador') },
      { status: 500 }
    )
  }
}
