'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { ExcelExporter } from '@/lib/export/excelExporter'
import type { LoanProfitabilityExportRow, PaymentExportRow } from '@/lib/export/excelExporter'
import type { PortfolioReportData } from '@/services/reportService'

interface ExportButtonProps {
  data: unknown
  filename: string
  type: 'collection' | 'portfolio' | 'profitability' | 'payments' | 'custom'
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  disabled?: boolean
}

export function ExportButton({
  data,
  filename,
  type,
  variant = 'outline',
  size = 'default',
  disabled = false,
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExportExcel = async () => {
    setLoading(true)

    try {
      if (type === 'collection') {
        await ExcelExporter.exportCollectionCases(data as Array<Record<string, unknown>>)
      } else if (type === 'portfolio') {
        await ExcelExporter.exportPortfolioReport(data as PortfolioReportData)
      } else if (type === 'profitability') {
        await ExcelExporter.exportProfitabilityReport(data as LoanProfitabilityExportRow[])
      } else if (type === 'payments') {
        await ExcelExporter.exportPaymentsReport(data as PaymentExportRow[])
      }

      toast({
        title: 'Exportación Exitosa',
        description: `El archivo ${filename}.csv se ha descargado correctamente`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        variant: 'destructive',
        title: 'Error al Exportar',
        description: 'No se pudo generar el archivo',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      disabled={loading || disabled}
      onClick={handleExportExcel}
      aria-label={`Exportar ${filename} en CSV`}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Exportar CSV
    </Button>
  )
}
