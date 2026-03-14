import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PromiseService } from '@/services/promiseService'
import type { CreatePromiseData } from '@/services/promiseService'
import { hasPermission } from '@/lib/constants/permissions'
import { permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withCreateRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage, isZodValidationError } from '@/lib/utils/errorMessages'
import { z } from 'zod'

const promiseSchema = z.object({
  clientId: z.string().uuid(),
  loanId: z.string().uuid().optional().nullable(),
  promiseDate: z.coerce.date(),
  promisedAmount: z.coerce.number().positive(),
  notes: z.string().trim().max(500).optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'COLLECTION_CREATE')) {
      return permissionDeniedResponse(request, session, 'api/promises', 'COLLECTION_CREATE')
    }

    const rateLimitResponse = await withCreateRateLimit(request, session.user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const validatedData = promiseSchema.parse(body)

    const promiseData: CreatePromiseData = {
      clientId: validatedData.clientId,
      loanId: validatedData.loanId || undefined,
      promiseDate: validatedData.promiseDate,
      promisedAmount: validatedData.promisedAmount,
      notes: validatedData.notes || undefined,
    }

    const promise = await PromiseService.create(promiseData, session.user.id)

    return NextResponse.json(promise, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating payment promise:', error)
    if (isZodValidationError(error)) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al crear promesa de pago') },
      { status: 500 }
    )
  }
}
