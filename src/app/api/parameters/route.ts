import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ParameterService } from '@/services/parameterService'
import { hasPermission } from '@/lib/constants/permissions'
import { ParameterCategory } from '@prisma/client'
import { permissionDeniedResponse, sanitizeSearchQuery } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit, withCreateRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage, isZodValidationError } from '@/lib/utils/errorMessages'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'SETTINGS_MANAGE')) {
      return permissionDeniedResponse(request, session, 'api/parameters', 'SETTINGS_MANAGE')
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const searchParams = request.nextUrl.searchParams
    const categoryParam = sanitizeSearchQuery(searchParams.get('category'), 32).toUpperCase()
    const category =
      categoryParam && Object.values(ParameterCategory).includes(categoryParam as ParameterCategory)
        ? (categoryParam as ParameterCategory)
        : undefined

    if (categoryParam && !category) {
      return NextResponse.json({ error: 'Categoría inválida' }, { status: 400 })
    }

    const parameters = await ParameterService.listByCategory(category)

    return NextResponse.json(parameters)
  } catch (error: unknown) {
    console.error('Error fetching parameters:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al obtener parámetros') },
      { status: 500 }
    )
  }
}

const updateSchema = z.object({
  key: z.string().trim().min(1).max(120),
  value: z.union([z.string(), z.number(), z.boolean()]),
  reason: z.string().trim().max(500).optional(),
})

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'SETTINGS_MANAGE')) {
      return permissionDeniedResponse(request, session, 'api/parameters', 'SETTINGS_MANAGE')
    }

    const rateLimitResponse = await withCreateRateLimit(request, session.user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const validatedData = updateSchema.parse(body)

    const parameter = await ParameterService.update(
      validatedData.key,
      validatedData.value,
      session.user.id,
      validatedData.reason
    )

    return NextResponse.json(parameter)
  } catch (error: unknown) {
    console.error('Error updating parameter:', error)
    if (isZodValidationError(error)) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al actualizar parámetros') },
      { status: 500 }
    )
  }
}
