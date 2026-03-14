'use client'

import { useMemo, useState } from 'react'
import type { LoanStatus } from '@prisma/client'
import { BarChart3, Coins, TrendingUp, Users } from 'lucide-react'
import { ExportButton } from '@/components/export/ExportButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatPercentage } from '@/lib/formatters/currency'
import { formatDate } from '@/lib/formatters/date'
import { matchesSearchTerm } from '@/lib/utils/search'
import { CollectorManagementTab } from '@/components/collectors/CollectorManagementTab'
import type {
  AgingReportBucket,
  CollectionReportData,
  LoanProfitabilityReportItem,
  PortfolioReportData,
} from '@/services/reportService'

interface ProfitabilityRow
  extends Omit<LoanProfitabilityReportItem, 'disbursementDate' | 'status' | 'extensions'> {
  disbursementDate: string
  status: LoanStatus
  extensions: Array<{
    extendedAt: string
    previousInterestRate: number
    newInterestRate: number
    additionalMonths: number
  }>
}

interface ReportsWorkspaceProps {
  portfolioReport: PortfolioReportData
  agingReport: AgingReportBucket[]
  collectionReport: CollectionReportData
  profitabilityReport: ProfitabilityRow[]
  activeTab?: string
  onTabChange?: (value: string) => void
  selectedMonth?: number
  selectedYear?: number
}

type ProfitabilityStatusFilter = 'ALL' | LoanStatus

const profitabilityFilters: Array<{ label: string; value: ProfitabilityStatusFilter }> = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Activos', value: 'ACTIVE' },
  { label: 'Pagados', value: 'PAID' },
  { label: 'Mora', value: 'DEFAULTED' },
]

function formatInterestRate(value: number) {
  return `${formatPercentage(value)} mensual`
}

export function ReportsWorkspace({
  portfolioReport,
  agingReport,
  collectionReport,
  profitabilityReport,
  activeTab = 'portfolio',
  onTabChange,
  selectedMonth,
  selectedYear,
}: ReportsWorkspaceProps) {
  const [profitabilityQuery, setProfitabilityQuery] = useState('')
  const [profitabilityStatus, setProfitabilityStatus] = useState<ProfitabilityStatusFilter>('ALL')

  const filteredProfitability = useMemo(() => {
    return profitabilityReport.filter(item => {
      const matchesStatus =
        profitabilityStatus === 'ALL' || item.status === profitabilityStatus

      const matchesQuery = matchesSearchTerm(profitabilityQuery, [
        item.clientName,
        item.clientTaxId,
        item.loanNumber,
        item.status,
      ])

      return matchesStatus && matchesQuery
    })
  }, [profitabilityQuery, profitabilityReport, profitabilityStatus])

  const profitabilitySummary = useMemo(() => {
    return filteredProfitability.reduce(
      (acc, item) => {
        acc.totalPrincipal += item.principalAmount
        acc.totalCollected += item.totalRevenueCollected
        acc.totalExpected += item.expectedRevenue
        acc.totalProjectedInterest += item.interestProjected
        return acc
      },
      {
        totalPrincipal: 0,
        totalCollected: 0,
        totalExpected: 0,
        totalProjectedInterest: 0,
      }
    )
  }, [filteredProfitability])

  const profitabilityRecoveryRate =
    profitabilitySummary.totalExpected > 0
      ? profitabilitySummary.totalCollected / profitabilitySummary.totalExpected
      : 0

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 gap-1 md:grid-cols-4">
          <TabsTrigger value="portfolio">
            <BarChart3 className="mr-2 h-4 w-4" />
            Cartera
          </TabsTrigger>
          <TabsTrigger value="aging">
            <TrendingUp className="mr-2 h-4 w-4" />
            Vencimientos
          </TabsTrigger>
          <TabsTrigger value="collection">
            <Users className="mr-2 h-4 w-4" />
            Cobranza
          </TabsTrigger>
          <TabsTrigger value="profitability">
            <Coins className="mr-2 h-4 w-4" />
            Rentabilidad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Préstamos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{portfolioReport.totalLoans}</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Activos</p>
                    <p className="font-medium text-green-600">{portfolioReport.activeLoans}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pagados</p>
                    <p className="font-medium text-blue-600">{portfolioReport.paidOffLoans}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mora</p>
                    <p className="font-medium text-red-600">{portfolioReport.defaultedLoans}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Capital Desembolsado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(portfolioReport.totalPrincipalDisbursed)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Promedio: {formatCurrency(portfolioReport.averageLoanAmount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Saldo Pendiente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(portfolioReport.totalOutstanding)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pagado: {formatCurrency(portfolioReport.totalPaidPrincipal)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ingresos Totales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    portfolioReport.totalInterestEarned + portfolioReport.totalPenaltiesEarned
                  )}
                </div>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Intereses:</span>
                    <span className="font-medium">
                      {formatCurrency(portfolioReport.totalInterestEarned)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Moras:</span>
                    <span className="font-medium">
                      {formatCurrency(portfolioReport.totalPenaltiesEarned)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resumen de Cartera</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tasa de Interés Promedio</span>
                  <span className="text-lg font-bold">
                    {formatPercentage(portfolioReport.averageInterestRate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tasa de Recuperación</span>
                  <span className="text-lg font-bold">
                    {portfolioReport.totalPrincipalDisbursed > 0
                      ? (
                          (portfolioReport.totalPaidPrincipal /
                            portfolioReport.totalPrincipalDisbursed) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tasa de Morosidad</span>
                  <span className="text-lg font-bold text-red-600">
                    {portfolioReport.totalLoans > 0
                      ? ((portfolioReport.defaultedLoans / portfolioReport.totalLoans) * 100).toFixed(
                          1
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging" className="space-y-4">
          <div className="grid gap-4">
            {agingReport.map(bucket => (
              <Card key={bucket.range}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">{bucket.range}</h3>
                      <p className="text-sm text-muted-foreground">{bucket.count} cuotas</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{formatCurrency(bucket.totalAmount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {bucket.percentage.toFixed(1)}% del total vencido
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${Math.min(bucket.percentage, 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resumen de Cartera Vencida</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Vencido</span>
                  <span className="text-xl font-bold text-red-600">
                    {formatCurrency(agingReport.reduce((sum, bucket) => sum + bucket.totalAmount, 0))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Cuotas Vencidas</span>
                  <span className="text-xl font-bold">
                    {agingReport.reduce((sum, bucket) => sum + bucket.count, 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collection" className="space-y-4">
          <CollectorManagementTab
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        </TabsContent>

        <TabsContent value="profitability" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Préstamos en Reporte
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredProfitability.length}</div>
                <p className="mt-1 text-xs text-muted-foreground">Sobre {profitabilityReport.length} operaciones</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Capital Prestado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(profitabilitySummary.totalPrincipal)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Capital base del filtro actual</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ganancia Cobrada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(profitabilitySummary.totalCollected)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Intereses y mora ya cobrados</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ganancia Esperada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#8d6730]">
                  {formatCurrency(profitabilitySummary.totalExpected)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Interés proyectado más mora cobrada</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <CardTitle>Rentabilidad por Préstamo</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Exporta el filtro actual con capital, interés inicial, interés vigente,
                  prórrogas, ganancia cobrada y ganancia esperada.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-[#e3eaf2] bg-[#f8fbff] px-4 py-2 text-sm">
                  <span className="text-muted-foreground">Cobrado / esperado: </span>
                  <span className="font-semibold text-[#14263f]">
                    {formatPercentage(profitabilityRecoveryRate)}
                  </span>
                </div>
                <ExportButton
                  data={filteredProfitability}
                  filename="rentabilidad_prestamos"
                  type="profitability"
                  disabled={filteredProfitability.length === 0}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_auto]">
                <input
                  value={profitabilityQuery}
                  onChange={event => setProfitabilityQuery(event.target.value)}
                  placeholder="Buscar por cliente, DNI/CIF o número de préstamo..."
                  className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <div className="flex flex-wrap gap-2">
                  {profitabilityFilters.map(filter => (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setProfitabilityStatus(filter.value)}
                      className={`rounded-2xl border px-4 py-2 text-sm font-medium transition-colors ${
                        profitabilityStatus === filter.value
                          ? 'border-[#14263f] bg-[#14263f] text-white'
                          : 'border-input bg-background text-foreground'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Aquí ves por préstamo cuánto se prestó, cuánto se ha ganado y en cuántos meses corre la operación.
              </p>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-[#e3eaf2] bg-[#f8fbff] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Operaciones visibles
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#14263f]">
                    {filteredProfitability.length}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    De {profitabilityReport.length} préstamos en el reporte
                  </p>
                </div>
                <div className="rounded-2xl border border-[#e8efe9] bg-[#f5fbf7] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Ganó
                  </p>
                  <p className="mt-2 text-2xl font-bold text-green-600">
                    {formatCurrency(profitabilitySummary.totalCollected)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ingresos ya cobrados en el filtro actual
                  </p>
                </div>
                <div className="rounded-2xl border border-[#f3e7d1] bg-[#fff8ee] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Interés Proyectado
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#8d6730]">
                    {formatCurrency(profitabilitySummary.totalProjectedInterest)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Potencial total de interés del filtro actual
                  </p>
                </div>
                <div className="rounded-2xl border border-[#ece7fa] bg-[#faf7ff] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Cobrado / esperado
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#5b4ca1]">
                    {formatPercentage(profitabilityRecoveryRate)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Avance real sobre la rentabilidad esperada
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {filteredProfitability.map(item => (
                  <div
                    key={item.loanId}
                    className="rounded-2xl border border-[#e3eaf2] bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-[#14263f]">{item.clientName}</h3>
                          <StatusBadge type="loan" value={item.status} />
                          <span className="rounded-full bg-[#f8efe0] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8d6730]">
                            {item.loanNumber}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {item.clientTaxId && <span>DNI/CIF: {item.clientTaxId}</span>}
                          <span>Desembolso: {formatDate(item.disbursementDate)}</span>
                          <span>
                            Plazo: {item.termMonths} meses
                            {item.originalTermMonths !== item.termMonths &&
                              ` (base ${item.originalTermMonths})`}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm">
                          <span className="rounded-full bg-[#eef4fb] px-3 py-1 text-[#14263f]">
                            Interés inicial: {formatInterestRate(item.originalInterestRate)}
                          </span>
                          <span className="rounded-full bg-[#f8efe0] px-3 py-1 text-[#8d6730]">
                            Interés vigente: {formatInterestRate(item.currentInterestRate)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm">
                          {item.extensions.length > 0 ? (
                            item.extensions.map((extension, index) => (
                              <span
                                key={`${item.loanId}-extension-${index}`}
                                className="rounded-full bg-[#fff7ed] px-3 py-1 text-[#9a5b15]"
                              >
                                Prórroga {index + 1}: +{extension.additionalMonths} cuotas al{' '}
                                {formatPercentage(extension.newInterestRate)}
                                {extension.previousInterestRate !== extension.newInterestRate &&
                                  ` (antes ${formatPercentage(extension.previousInterestRate)})`}{' '}
                                desde{' '}
                                {formatDate(extension.extendedAt)}
                              </span>
                            ))
                          ) : (
                            <span className="rounded-full bg-[#f5f7fa] px-3 py-1 text-muted-foreground">
                              Sin prórroga
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-5">
                        <div className="rounded-xl bg-[#f8fbff] px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Prestado
                          </p>
                          <p className="mt-2 text-xl font-bold text-[#14263f]">
                            {formatCurrency(item.principalAmount)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-[#f5fbf7] px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Ganó
                          </p>
                          <p className="mt-2 text-xl font-bold text-green-600">
                            {formatCurrency(item.totalRevenueCollected)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Interés cobrado + mora cobrada
                          </p>
                        </div>
                        <div className="rounded-xl bg-[#fff8ee] px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Esperado
                          </p>
                          <p className="mt-2 text-xl font-bold text-[#8d6730]">
                            {formatCurrency(item.expectedRevenue)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-[#faf7ff] px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Interés Proy.
                          </p>
                          <p className="mt-2 text-xl font-bold text-[#5b4ca1]">
                            {formatCurrency(item.interestProjected)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Interés total del cronograma
                          </p>
                        </div>
                        <div className="rounded-xl bg-[#f8fbff] px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Promedio / mes
                          </p>
                          <p className="mt-2 text-xl font-bold text-[#14263f]">
                            {formatCurrency(item.monthlyProjectedRevenue)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Rentabilidad esperada mensual
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredProfitability.length === 0 && (
                  <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                    No hay préstamos que coincidan con este criterio.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
