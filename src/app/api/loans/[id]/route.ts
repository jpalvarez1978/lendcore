import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'
import { permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { LoanService } from '@/services/loanService'
import { getErrorMessage } from '@/lib/utils/errorMessages'
import { UserRole } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'LOANS_VIEW')) {
      return permissionDeniedResponse(request, session, 'api/loans/[id]', 'LOANS_VIEW')
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { id } = await params
    const loan = await LoanService.getById(id)

    if (!loan) {
      return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 })
    }

    return NextResponse.json(loan)
  } catch (error: unknown) {
    console.error('Error fetching loan:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al obtener el préstamo') },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/loans/[id]
// Exclusivo ADMIN: edita tasa de interés, notas e instrucciones de un préstamo
// activo. Si cambia la tasa, recalcula automáticamente las cuotas PENDING.
// ---------------------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo ADMIN puede modificar las condiciones financieras de un préstamo
    if (session.user.role !== UserRole.ADMIN) {
      return permissionDeniedResponse(request, session, 'api/loans/[id]', 'LOANS_EDIT')
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const { id } = await params
    const body = await request.json() as {
      interestRate?:        number
      newFirstPendingDate?: string
      pendingMonths?:       number
      notes?:               string | null
      clientInstructions?:  string | null
    }

    // Validaciones de campos financieros
    if (body.interestRate !== undefined) {
      const rate = body.interestRate
      if (typeof rate !== 'number' || isNaN(rate) || rate <= 0 || rate > 100) {
        return NextResponse.json(
          { error: 'La tasa de interés debe ser un número entre 0,01 y 100' },
          { status: 400 }
        )
      }
    }

    if (body.newFirstPendingDate !== undefined) {
      const parsed = new Date(body.newFirstPendingDate)
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: 'Fecha de primer pago inválida' },
          { status: 400 }
        )
      }
    }

    if (body.pendingMonths !== undefined) {
      const months = body.pendingMonths
      if (!Number.isInteger(months) || months < 1 || months > 120) {
        return NextResponse.json(
          { error: 'El número de meses pendientes debe ser un entero entre 1 y 120' },
          { status: 400 }
        )
      }
    }

    const updatedLoan = await LoanService.updateLoan(id, {
      interestRate:        body.interestRate,
      newFirstPendingDate: body.newFirstPendingDate ? new Date(body.newFirstPendingDate) : undefined,
      pendingMonths:       body.pendingMonths,
      notes:               body.notes,
      clientInstructions:  body.clientInstructions,
    }, session.user.id)

    return NextResponse.json(updatedLoan)
  } catch (error: unknown) {
    console.error('Error updating loan:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al actualizar el préstamo') },
      { status: 500 }
    )
  }
}
