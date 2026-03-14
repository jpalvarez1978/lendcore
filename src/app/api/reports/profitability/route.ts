import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ReportService } from '@/services/reportService'
import { hasPermission } from '@/lib/constants/permissions'
import {
  parseOptionalDateParam,
  permissionDeniedResponse,
} from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'REPORTS_VIEW')) {
      return permissionDeniedResponse(
        request,
        session,
        'api/reports/profitability',
        'REPORTS_VIEW'
      )
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const searchParams = request.nextUrl.searchParams
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')

    let startDate: Date | undefined
    let endDate: Date | undefined

    if (monthParam && yearParam) {
      const month = parseInt(monthParam)
      const year = parseInt(yearParam)

      if (month < 1 || month > 12 || year < 2000 || year > 2100) {
        return NextResponse.json({ error: 'Mes o año inválido' }, { status: 400 })
      }

      startDate = new Date(year, month - 1, 1)
      endDate = new Date(year, month, 0, 23, 59, 59, 999)
    } else {
      const parsedStartDate = parseOptionalDateParam(searchParams.get('startDate'))
      const parsedEndDate = parseOptionalDateParam(searchParams.get('endDate'))

      if (parsedStartDate === null || parsedEndDate === null) {
        const now = new Date()
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      } else {
        startDate = parsedStartDate || undefined
        endDate = parsedEndDate || undefined
      }
    }

    const report = await ReportService.getLoanProfitabilityReport(startDate, endDate)

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error generating profitability report:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al generar el reporte' },
      { status: 500 }
    )
  }
}
