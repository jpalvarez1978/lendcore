import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'
import { permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { LoanService } from '@/services/loanService'
import { getErrorMessage } from '@/lib/utils/errorMessages'

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
