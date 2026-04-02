'use client'

/**
 * LoansExplorer — v3
 *
 * Arquitectura: URL-driven server-side search + paginación real.
 *
 * Los filtros (búsqueda, estado, página) viven en los searchParams de la URL.
 * Cada cambio actualiza la URL → Next.js re-renderiza el Server Component →
 * llega data filtrada/paginada del servidor.
 *
 * Ventajas sobre el enfoque anterior (client-side filter sobre 20 registros):
 *   · Encuentra TODOS los préstamos, no solo la primera página
 *   · Escala a 10.000+ registros sin degradación
 *   · URL compartible y back-button funcional
 *   · Métricas globales siempre precisas
 */

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  Filter,
  Loader2,
  Search,
  TrendingUp,
  X,
} from 'lucide-react'
import type { LoanStatus } from '@prisma/client'
import { Button }      from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState }  from '@/components/shared/EmptyState'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency, formatPercentage } from '@/lib/formatters/currency'
import { formatDate }  from '@/lib/formatters/date'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface LoanItem {
  id:              string
  loanNumber:      string
  status:          LoanStatus
  clientName:      string
  clientTaxId:     string
  principalAmount: number
  totalPending:    number
  totalInterest:   number
  interestRate:    number
  interestType:    string
  termMonths:      number
  disbursementDate: string
}

interface LoanStats {
  totalPrincipal:   number
  totalOutstanding: number
  totalInterest:    number
  activeCount:      number
  defaultedCount:   number
  totalCount:       number
}

interface PaginationMeta {
  page:       number
  pageSize:   number
  total:      number
  totalPages: number
}

interface LoansExplorerProps {
  loans:            LoanItem[]
  pagination:       PaginationMeta
  stats:            LoanStats
  currentSearch:    string
  currentStatus:    string
  canCreateLoan?:   boolean
  canRegisterPayment?: boolean
}

type StatusFilter = 'ALL' | LoanStatus

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUS_BUTTONS: Array<{ label: string; value: StatusFilter }> = [
  { label: 'Activos',    value: 'ACTIVE' },
  { label: 'En mora',    value: 'DEFAULTED' },
  { label: 'Pagados',    value: 'PAID' },
  { label: 'Cancelados', value: 'CANCELLED' },
]

const DEBOUNCE_MS = 350

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatLoanRate(rate: number, interestType: string) {
  if (interestType === 'FIXED_AMOUNT') return `${formatCurrency(rate)} fijo`
  const cadence = interestType === 'PERCENTAGE_ANNUAL' ? 'anual' : 'mensual'
  return `${formatPercentage(rate)} ${cadence}`
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function LoansExplorer({
  loans,
  pagination,
  stats,
  currentSearch,
  currentStatus,
  canCreateLoan = false,
  canRegisterPayment = false,
}: LoansExplorerProps) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const containerRef = useRef<HTMLDivElement>(null)

  // inputValue se actualiza en cada keystroke (UX inmediato).
  // La URL se actualiza con debounce para no lanzar un request por cada letra.
  const [inputValue,      setInputValue]      = useState(currentSearch)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Guards para el debounce:
  // · isMountedRef: evita que el debounce se dispare en el primer render
  // · skipNextDebounceRef: evita que el debounce se dispare cuando sincronizamos
  //   inputValue desde los props del servidor (back/forward navigation)
  const isMountedRef         = useRef(false)
  const skipNextDebounceRef  = useRef(false)

  // Sincronizar inputValue cuando el servidor cambia currentSearch
  // (navegación back/forward o URL directa). Marca el flag para que el debounce
  // no reaccione a este cambio de estado (evitaría push duplicado al mismo URL).
  useEffect(() => {
    if (inputValue !== currentSearch) {
      skipNextDebounceRef.current = true
      setInputValue(currentSearch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSearch])

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [])

  // ── Actualizar URL con los nuevos params ────────────────────────────────────
  // Usa replace (no push) para no ensuciar el historial con cada keystroke/página.
  // scroll: false para búsqueda/filtros — el usuario no quiere saltar al top al tipear.
  const updateParams = useCallback(
    (updates: Record<string, string | null>, resetPage = true, scrollTop = false) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') params.delete(key)
        else params.set(key, value)
      }
      if (resetPage) params.delete('page')
      startTransition(() =>
        router.replace(`?${params.toString()}`, { scroll: scrollTop })
      )
    },
    [searchParams, router]
  )

  // Ref para debounce — mantiene siempre la versión más reciente de updateParams
  const updateParamsRef = useRef(updateParams)
  useEffect(() => { updateParamsRef.current = updateParams }, [updateParams])

  // ── Debounce: 350 ms tras el último keystroke → replace URL ────────────────
  // BUG FIX: isMountedRef previene que se dispare en el montaje inicial.
  // Sin esto, cada vez que el componente montaba (ej. al paginar) el debounce
  // reseteaba el parámetro 'page' a los 350ms, volviendo siempre a la página 1.
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true
      return
    }
    if (skipNextDebounceRef.current) {
      skipNextDebounceRef.current = false
      return
    }
    const timer = setTimeout(() => {
      updateParamsRef.current({ q: inputValue.trim() || null })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [inputValue])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleStatusFilter = (value: StatusFilter) =>
    updateParams({ status: value === 'ALL' ? null : value })

  const handleClear = () => {
    setInputValue('')
    updateParams({ q: null, status: null })
  }

  const handlePageChange = (newPage: number) => {
    // Scroll al top antes de cambiar de página para UX estándar de paginación
    window.scrollTo({ top: 0, behavior: 'smooth' })
    const params = new URLSearchParams(searchParams.toString())
    if (newPage <= 1) params.delete('page')
    else params.set('page', String(newPage))
    startTransition(() => router.replace(`?${params.toString()}`, { scroll: false }))
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeStatus  = (currentStatus || 'ALL') as StatusFilter
  const suggestions   = loans.slice(0, 6)
  const rangeStart    = (pagination.page - 1) * pagination.pageSize + 1
  const rangeEnd      = Math.min(pagination.page * pagination.pageSize, pagination.total)
  const isFiltered    = pagination.total !== stats.totalCount

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Panel de filtros ─────────────────────────────────────────────── */}
      <Card className="rounded-[1.8rem] border-white/80 bg-white/88 shadow-[0_22px_44px_-34px_rgba(20,38,63,0.42)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtros</CardTitle>
            {isPending && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Buscando…
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 xl:flex-row">

            {/* Buscador con sugerencias */}
            <div ref={containerRef} className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                value={inputValue}
                onChange={e => { setInputValue(e.target.value); setShowSuggestions(true) }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Buscar por código o nombre del cliente..."
                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => { setInputValue(''); setShowSuggestions(false); updateParams({ q: null }) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Dropdown de sugerencias — muestra los primeros 6 resultados del servidor */}
              {showSuggestions && inputValue.trim().length > 0 && (
                <div className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-full rounded-2xl border bg-white p-2 shadow-lg">
                  {loans.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-muted-foreground">
                      No se encontraron préstamos para esta búsqueda.
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {suggestions.map(loan => (
                        <button
                          key={loan.id}
                          type="button"
                          onClick={() => {
                            setInputValue(loan.loanNumber)
                            setShowSuggestions(false)
                            updateParams({ q: loan.loanNumber })
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

            {/* Botones de estado */}
            <div className="flex flex-wrap gap-2">
              {STATUS_BUTTONS.map(btn => (
                <Button
                  key={btn.value}
                  type="button"
                  variant={activeStatus === btn.value ? 'default' : 'outline'}
                  onClick={() => handleStatusFilter(btn.value)}
                  disabled={isPending}
                >
                  {btn.label}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={isPending}
              >
                <Filter className="mr-2 h-4 w-4" />
                Limpiar
              </Button>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Búsqueda por código de préstamo o nombre del cliente en toda la cartera.
          </p>
        </CardContent>
      </Card>

      {/* ── Métricas globales del portafolio ─────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <Card className="rounded-[1.6rem] border-[#dce6f2] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(20,38,63,0.46)]">
          <CardHeader className="pb-3">
            <CardDescription>Préstamos</CardDescription>
            <CardTitle className="text-[clamp(1.8rem,3vw,2.5rem)]">
              {pagination.total.toLocaleString('es-ES')}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {isFiltered
                ? `Filtrados de ${stats.totalCount.toLocaleString('es-ES')} en cartera`
                : 'Total en cartera'}
            </p>
          </CardHeader>
        </Card>

        <Card className="rounded-[1.6rem] border-[#e8efe9] bg-[linear-gradient(180deg,#f5fbf7_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(31,94,55,0.35)]">
          <CardHeader className="pb-3">
            <CardDescription>Capital Desembolsado</CardDescription>
            <CardTitle className="text-[clamp(1.45rem,2.4vw,2rem)]">
              {formatCurrency(stats.totalPrincipal)}
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-[#208454]" />
              {stats.activeCount} activos sosteniendo la operación
            </div>
          </CardHeader>
        </Card>

        <Card className="rounded-[1.6rem] border-[#f1e4cd] bg-[linear-gradient(180deg,#fff8ee_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(141,103,48,0.32)]">
          <CardHeader className="pb-3">
            <CardDescription>Pendiente Vivo</CardDescription>
            <CardTitle className="text-[clamp(1.45rem,2.4vw,2rem)]">
              {formatCurrency(stats.totalOutstanding)}
            </CardTitle>
            <p className="text-xs text-muted-foreground">Saldo actual por recuperar</p>
          </CardHeader>
        </Card>

        <Card className="rounded-[1.6rem] border-[#f3d8d6] bg-[linear-gradient(180deg,#fff8f8_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(166,53,43,0.28)]">
          <CardHeader className="pb-3">
            <CardDescription>Interés Proyectado</CardDescription>
            <CardTitle className="text-[clamp(1.45rem,2.4vw,2rem)]">
              {formatCurrency(stats.totalInterest)}
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-[#c13d33]" />
              {stats.defaultedCount} préstamos en mora
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* ── Listado paginado ─────────────────────────────────────────────── */}
      <Card className="rounded-[1.8rem] border-white/80 bg-white/88 shadow-[0_22px_44px_-34px_rgba(20,38,63,0.42)]">
        <CardHeader>
          <CardTitle>Listado de Préstamos</CardTitle>
          <CardDescription>
            {pagination.total === 0
              ? 'Sin resultados para este criterio'
              : `Mostrando ${rangeStart}–${rangeEnd} de ${pagination.total.toLocaleString('es-ES')} préstamos`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No hay préstamos para este criterio"
              description="Prueba con otro nombre o código de préstamo."
              actionLabel={canCreateLoan ? 'Nuevo Préstamo' : undefined}
              actionHref={canCreateLoan ? '/dashboard/prestamos/nuevo' : undefined}
            />
          ) : (
            <div
              className={`space-y-4 transition-opacity duration-150 ${
                isPending ? 'pointer-events-none opacity-40' : ''
              }`}
            >
              {loans.map(loan => (
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
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Principal</p>
                          <p className="mt-1 font-semibold text-[#14263f]">{formatCurrency(loan.principalAmount)}</p>
                        </div>
                        <div className="rounded-xl bg-[#fff8ee] px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Pendiente</p>
                          <p className="mt-1 font-semibold text-[#14263f]">{formatCurrency(loan.totalPending)}</p>
                        </div>
                        <div className="rounded-xl bg-[#faf7ff] px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Tasa</p>
                          <p className="mt-1 font-semibold text-[#14263f]">{formatLoanRate(loan.interestRate, loan.interestType)}</p>
                        </div>
                        <div className="rounded-xl bg-[#f5fbf7] px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Plazo</p>
                          <p className="mt-1 font-semibold text-[#14263f]">{loan.termMonths} meses</p>
                        </div>
                        <div className="rounded-xl bg-[#fff8f8] px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Interés total</p>
                          <p className="mt-1 font-semibold text-[#14263f]">{formatCurrency(loan.totalInterest)}</p>
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

          {/* ── Paginación ───────────────────────────────────────────────── */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t pt-5">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={pagination.page <= 1 || isPending}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Página{' '}
                <span className="font-semibold text-foreground">{pagination.page}</span>
                {' '}de{' '}
                <span className="font-semibold text-foreground">{pagination.totalPages}</span>
                <span className="hidden sm:inline">
                  {' '}—{' '}{pagination.total.toLocaleString('es-ES')} resultados
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                disabled={pagination.page >= pagination.totalPages || isPending}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Siguiente
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
