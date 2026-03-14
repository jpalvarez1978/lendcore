import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CollectionDashboardService } from '@/services/collectionDashboardService'
import { hasPermission } from '@/lib/constants/permissions'
import { CollectionActionType, CollectionResult } from '@prisma/client'
import { z } from 'zod'
import { withCreateRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage, isZodValidationError } from '@/lib/utils/errorMessages'

const quickActionSchema = z.object({
  clientId: z.string().uuid(),
  loanId: z.string().uuid().optional().nullable(),
  actionType: z.nativeEnum(CollectionActionType),
  result: z.nativeEnum(CollectionResult),
  notes: z.string().trim().min(1).max(1000),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'COLLECTION_CREATE')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // Rate limiting: 20 acciones por hora
    const rateLimitResponse = await withCreateRateLimit(request, session.user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const validatedData = quickActionSchema.parse(body)

    const action = await CollectionDashboardService.quickCollectionAction(
      validatedData.clientId,
      validatedData.loanId,
      validatedData.actionType,
      validatedData.result,
      validatedData.notes,
      session.user.id
    )

    return NextResponse.json(action, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating quick action:', error)
    if (isZodValidationError(error)) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al registrar gestión rápida') },
      { status: 500 }
    )
  }
}
