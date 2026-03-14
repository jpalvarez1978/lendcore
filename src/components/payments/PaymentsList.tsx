'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, Loader2, Search, X } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters/currency'
import { formatDateTime, formatRelativeDate } from '@/lib/formatters/date'
import { downloadPaymentReceipt } from '@/lib/utils/paymentReceiptDownload'
import { matchesSearchTerm } from '@/lib/utils/search'

interface Payment {
  id: string
  amount: number
  paymentMethod: string
  paidAt: Date
  reference?: string | null
  notes?: string | null
  loan: {
    loanNumber: string
    client: {
      type: string
      individualProfile?: {
        firstName: string
        lastName: string
      } | null
      businessProfile?: {
        businessName: string
      } | null
    }
  }
}

interface PaymentsListProps {
  payments: Payment[]
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Efectivo',
  BANK_TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  CHECK: 'Cheque',
  OTHER: 'Otro',
}

export function PaymentsList({ payments }: PaymentsListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const normalizedPayments = useMemo(() => {
    return payments.map(payment => ({
      ...payment,
      clientName:
        payment.loan.client.type === 'INDIVIDUAL'
          ? `${payment.loan.client.individualProfile?.firstName || ''} ${payment.loan.client.individualProfile?.lastName || ''}`.trim()
          : payment.loan.client.businessProfile?.businessName || 'Cliente',
      paymentMethodLabel: paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod,
    }))
  }, [payments])

  const filteredPayments = useMemo(() => {
    return normalizedPayments.filter(payment =>
      matchesSearchTerm(query, [
        payment.clientName,
        payment.loan.loanNumber,
        payment.reference,
        payment.paymentMethodLabel,
        payment.notes,
        payment.amount,
      ])
    )
  }, [normalizedPayments, query])

  const suggestions = filteredPayments.slice(0, 6)
  const filteredTotalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const cashPayments = filteredPayments.filter(payment => payment.paymentMethod === 'CASH').length

  const handleDownloadReceipt = async (paymentId: string) => {
    try {
      setDownloadingId(paymentId)
      await downloadPaymentReceipt(paymentId)
    } catch (error) {
      console.error('Error downloading receipt:', error)
      alert(error instanceof Error ? error.message : 'Error al descargar el recibo')
    } finally {
      setDownloadingId(null)
    }
  }

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No hay pagos registrados</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div ref={containerRef} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={event => {
              setQuery(event.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Buscar por cliente, préstamo, referencia o método..."
            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setShowSuggestions(false)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {showSuggestions && query.trim().length > 0 && (
            <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-full rounded-2xl border bg-white p-2 shadow-lg">
              {suggestions.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground">
                  No se encontraron pagos.
                </div>
              ) : (
                <div className="space-y-1">
                  {suggestions.map(payment => (
                    <button
                      key={payment.id}
                      type="button"
                      onClick={() => {
                        setQuery(payment.reference || payment.clientName)
                        setShowSuggestions(false)
                      }}
                      className="flex w-full items-start justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{payment.clientName}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {[payment.loan.loanNumber, payment.reference || payment.paymentMethodLabel]
                            .filter(Boolean)
                            .join(' • ')}
                        </p>
                      </div>
                      <span className="ml-3 text-sm font-semibold text-green-600">
                        {formatCurrency(payment.amount)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setQuery('')
            setShowSuggestions(false)
          }}
        >
          Limpiar búsqueda
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Mostrando {filteredPayments.length} de {payments.length} pagos. Coincidencia parcial por nombre, referencia o préstamo.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[1.25rem] border border-[#dce6f2] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Pagos visibles</p>
          <p className="mt-2 text-2xl font-bold text-[#14263f]">{filteredPayments.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Filtro aplicado en tiempo real</p>
        </div>
        <div className="rounded-[1.25rem] border border-[#e8efe9] bg-[linear-gradient(180deg,#f5fbf7_0%,#ffffff_100%)] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Monto visible</p>
          <p className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(filteredTotalAmount)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Total del filtro actual</p>
        </div>
        <div className="rounded-[1.25rem] border border-[#f1e4cd] bg-[linear-gradient(180deg,#fff8ee_0%,#ffffff_100%)] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Pagos en efectivo</p>
          <p className="mt-2 text-2xl font-bold text-[#8d6730]">{cashPayments}</p>
          <p className="mt-1 text-xs text-muted-foreground">Sobre los pagos visibles del listado</p>
        </div>
      </div>

      <div className="space-y-3">
        {filteredPayments.map(payment => (
          <div
            key={payment.id}
            className="rounded-[1.4rem] border border-[#e3eaf2] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] p-4 shadow-[0_16px_32px_-30px_rgba(20,38,63,0.3)] transition-colors hover:bg-accent/40"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <h3 className="font-semibold text-[#14263f]">{payment.clientName}</h3>
                  <Badge variant="outline" className="text-xs">
                    {payment.paymentMethodLabel}
                  </Badge>
                  <span className="rounded-full bg-[#f8efe0] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8d6730]">
                    {payment.loan.loanNumber}
                  </span>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
                  <span>Registrado: {formatDateTime(payment.paidAt)}</span>
                  <span>Referencia: {payment.reference || 'Sin referencia'}</span>
                  <span>{formatRelativeDate(payment.paidAt)}</span>
                </div>
                {payment.notes && (
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{payment.notes}</p>
                )}
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[190px]">
                <div className="rounded-xl bg-[#f5fbf7] px-4 py-3 text-left sm:text-right">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Monto abonado
                  </p>
                  <p className="mt-1 text-xl font-bold text-green-600">
                    {formatCurrency(payment.amount)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full rounded-xl"
                  onClick={() => handleDownloadReceipt(payment.id)}
                  disabled={downloadingId === payment.id}
                >
                  {downloadingId === payment.id ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-3 w-3" />
                      Descargar Recibo
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}

        {filteredPayments.length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            No hay pagos que coincidan con la búsqueda.
          </div>
        )}
      </div>
    </div>
  )
}
