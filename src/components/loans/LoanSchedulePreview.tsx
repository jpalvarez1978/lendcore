'use client'

/**
 * PREVIEW DEL CRONOGRAMA DE PRÉSTAMO
 *
 * Muestra el cronograma calculado en tiempo real
 * Diseño profesional con resumen financiero destacado
 */

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/formatters/currency'
import { formatDate } from '@/lib/formatters/date'
import {
  calculateLoanSummary,
  type UnifiedLoanTerms,
} from '@/lib/calculations/amortization'
import { Calendar, DollarSign, AlertCircle } from 'lucide-react'

interface LoanSchedulePreviewProps {
  terms: UnifiedLoanTerms
  compact?: boolean
}

export function LoanSchedulePreview({ terms, compact = false }: LoanSchedulePreviewProps) {
  const { installments, summary } = useMemo(() => {
    try {
      return calculateLoanSummary(terms)
    } catch {
      return {
        installments: [],
        summary: {
          principalAmount: 0,
          totalInterest: 0,
          totalToPay: 0,
          numberOfInstallments: 0,
        },
      }
    }
  }, [terms])

  if (installments.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">
              Completa los datos del préstamo para ver el cronograma
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumen Financiero */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-slate-900">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Resumen Financiero
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Monto Prestado</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(summary.principalAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Intereses</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(summary.totalInterest)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total a Pagar</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalToPay)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Número de Cuotas</p>
              <p className="text-2xl font-bold">{summary.numberOfInstallments}</p>
            </div>
          </div>

          {/* Información específica del tipo de préstamo */}
          {terms.amortizationType === 'AMERICAN' && summary.regularInstallmentAmount && (
            <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">
                  Cuotas Regulares (solo interés)
                </p>
                <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                  {formatCurrency(summary.regularInstallmentAmount)}
                </p>
              </div>
              <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">
                  Última Cuota (capital + interés)
                </p>
                <p className="text-lg font-semibold text-orange-700 dark:text-orange-400">
                  {formatCurrency(summary.lastInstallmentAmount || 0)}
                </p>
              </div>
            </div>
          )}

          {terms.amortizationType === 'FRENCH' && summary.fixedInstallmentAmount && (
            <div className="mt-4 pt-4 border-t">
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">
                  Cuota Fija Mensual
                </p>
                <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {formatCurrency(summary.fixedInstallmentAmount)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Todas las cuotas son iguales
                </p>
              </div>
            </div>
          )}

          {terms.amortizationType === 'GERMAN' && summary.firstInstallmentAmount && (
            <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Primera Cuota</p>
                <p className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                  {formatCurrency(summary.firstInstallmentAmount)}
                </p>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Última Cuota</p>
                <p className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                  {formatCurrency(summary.lastInstallmentAmount || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Cuotas decrecientes</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cronograma Detallado */}
      {!compact && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Cronograma de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-semibold">Cuota</th>
                    <th className="text-left p-2 font-semibold">Fecha</th>
                    <th className="text-right p-2 font-semibold">Capital</th>
                    <th className="text-right p-2 font-semibold">Interés</th>
                    <th className="text-right p-2 font-semibold">Total</th>
                    {terms.amortizationType !== 'SIMPLE' && (
                      <th className="text-right p-2 font-semibold">Saldo</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {installments.map((inst, index) => {
                    const saldo =
                      summary.principalAmount -
                      installments
                        .slice(0, index + 1)
                        .reduce((sum, i) => sum + i.principalAmount, 0)

                    const isLastInstallment =
                      inst.installmentNumber === installments.length

                    return (
                      <tr
                        key={inst.installmentNumber}
                        className={`border-b hover:bg-muted/30 transition-colors ${
                          isLastInstallment ? 'bg-orange-50 dark:bg-orange-950/20' : ''
                        }`}
                      >
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{inst.installmentNumber}</span>
                            {isLastInstallment && (
                              <Badge variant="secondary" className="text-[10px]">
                                Última
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {formatDate(inst.dueDate)}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {formatCurrency(inst.principalAmount)}
                        </td>
                        <td className="p-2 text-right font-mono text-orange-600">
                          {formatCurrency(inst.interestAmount)}
                        </td>
                        <td className="p-2 text-right font-mono font-semibold">
                          {formatCurrency(inst.totalAmount)}
                        </td>
                        {terms.amortizationType !== 'SIMPLE' && (
                          <td className="p-2 text-right font-mono text-muted-foreground">
                            {formatCurrency(saldo)}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-muted/50 font-semibold">
                    <td className="p-2" colSpan={2}>
                      TOTALES
                    </td>
                    <td className="p-2 text-right font-mono">
                      {formatCurrency(summary.principalAmount)}
                    </td>
                    <td className="p-2 text-right font-mono text-orange-600">
                      {formatCurrency(summary.totalInterest)}
                    </td>
                    <td className="p-2 text-right font-mono">
                      {formatCurrency(summary.totalToPay)}
                    </td>
                    {terms.amortizationType !== 'SIMPLE' && (
                      <td className="p-2 text-right font-mono">0.00€</td>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advertencia para préstamo americano */}
      {terms.amortizationType === 'AMERICAN' && !compact && (
        <div className="rounded-lg border-2 border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-900 dark:text-orange-200 mb-1">
                Importante: Préstamo Tipo Americano
              </p>
              <p className="text-xs text-orange-800 dark:text-orange-300">
                Durante {summary.numberOfInstallments - 1} meses, el cliente solo pagará{' '}
                <strong>{formatCurrency(summary.regularInstallmentAmount || 0)}</strong>{' '}
                (intereses). En la última cuota, deberá pagar{' '}
                <strong>{formatCurrency(summary.lastInstallmentAmount || 0)}</strong>{' '}
                (capital completo + intereses). Asegúrate de que el cliente entienda esto.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
