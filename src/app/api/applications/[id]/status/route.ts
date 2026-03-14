import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'
import { permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withCreateRateLimit } from '@/lib/security/rateLimitMiddleware'
import { ApplicationService } from '@/services/applicationService'
import { getErrorMessage, isZodValidationError } from '@/lib/utils/errorMessages'

const applicationStatusActionSchema = z
  .object({
    action: z.enum(['submit', 'approve', 'reject']),
    approvalNotes: z.string().trim().max(2000).optional(),
    rejectionReason: z.string().trim().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action === 'reject' && !data.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debes indicar el motivo del rechazo',
        path: ['rejectionReason'],
      })
    }
  })

function canExecuteAction(role: Parameters<typeof hasPermission>[0], action: 'submit' | 'approve' | 'reject') {
  if (action === 'submit') {
    return hasPermission(role, 'APPLICATIONS_CREATE')
  }

  if (action === 'approve') {
    return hasPermission(role, 'APPLICATIONS_APPROVE')
  }

  return hasPermission(role, 'APPLICATIONS_REJECT')
}

function getRequiredPermission(action: 'submit' | 'approve' | 'reject') {
  if (action === 'submit') return 'APPLICATIONS_CREATE'
  if (action === 'approve') return 'APPLICATIONS_APPROVE'
  return 'APPLICATIONS_REJECT'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const rateLimitResponse = await withCreateRateLimit(request, session.user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = applicationStatusActionSchema.parse(await request.json())
    const { id } = await params

    if (!canExecuteAction(session.user.role, body.action)) {
      return permissionDeniedResponse(
        request,
        session,
        'api/applications/[id]/status',
        getRequiredPermission(body.action)
      )
    }

    let application

    switch (body.action) {
      case 'submit':
        application = await ApplicationService.submit(id, session.user.id)
        break
      case 'approve':
        application = await ApplicationService.approve(id, session.user.id, body.approvalNotes)
        break
      case 'reject':
        application = await ApplicationService.reject(id, session.user.id, body.rejectionReason!)
        break
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/solicitudes')
    revalidatePath(`/dashboard/solicitudes/${id}`)

    return NextResponse.json({ success: true, application })
  } catch (error: unknown) {
    console.error('Error updating application workflow:', error)

    if (isZodValidationError(error)) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }

    const message = getErrorMessage(error, 'No se pudo actualizar la solicitud')
    const status = message === 'Solicitud no encontrada' ? 404 : 400

    return NextResponse.json({ error: message }, { status })
  }
}
