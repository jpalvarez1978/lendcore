import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AuditService } from '@/services/auditService'
import { SecurityService } from '@/services/securityService'
import { hasPermission } from '@/lib/constants/permissions'
import { AuditAction } from '@prisma/client'
import {
  buildSafeTimestampFilename,
  parseOptionalDateParam,
  permissionDeniedResponse,
} from '@/lib/security/apiRouteUtils'
import { withExportRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getClientIP } from '@/lib/security/rateLimiter'
import { getErrorMessage } from '@/lib/utils/errorMessages'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'AUDIT_VIEW')) {
      return permissionDeniedResponse(request, session, 'api/audit/export', 'AUDIT_VIEW')
    }

    const rateLimitResponse = await withExportRateLimit(request, session.user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = parseOptionalDateParam(searchParams.get('startDate'))
    const endDate = parseOptionalDateParam(searchParams.get('endDate'))

    if (startDate === null || endDate === null) {
      return NextResponse.json({ error: 'Rango de fechas inválido' }, { status: 400 })
    }

    const actionParam = searchParams.get('action')
    const action =
      actionParam && Object.values(AuditAction).includes(actionParam as AuditAction)
        ? (actionParam as AuditAction)
        : undefined

    if (actionParam && !action) {
      return NextResponse.json({ error: 'Acción de auditoría inválida' }, { status: 400 })
    }

    const filters = {
      userId: searchParams.get('userId') || undefined,
      action,
      entityType: searchParams.get('entityType') || undefined,
      entityId: searchParams.get('entityId') || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }

    const { csvContent, recordCount } = await AuditService.exportToCSV(filters)

    await SecurityService.logMassExport(
      session.user.id,
      session.user.email || 'usuario@desconocido.local',
      getClientIP(request),
      recordCount,
      'audit-csv'
    )

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${buildSafeTimestampFilename('audit-log', 'csv')}"`,
      },
    })
  } catch (error: unknown) {
    console.error('Error exporting audit logs:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al exportar auditoría') },
      { status: 500 }
    )
  }
}
