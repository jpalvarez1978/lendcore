import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'
import { permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit, withCreateRateLimit } from '@/lib/security/rateLimitMiddleware'
import { ClientService } from '@/services/clientService'
import { getErrorMessage } from '@/lib/utils/errorMessages'

/**
 * GET /api/clients/[id]
 * Obtener cliente por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'CLIENTS_VIEW')) {
      return permissionDeniedResponse(request, session, 'api/clients/[id]', 'CLIENTS_VIEW')
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { id } = await params
    const client = await ClientService.getById(id)

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error: unknown) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al obtener cliente') },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/clients/[id]
 * Actualizar cliente
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'CLIENTS_EDIT')) {
      return permissionDeniedResponse(request, session, 'api/clients/[id]', 'CLIENTS_EDIT')
    }

    const rateLimitResponse = await withCreateRateLimit(request, session.user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { id } = await params
    const data = await request.json()

    // Validaciones básicas
    if (data.creditLimit !== undefined && data.creditLimit < 0) {
      return NextResponse.json(
        { error: 'El límite de crédito no puede ser negativo' },
        { status: 400 }
      )
    }

    const updatedClient = await ClientService.update(id, data, session.user.id)

    return NextResponse.json(updatedClient)
  } catch (error: unknown) {
    console.error('Error updating client:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al actualizar cliente') },
      { status: 500 }
    )
  }
}
