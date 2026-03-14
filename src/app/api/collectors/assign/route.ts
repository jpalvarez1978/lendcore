import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CollectorService } from '@/services/collectorService'
import { hasPermission } from '@/lib/constants/permissions'
import { permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage } from '@/lib/utils/errorMessages'
import { AuditService } from '@/services/auditService'

/**
 * POST /api/collectors/assign
 * Asignar préstamo(s) a cobrador
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'COLLECTION_EDIT')) {
      return permissionDeniedResponse(request, session, 'api/collectors/assign', 'COLLECTION_EDIT')
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const { loanId, loanIds, collectorId } = body

    if (!collectorId) {
      return NextResponse.json({ error: 'collectorId es requerido' }, { status: 400 })
    }

    let result

    if (loanIds && Array.isArray(loanIds)) {
      // Asignar múltiples préstamos
      result = await CollectorService.assignMultipleLoans(loanIds, collectorId)

      // Auditoría
      await AuditService.createLog(
        session.user.id,
        'UPDATE',
        'LOAN',
        loanIds.join(','),
        null,
        { action: 'LOAN_ASSIGNED_TO_COLLECTOR', loanIds, collectorId }
      )
    } else if (loanId) {
      // Asignar un solo préstamo
      result = await CollectorService.assignLoanToCollector(loanId, collectorId)

      // Auditoría
      await AuditService.createLog(
        session.user.id,
        'UPDATE',
        'LOAN',
        loanId,
        null,
        { action: 'LOAN_ASSIGNED_TO_COLLECTOR', loanId, collectorId }
      )
    } else {
      return NextResponse.json(
        { error: 'Se requiere loanId o loanIds' },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error assigning loan to collector:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al asignar préstamo a cobrador') },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/collectors/assign
 * Desasignar préstamo de cobrador
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'COLLECTION_EDIT')) {
      return permissionDeniedResponse(request, session, 'api/collectors/assign', 'COLLECTION_EDIT')
    }

    const { searchParams } = new URL(request.url)
    const loanId = searchParams.get('loanId')

    if (!loanId) {
      return NextResponse.json({ error: 'loanId es requerido' }, { status: 400 })
    }

    const result = await CollectorService.unassignLoanFromCollector(loanId)

    // Auditoría
    await AuditService.createLog(
      session.user.id,
      'UPDATE',
      'LOAN',
      loanId,
      null,
      { action: 'LOAN_UNASSIGNED_FROM_COLLECTOR', loanId }
    )

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error unassigning loan from collector:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al desasignar préstamo') },
      { status: 500 }
    )
  }
}
