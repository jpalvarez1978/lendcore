import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ReportService } from '@/services/reportService'
import { hasPermission } from '@/lib/constants/permissions'
import { permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage } from '@/lib/utils/errorMessages'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'REPORTS_VIEW')) {
      return permissionDeniedResponse(request, session, 'api/reports/aging', 'REPORTS_VIEW')
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const searchParams = request.nextUrl.searchParams
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')

    let asOfDate: Date | undefined

    if (monthParam && yearParam) {
      const month = parseInt(monthParam)
      const year = parseInt(yearParam)

      if (month < 1 || month > 12 || year < 2000 || year > 2100) {
        return NextResponse.json({ error: 'Mes o año inválido' }, { status: 400 })
      }

      // Último día del mes como fecha de referencia
      asOfDate = new Date(year, month, 0, 23, 59, 59, 999)
    }

    const report = await ReportService.getAgingReport()

    return NextResponse.json(report)
  } catch (error: unknown) {
    console.error('Error generating aging report:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al generar reporte de antigüedad') },
      { status: 500 }
    )
  }
}
