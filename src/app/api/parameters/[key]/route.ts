import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ParameterService } from '@/services/parameterService'
import { AuditService } from '@/services/auditService'
import { hasPermission } from '@/lib/constants/permissions'
import { permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage } from '@/lib/utils/errorMessages'

/**
 * PATCH /api/parameters/[key]
 * Actualizar valor de un parámetro del sistema
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params

    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'SETTINGS_MANAGE')) {
      return permissionDeniedResponse(
        request,
        session,
        `api/parameters/${key}`,
        'SETTINGS_MANAGE'
      )
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const { value } = body

    if (value === undefined || value === null) {
      return NextResponse.json(
        { error: 'El valor es requerido' },
        { status: 400 }
      )
    }

    // Obtener parámetro actual
    const currentParam = await ParameterService.getByKey(key)

    // Actualizar parámetro
    const updated = await ParameterService.update(key, value, session.user.id)

    // Registrar en auditoría
    await AuditService.createLog(
      session.user.id,
      'PARAMETER_CHANGED',
      'system_parameters',
      updated.id,
      { value: currentParam.value },
      { value: updated.value }
    )

    return NextResponse.json(updated)
  } catch (error: unknown) {
    console.error('Error updating parameter:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al actualizar parámetro') },
      { status: 500 }
    )
  }
}
