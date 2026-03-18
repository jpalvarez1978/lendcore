'use client'

import { useEffect, useState } from 'react'
import { ReportsWorkspace } from '@/components/reports/ReportsWorkspace'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from 'lucide-react'
import type {
  AgingReportBucket,
  CollectionReportData,
  LoanProfitabilityReportItem,
  PortfolioReportData,
} from '@/services/reportService'

// Generar años (2026 a 2030)
const YEARS = Array.from({ length: 5 }, (_, i) => 2026 + i)

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

interface SerializedProfitabilityItem
  extends Omit<LoanProfitabilityReportItem, 'disbursementDate' | 'extensions'> {
  disbursementDate: string
  extensions: Array<{
    extendedAt: string
    previousInterestRate: number
    newInterestRate: number
    additionalMonths: number
  }>
}

export default function ReportesPage() {
  // Estado para filtros de fecha
  const currentDate = new Date()
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear())
  const [loading, setLoading] = useState(true)

  // Estado para pestaña activa (persiste al cambiar mes/año)
  const [activeTab, setActiveTab] = useState<string>('portfolio')

  // Estado para datos de reportes
  const [portfolioReport, setPortfolioReport] = useState<PortfolioReportData | null>(null)
  const [agingReport, setAgingReport] = useState<AgingReportBucket[]>([])
  const [collectionReport, setCollectionReport] = useState<CollectionReportData | null>(null)
  const [profitabilityReport, setProfitabilityReport] = useState<SerializedProfitabilityItem[]>([])

  // Fetch de datos cuando cambian los filtros
  useEffect(() => {
    async function fetchReports() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          month: selectedMonth.toString(),
          year: selectedYear.toString(),
        })

        const [portfolioRes, agingRes, collectionRes, profitabilityRes] = await Promise.all([
          fetch(`/api/reports/portfolio?${params}`),
          fetch(`/api/reports/aging?${params}`),
          fetch(`/api/reports/collection?${params}`),
          fetch(`/api/reports/profitability?${params}`),
        ])

        const portfolio = portfolioRes.ok ? await portfolioRes.json() : null
        const aging = agingRes.ok ? await agingRes.json() : []
        const collection = collectionRes.ok ? await collectionRes.json() : null
        const profitability = profitabilityRes.ok ? await profitabilityRes.json() : []

        // Ensure arrays are actually arrays (API might return error object)
        setPortfolioReport(portfolio?.error ? null : portfolio)
        setAgingReport(Array.isArray(aging) ? aging : [])
        setCollectionReport(collection?.error ? null : collection)
        setProfitabilityReport(Array.isArray(profitability) ? profitability : [])
      } catch (error) {
        console.error('Error fetching reports:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [selectedMonth, selectedYear])

  if (loading || !portfolioReport || !collectionReport) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4" />
          <p className="text-sm text-gray-600">Cargando reportes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con filtros de fecha */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground">
            Análisis, cobranza y rentabilidad por préstamo de la cartera.
          </p>
        </div>

        {/* Filtros de Mes y Año */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Periodo:</span>
          </div>

          {/* Selector de Mes */}
          <Select
            value={selectedMonth.toString()}
            onValueChange={(value) => setSelectedMonth(parseInt(value))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Selector de Año */}
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Workspace con datos */}
      <ReportsWorkspace
        portfolioReport={portfolioReport}
        agingReport={agingReport}
        collectionReport={collectionReport}
        profitabilityReport={profitabilityReport}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />
    </div>
  )
}
