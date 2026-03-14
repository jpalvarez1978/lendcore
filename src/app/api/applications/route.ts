import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ApplicationService } from '@/services/applicationService'
import type { CreateApplicationData } from '@/services/applicationService'
import { applicationSchema } from '@/lib/validations/application.schema'
import type { ApplicationFormData } from '@/lib/validations/application.schema'
import { hasPermission } from '@/lib/constants/permissions'
import { ApplicationStatus } from '@prisma/client'
import { permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit, withCreateRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage, isZodValidationError } from '@/lib/utils/errorMessages'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'APPLICATIONS_VIEW')) {
      return permissionDeniedResponse(
        request,
        session,
        'api/applications',
        'APPLICATIONS_VIEW'
      )
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const status =
      statusParam &&
      Object.values(ApplicationStatus).includes(statusParam as ApplicationStatus)
        ? (statusParam as ApplicationStatus)
        : undefined
    const clientId = searchParams.get('clientId') || undefined

    if (statusParam && !status) {
      return NextResponse.json({ error: 'Estado de solicitud inválido' }, { status: 400 })
    }

    const applications = await ApplicationService.getAll({ status, clientId })

    return NextResponse.json(applications)
  } catch (error: unknown) {
    console.error('Error fetching applications:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al obtener solicitudes') },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'APPLICATIONS_CREATE')) {
      return permissionDeniedResponse(
        request,
        session,
        'api/applications',
        'APPLICATIONS_CREATE'
      )
    }

    const rateLimitResponse = await withCreateRateLimit(request, session.user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const validatedData: ApplicationFormData = applicationSchema.parse(body)

    const applicationData: CreateApplicationData = {
      clientId: validatedData.clientId,
      requestedAmount: validatedData.requestedAmount,
      purpose: validatedData.purpose,
      termMonths: validatedData.termMonths,
      proposedRate: validatedData.proposedRate,
      paymentFrequency: validatedData.paymentFrequency,
    }

    const application = await ApplicationService.create(applicationData, session.user.id)

    return NextResponse.json(application, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating application:', error)
    if (isZodValidationError(error)) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al crear la solicitud') },
      { status: 500 }
    )
  }
}
