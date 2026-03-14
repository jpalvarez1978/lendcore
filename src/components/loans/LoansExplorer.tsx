'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CreditCard, Eye, Filter, Search, TrendingUp, X } from 'lucide-react'
import type { LoanStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatPercentage } from '@/lib/formatters/currency'
import { formatDate } from '@/lib/formatters/date'
import { matchesSearchTerm } from '@/lib/utils/search'

interface LoanItem {
  id: string
  loanNumber: string
  status: LoanStatus
  clientName: string
  clientTaxId: string
  principalAmount: number
  totalPending: number
  totalInterest: number
  interestRate: number
  interestType: string
  termMonths: number
  disbursementDate: string
}

interface LoansExplorerProps {
  loans: LoanItem[]
  canCreateLoan?: boolean
  canRegisterPayment?: boolean
}

type StatusFilter = 'ALL' | LoanStatus

const statusButtons: Array<{ label: string; value: StatusFilter }> = [
  { label: 'Activos', value: 'ACTIVE' },
  { label: 'Vencidos', value: 'DEFAULTED' },
  { label: 'Pagados', value: 'PAID' },
]

function formatLoanRate(rate: number, interestType: string) {
  if (interestType === 'FIXED_AMOUNT') {
    return `${formatCurrency(rate)} fijo`
  }

  const cadence = interestType === 'PERCENTAGE_ANNUAL' ? 'anual' : 'mensual'
  return `${formatPercentage(rate)} ${cadence}`
}

export function LoansExplorer({
  loans,
  canCreateLoan = false,
  canRegisterPayment = false,
}: LoansExplorerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const filteredLoans = useMemo(() => {
    return loans.filter(loan => {
      const matchesStatus = statusFilter === 'ALL' || loan.status === statusFilter
      const matchesQuery = matchesSearchTerm(query, [
        loan.loanNumber,
        loan.clientName,
        loan.clientTaxId,
        loan.status,
      ])

      return matchesStatus && matchesQuery
    })
  }, [loans, query, statusFilter])

  const suggestions = filteredLoans.slice(0, 6)
  const totalPrincipal = loans.reduce((sum, loan) => sum + loan.principalAmount, 0)
  const totalOutstanding = loans.reduce((sum, loan) => sum + loan.totalPending, 0)
  const totalInterest = loans.reduce((sum, loan) => sum + loan.totalInterest, 0)
  const activeLoans = loans.filter(loan => loan.status === 'ACTIVE').length
  const defaultedLoans = loans.filter(loan => loan.status === 'DEFAULTED').length

  return (
    <div className="space-y-6">
      <Card className="rounded-[1.8rem] border-white/80 bg-white/88 shadow-[0_22px_44px_-34px_rgba(20,38,63,0.42)]">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 xl:flex-row">
            <div ref={containerRef} className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={event => {
                  setQuery(event.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Buscar por código, cliente o DNI/CIF..."
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
                      No se encontraron préstamos para esta búsqueda.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {suggestions.map(loan => (
                        <button
                          key={loan.id}
                          type="button"
                          onClick={() => {
                            setQuery(loan.loanNumber)
                            setShowSuggestions(false)
                          }}
                          className="flex w-full items-start justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{loan.loanNumber}</p>
                            <p className="truncate text-sm text-muted-foreground">
                              {[loan.clientName, loan.clientTaxId].filter(Boolean).join(' • ')}
                            </p>
                          </div>
                          <span className="ml-3 rounded-full bg-muted px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {loan.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {statusButtons.map(button => (
                <Button
                  key={button.value}
                  type="button"
                  variant={statusFilter === button.value ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(button.value)}
                >
                  {button.label}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStatusFilter('ALL')
                  setQuery('')
                  setShowSuggestions(false)
                }}
              >
                <Filter className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Búsqueda parcial por código, nombre del cliente o DNI/CIF.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <Card className="rounded-[1.6rem] border-[#dce6f2] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(20,38,63,0.46)]">
          <CardHeader className="pb-3">
            <CardDescription>Préstamos Visibles</CardDescription>
            <CardTitle className="text-[clamp(1.8rem,3vw,2.5rem)]">{filteredLoans.length}</CardTitle>
            <p className="text-xs text-muted-foreground">De {loans.length} operaciones en cartera</p>
          </CardHeader>
        </Card>
        <Card className="rounded-[1.6rem] border-[#e8efe9] bg-[linear-gradient(180deg,#f5fbf7_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(31,94,55,0.35)]">
          <CardHeader className="pb-3">
            <CardDescription>Capital Desembolsado</CardDescription>
            <CardTitle className="text-[clamp(1.45rem,2.4vw,2rem)]">{formatCurrency(totalPrincipal)}</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-[#208454]" />
              {activeLoans} activos sosteniendo la operación
            </div>
          </CardHeader>
        </Card>
        <Card className="rounded-[1.6rem] border-[#f1e4cd] bg-[linear-gradient(180deg,#fff8ee_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(141,103,48,0.32)]">
          <CardHeader className="pb-3">
            <CardDescription>Pendiente Vivo</CardDescription>
            <CardTitle className="text-[clamp(1.45rem,2.4vw,2rem)]">{formatCurrency(totalOutstanding)}</CardTitle>
            <p className="text-xs text-muted-foreground">Saldo actual por recuperar</p>
          </CardHeader>
        </Card>
        <Card className="rounded-[1.6rem] border-[#f3d8d6] bg-[linear-gradient(180deg,#fff8f8_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(166,53,43,0.28)]">
          <CardHeader className="pb-3">
            <CardDescription>Interés Proyectado</CardDescription>
            <CardTitle className="text-[clamp(1.45rem,2.4vw,2rem)]">{formatCurrency(totalInterest)}</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-[#c13d33]" />
              {defaultedLoans} préstamos ya están en mora
            </div>
          </CardHeader>
        </Card>
      </div>

      <Card className="rounded-[1.8rem] border-white/80 bg-white/88 shadow-[0_22px_44px_-34px_rgba(20,38,63,0.42)]">
        <CardHeader>
          <CardTitle>Listado de Préstamos</CardTitle>
          <CardDescription>
            Mostrando {filteredLoans.length} de {loans.length} préstamos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLoans.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No hay préstamos para este criterio"
              description="Prueba con otro fragmento de nombre, DNI/CIF o código."
              actionLabel={canCreateLoan ? 'Nuevo Préstamo' : undefined}
              actionHref={canCreateLoan ? '/dashboard/prestamos/nuevo' : undefined}
            />
          ) : (
            <div className="space-y-4">
              {filteredLoans.map(loan => (
                <div
                  key={loan.id}
                  className="rounded-[1.4rem] border border-[#e3eaf2] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] p-4 shadow-[0_16px_32px_-30px_rgba(20,38,63,0.3)] transition-colors hover:bg-accent/40"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                        <h3 className="font-semibold text-[#14263f]">{loan.loanNumber}</h3>
                        <StatusBadge type="loan" value={loan.status} />
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{loan.clientName}</span>
                        {loan.clientTaxId && <span>{loan.clientTaxId}</span>}
                        <span>Desembolso: {formatDate(loan.disbursementDate)}</span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-5">
                        <div className="rounded-xl bg-[#f8fbff] px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Principal
                          </p>
                          <p className="mt-1 font-semibold text-[#14263f]">
                            {formatCurrency(loan.principalAmount)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-[#fff8ee] px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Pendiente
                          </p>
                          <p className="mt-1 font-semibold text-[#14263f]">
                            {formatCurrency(loan.totalPending)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-[#faf7ff] px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Tasa
                          </p>
                          <p className="mt-1 font-semibold text-[#14263f]">
                            {formatLoanRate(loan.interestRate, loan.interestType)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-[#f5fbf7] px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Plazo
                          </p>
                          <p className="mt-1 font-semibold text-[#14263f]">{loan.termMonths} meses</p>
                        </div>
                        <div className="rounded-xl bg-[#fff8f8] px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            Interés total
                          </p>
                          <p className="mt-1 font-semibold text-[#14263f]">
                            {formatCurrency(loan.totalInterest)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row xl:flex-col">
                      <Link href={`/dashboard/prestamos/${loan.id}`} className="w-full sm:w-auto">
                        <Button variant="outline" size="sm" className="w-full rounded-xl">
                          <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                          Ver Detalle
                        </Button>
                      </Link>
                      {loan.status === 'ACTIVE' && canRegisterPayment && (
                        <Link href={`/dashboard/pagos/nuevo?loanId=${loan.id}`} className="w-full sm:w-auto">
                          <Button size="sm" className="w-full rounded-xl">
                            <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
                            Registrar Pago
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
