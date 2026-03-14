import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ReportService } from '@/services/reportService'
import { hasPermission } from '@/lib/constants/permissions'
import {
  parseOptionalDateParam,
  permissionDeniedResponse,
} from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage } from '@/lib/utils/errorMessages'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'REPORTS_VIEW')) {
      return permissionDeniedResponse(request, session, 'api/reports/portfolio', 'REPORTS_VIEW')
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const searchParams = request.nextUrl.searchParams

    // Soportar filtros por mes/año o por rango de fechas
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')

    let startDate: Date | undefined
    let endDate: Date | undefined

    if (monthParam && yearParam) {
      // Calcular rango de fechas para el mes/año especificado
      const month = parseInt(monthParam)
      const year = parseInt(yearParam)

      if (month < 1 || month > 12 || year < 2000 || year > 2100) {
        return NextResponse.json({ error: 'Mes o año inválido' }, { status: 400 })
      }

      startDate = new Date(year, month - 1, 1) // Primer día del mes
      endDate = new Date(year, month, 0, 23, 59, 59, 999) // Último día del mes
    } else {
      // Usar rango de fechas directo (backward compatibility)
      const parsedStartDate = parseOptionalDateParam(searchParams.get('startDate'))
      const parsedEndDate = parseOptionalDateParam(searchParams.get('endDate'))

      if (parsedStartDate === null || parsedEndDate === null) {
        // Si no hay filtros, usar mes actual
        const now = new Date()
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      } else {
        startDate = parsedStartDate || undefined
        endDate = parsedEndDate || undefined
      }
    }

    const report = await ReportService.getPortfolioReport(startDate, endDate)

    return NextResponse.json(report)
  } catch (error: unknown) {
    console.error('Error generating portfolio report:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al generar reporte de cartera') },
      { status: 500 }
    )
  }
}
