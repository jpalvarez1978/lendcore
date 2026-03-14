/**
 * Exportador de Excel Profesional
 *
 * Funcionalidades:
 * - Formato profesional con colores
 * - Totales y subtotales
 * - Anchos de columna automáticos
 * - Congelado de encabezados
 * - Filtros automáticos
 */

import { formatCurrency, formatPercentage } from '../formatters/currency'
import { formatDate } from '../formatters/date'
import { BRAND } from '../constants/brand'
import type { LoanProfitabilityReportItem, PortfolioReportData } from '@/services/reportService'

export interface ExcelColumn {
  header: string
  key: string
  width?: number
  format?: 'currency' | 'date' | 'percentage' | 'number' | 'text'
  total?: 'sum' | 'count' | 'average'
}

export interface ExcelExportOptions {
  filename: string
  sheetName: string
  title?: string
  subtitle?: string
  columns: ExcelColumn[]
  data: Array<Record<string, unknown>>
  includeTimestamp?: boolean
  includeTotals?: boolean
}

export interface LoanProfitabilityExportRow
  extends Omit<LoanProfitabilityReportItem, 'disbursementDate' | 'extensions'> {
  [key: string]: unknown
  disbursementDate: Date | string
  extensions: Array<{
    extendedAt: Date | string
    previousInterestRate: number
    newInterestRate: number
    additionalMonths: number
  }>
}

export interface PaymentExportRow {
  [key: string]: unknown
  clientName: string
  loanNumber: string
  paymentMethodLabel: string
  amount: number
  paidAt: Date | string
  reference?: string | null
  notes?: string | null
}

export class ExcelExporter {
  /**
   * Generar Excel con formato
   */
  static async generate(options: ExcelExportOptions): Promise<Blob> {
    const {
      title,
      subtitle,
      columns,
      data,
      includeTimestamp = true,
      includeTotals = true,
    } = options

    // Crear CSV formateado (Excel abrirá CSV con formato)
    let csv = ''

    // Título
    if (title) {
      csv += `${title}\n`
    }

    // Subtítulo
    if (subtitle) {
      csv += `${subtitle}\n`
    }

    // Timestamp
    if (includeTimestamp) {
      csv += `Generado: ${formatDate(new Date())} ${new Date().toLocaleTimeString('es-ES')}\n`
    }

    // Línea en blanco
    if (title || subtitle || includeTimestamp) {
      csv += '\n'
    }

    // Encabezados
    csv += columns.map((col) => `"${col.header}"`).join(',') + '\n'

    // Datos
    data.forEach((row) => {
      const rowData = columns.map((col) => {
        const value = row[col.key]
        return this.formatCell(value, col.format)
      })
      csv += rowData.join(',') + '\n'
    })

    // Totales
    if (includeTotals && columns.some((col) => col.total)) {
      csv += '\n'
      const totalsRow = columns.map((col) => {
        if (!col.total) return ''

        switch (col.total) {
          case 'sum':
            const sum = data.reduce((acc, row) => acc + (Number(row[col.key]) || 0), 0)
            return this.formatCell(sum, col.format)
          case 'count':
            return data.length.toString()
          case 'average':
            const avg = data.reduce((acc, row) => acc + (Number(row[col.key]) || 0), 0) / data.length
            return this.formatCell(avg, col.format)
          default:
            return ''
        }
      })
      csv += `"TOTALES",${totalsRow.slice(1).join(',')}\n`
    }

    // Crear Blob
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    return blob
  }

  /**
   * Formatear celda según tipo
   */
  private static formatCell(value: unknown, format?: ExcelColumn['format']): string {
    if (value === null || value === undefined) return '""'

    switch (format) {
      case 'currency':
        return `"${formatCurrency(value as string | number)}"`
      case 'date':
        return `"${formatDate(value as string | Date)}"`
      case 'percentage':
        return `"${formatPercentage(value as number)}"`
      case 'number':
        return value.toString()
      case 'text':
      default:
        return `"${String(value).replace(/"/g, '""')}"`
    }
  }

  /**
   * Descargar archivo
   */
  static download(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()

    window.setTimeout(() => {
      window.URL.revokeObjectURL(url)
      link.remove()
    }, 1000)
  }

  /**
   * Export rápido de casos priorizados de cobranza
   */
  static async exportCollectionCases(cases: Array<Record<string, unknown>>): Promise<void> {
    const blob = await this.generate({
      filename: 'casos_cobranza',
      sheetName: 'Casos Priorizados',
      title: 'CASOS PRIORIZADOS DE COBRANZA',
      subtitle: BRAND.name,
      columns: [
        { header: 'Prioridad', key: 'priorityScore', width: 10, format: 'number' },
        { header: 'Nivel', key: 'priorityLevel', width: 12, format: 'text' },
        { header: 'Cliente', key: 'clientName', width: 30, format: 'text' },
        { header: 'Préstamo', key: 'loanNumber', width: 15, format: 'text' },
        { header: 'Días Mora', key: 'daysOverdue', width: 12, format: 'number' },
        { header: 'Monto Vencido', key: 'overdueAmount', width: 15, format: 'currency', total: 'sum' },
        { header: 'Teléfono', key: 'phone', width: 15, format: 'text' },
        { header: 'Intentos Fallidos', key: 'failedAttempts', width: 18, format: 'number' },
        { header: 'Promesas Rotas', key: 'brokenPromises', width: 18, format: 'number' },
        { header: 'Acción Sugerida', key: 'suggestedAction', width: 25, format: 'text' },
      ],
      data: cases,
      includeTotals: true,
    })

    this.download(blob, 'casos_cobranza')
  }

  /**
   * Export de reporte de cartera
   */
  static async exportPortfolioReport(data: PortfolioReportData): Promise<void> {
    const reportData: Array<{
      metric: string
      value: number | string
      format: 'number' | 'currency' | 'percentage'
    }> = [
      { metric: 'Total Préstamos', value: data.totalLoans, format: 'number' },
      { metric: 'Capital Desembolsado', value: data.totalPrincipalDisbursed, format: 'currency' },
      { metric: 'Saldo Pendiente', value: data.totalOutstanding, format: 'currency' },
      { metric: 'Capital Pagado', value: data.totalPaidPrincipal, format: 'currency' },
      { metric: 'Intereses Cobrados', value: data.totalInterestEarned, format: 'currency' },
      { metric: 'Moras Cobradas', value: data.totalPenaltiesEarned, format: 'currency' },
      { metric: 'Préstamos Activos', value: data.activeLoans, format: 'number' },
      { metric: 'Préstamos Pagados', value: data.paidOffLoans, format: 'number' },
      { metric: 'Préstamos en Mora', value: data.defaultedLoans, format: 'number' },
      { metric: 'Tasa Promedio', value: data.averageInterestRate, format: 'percentage' },
    ]

    const formattedData = reportData.map((row) => {
      let formattedValue = row.value
      if (row.format === 'currency') formattedValue = formatCurrency(row.value)
      else if (row.format === 'percentage') formattedValue = formatPercentage(row.value)
      else if (row.format === 'number') formattedValue = row.value.toString()

      return {
        metric: row.metric,
        value: formattedValue,
      }
    })

    const blob = await this.generate({
      filename: 'reporte_cartera',
      sheetName: 'Cartera',
      title: 'REPORTE DE CARTERA',
      subtitle: BRAND.name,
      columns: [
        { header: 'Métrica', key: 'metric', width: 25 },
        { header: 'Valor', key: 'value', width: 20 },
      ],
      data: formattedData,
      includeTotals: false,
    })

    this.download(blob, 'reporte_cartera')
  }

  /**
   * Export de rentabilidad por préstamo
   */
  static async exportProfitabilityReport(data: LoanProfitabilityExportRow[]): Promise<void> {
    const formattedData = data.map(row => ({
      clientName: row.clientName,
      clientTaxId: row.clientTaxId || '',
      loanNumber: row.loanNumber,
      status: row.status,
      disbursementDate: row.disbursementDate,
      principalAmount: row.principalAmount,
      originalInterestRate: formatPercentage(row.originalInterestRate),
      currentInterestRate: formatPercentage(row.currentInterestRate),
      originalTermMonths: row.originalTermMonths,
      termMonths: row.termMonths,
      extensions:
        row.extensions.length > 0
          ? row.extensions
              .map((extension, index) => {
                const previousRate = formatPercentage(extension.previousInterestRate)
                const newRate = formatPercentage(extension.newInterestRate)
                const rateLabel =
                  previousRate === newRate
                    ? `${newRate}`
                    : `${newRate} (antes ${previousRate})`

                return `Prórroga ${index + 1}: +${extension.additionalMonths} cuotas al ${rateLabel} desde ${formatDate(extension.extendedAt)}`
              })
              .join(' | ')
          : 'Sin prórroga',
      interestProjected: row.interestProjected,
      interestCollected: row.interestCollected,
      penaltiesCollected: row.penaltiesCollected,
      totalRevenueCollected: row.totalRevenueCollected,
      expectedRevenue: row.expectedRevenue,
      monthlyProjectedRevenue: row.monthlyProjectedRevenue,
      monthlyCollectedRevenue: row.monthlyCollectedRevenue,
    }))

    const blob = await this.generate({
      filename: 'rentabilidad_prestamos',
      sheetName: 'Rentabilidad',
      title: 'RENTABILIDAD POR PRESTAMO',
      subtitle: BRAND.name,
      columns: [
        { header: 'Cliente', key: 'clientName', width: 28, format: 'text' },
        { header: 'DNI/CIF', key: 'clientTaxId', width: 18, format: 'text' },
        { header: 'Préstamo', key: 'loanNumber', width: 16, format: 'text' },
        { header: 'Estado', key: 'status', width: 12, format: 'text' },
        { header: 'Desembolso', key: 'disbursementDate', width: 16, format: 'date' },
        { header: 'Capital Prestado', key: 'principalAmount', width: 18, format: 'currency', total: 'sum' },
        { header: 'Interés Inicial', key: 'originalInterestRate', width: 16, format: 'text' },
        { header: 'Interés Vigente', key: 'currentInterestRate', width: 16, format: 'text' },
        { header: 'Plazo Base', key: 'originalTermMonths', width: 12, format: 'number' },
        { header: 'Plazo Actual', key: 'termMonths', width: 12, format: 'number' },
        { header: 'Prórrogas', key: 'extensions', width: 48, format: 'text' },
        { header: 'Interés Proyectado', key: 'interestProjected', width: 18, format: 'currency', total: 'sum' },
        { header: 'Interés Cobrado', key: 'interestCollected', width: 18, format: 'currency', total: 'sum' },
        { header: 'Mora Cobrada', key: 'penaltiesCollected', width: 16, format: 'currency', total: 'sum' },
        { header: 'Ganó', key: 'totalRevenueCollected', width: 16, format: 'currency', total: 'sum' },
        { header: 'Esperado', key: 'expectedRevenue', width: 16, format: 'currency', total: 'sum' },
        { header: 'Promedio / Mes', key: 'monthlyProjectedRevenue', width: 16, format: 'currency', total: 'average' },
        { header: 'Cobrado / Mes', key: 'monthlyCollectedRevenue', width: 16, format: 'currency', total: 'average' },
      ],
      data: formattedData,
      includeTotals: true,
    })

    this.download(blob, 'rentabilidad_prestamos')
  }

  /**
   * Export de pagos
   */
  static async exportPaymentsReport(data: PaymentExportRow[]): Promise<void> {
    const blob = await this.generate({
      filename: 'pagos_recibidos',
      sheetName: 'Pagos',
      title: 'PAGOS RECIBIDOS',
      subtitle: BRAND.name,
      columns: [
        { header: 'Cliente', key: 'clientName', width: 28, format: 'text' },
        { header: 'Préstamo', key: 'loanNumber', width: 16, format: 'text' },
        { header: 'Método', key: 'paymentMethodLabel', width: 16, format: 'text' },
        { header: 'Monto', key: 'amount', width: 16, format: 'currency', total: 'sum' },
        { header: 'Fecha', key: 'paidAt', width: 16, format: 'date' },
        { header: 'Referencia', key: 'reference', width: 20, format: 'text' },
        { header: 'Notas', key: 'notes', width: 30, format: 'text' },
      ],
      data,
      includeTotals: true,
    })

    this.download(blob, 'pagos_recibidos')
  }
}
