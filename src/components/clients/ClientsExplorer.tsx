'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'
import type { ClientStatus, RiskLevel } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency } from '@/lib/formatters/currency'

const DEBOUNCE_MS = 350

interface ClientItem {
  id:            string
  type:          'INDIVIDUAL' | 'BUSINESS'
  status:        ClientStatus
  riskLevel:     RiskLevel
  name:          string
  taxId:         string
  email:         string
  phone:         string
  creditLimit:   number
  activeLoans:   number
  internalScore: number | null
}

interface PaginationMeta {
  page:       number
  pageSize:   number
  total:      number
  totalPages: number
}

interface ClientStats {
  totalCount:               number
  individualsCount:         number
  businessesCount:          number
  activeRelationshipsCount: number
  criticalRiskCount:        number
}

interface ClientsExplorerProps {
  clients:       ClientItem[]
  pagination:    PaginationMeta
  stats:         ClientStats
  currentSearch: string
}

export function ClientsExplorer({
  clients,
  pagination,
  stats,
  currentSearch,
}: ClientsExplorerProps) {
  const router           = useRouter()
  const searchParams     = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [inputValue, setInputValue] = useState(currentSearch)

  const isMountedRef        = useRef(false)
  const skipNextDebounceRef = useRef(false)
  const updateParamsRef     = useRef<(patch: Record<string, string | null>) => void>(() => {})

  // Build and push updated URL
  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === '') params.delete(k)
        else params.set(k, v)
      }
      startTransition(() => {
        router.replace(`?${params.toString()}`, { scroll: false })
      })
    },
    [router, searchParams],
  )

  updateParamsRef.current = updateParams

  // Sync input when server sends a new currentSearch (back navigation)
  useEffect(() => {
    if (inputValue !== currentSearch) {
      skipNextDebounceRef.current = true
      setInputValue(currentSearch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSearch])

  // Debounce: skip on mount and on server-sync
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
      updateParamsRef.current({ q: inputValue.trim() || null, page: null })
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [inputValue])

  function goToPage(p: number) {
    updateParamsRef.current({ page: p > 1 ? String(p) : null })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const { page, totalPages, total } = pagination
  const {
    totalCount,
    individualsCount,
    businessesCount,
    activeRelationshipsCount,
    criticalRiskCount,
  } = stats

  return (
    <div className="space-y-6">
      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
      <Card className="rounded-[1.8rem] border-white/80 bg-white/88 shadow-[0_22px_44px_-34px_rgba(20,38,63,0.42)]">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Buscar por nombre, empresa, ciudad u ocupación..."
                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => setInputValue('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setInputValue('')}
            >
              Limpiar búsqueda
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Búsqueda por nombre, empresa, ciudad u ocupación.{' '}
            {isPending && (
              <span className="inline-flex items-center gap-1 text-blue-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                Buscando…
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* ── Métricas globales ──────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[1.6rem] border-[#dce6f2] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(20,38,63,0.46)]">
          <CardHeader className="pb-3">
            <CardDescription>Total Clientes</CardDescription>
            <CardTitle className="text-[clamp(1.8rem,3vw,2.5rem)]">{totalCount}</CardTitle>
            <p className="text-xs text-muted-foreground">Base total registrada en cartera</p>
          </CardHeader>
        </Card>
        <Card className="rounded-[1.6rem] border-[#e8efe9] bg-[linear-gradient(180deg,#f5fbf7_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(31,94,55,0.35)]">
          <CardHeader className="pb-3">
            <CardDescription>Con Operación Activa</CardDescription>
            <CardTitle className="text-[clamp(1.8rem,3vw,2.5rem)]">{activeRelationshipsCount}</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-[#208454]" />
              Seguimiento vivo en préstamos o cobranza
            </div>
          </CardHeader>
        </Card>
        <Card className="rounded-[1.6rem] border-[#f1e4cd] bg-[linear-gradient(180deg,#fff8ee_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(141,103,48,0.32)]">
          <CardHeader className="pb-3">
            <CardDescription>Mix de Cartera</CardDescription>
            <CardTitle className="text-[clamp(1.5rem,2.5vw,2.1rem)]">{individualsCount} personas</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BriefcaseBusiness className="h-3.5 w-3.5 text-[#8d6730]" />
              {businessesCount} empresas en la base actual
            </div>
          </CardHeader>
        </Card>
        <Card className="rounded-[1.6rem] border-[#f3d8d6] bg-[linear-gradient(180deg,#fff8f8_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(166,53,43,0.28)]">
          <CardHeader className="pb-3">
            <CardDescription>Riesgo Crítico</CardDescription>
            <CardTitle className="text-[clamp(1.8rem,3vw,2.5rem)]">{criticalRiskCount}</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-[#c13d33]" />
              Clientes que requieren revisión inmediata
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* ── Listado ────────────────────────────────────────────────────────── */}
      <Card className="rounded-[1.8rem] border-white/80 bg-white/88 shadow-[0_22px_44px_-34px_rgba(20,38,63,0.42)]">
        <CardHeader>
          <CardTitle>Listado de Clientes</CardTitle>
          <CardDescription>
            {currentSearch
              ? `${total} resultado${total !== 1 ? 's' : ''} para "${currentSearch}"`
              : `Mostrando ${clients.length} de ${total} clientes`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={isPending ? 'opacity-40 transition-opacity duration-150' : ''}>
            {clients.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                No hay resultados para esta búsqueda.
              </div>
            ) : (
              <div className="space-y-4">
                {clients.map(client => (
                  <div
                    key={client.id}
                    className="rounded-[1.4rem] border border-[#e3eaf2] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcfe_100%)] p-4 shadow-[0_16px_32px_-30px_rgba(20,38,63,0.3)] transition-colors hover:bg-accent/40"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-base font-semibold text-[#14263f]">{client.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {client.type === 'INDIVIDUAL' ? 'Persona' : 'Empresa'}
                          </Badge>
                          <StatusBadge type="client" value={client.status} />
                          <StatusBadge type="risk" value={client.riskLevel} />
                        </div>

                        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
                          {client.taxId && <span className="truncate">DNI/CIF: {client.taxId}</span>}
                          {client.email && <span className="truncate">Email: {client.email}</span>}
                          {client.phone && <span className="truncate">Tel: {client.phone}</span>}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          <div className="rounded-xl bg-[#f8fbff] px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                              Cupo
                            </p>
                            <p className="mt-1 font-semibold text-[#14263f]">
                              {formatCurrency(client.creditLimit)}
                            </p>
                          </div>
                          <div className="rounded-xl bg-[#f5fbf7] px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                              Préstamos activos
                            </p>
                            <p className="mt-1 font-semibold text-[#14263f]">{client.activeLoans}</p>
                          </div>
                          <div className="rounded-xl bg-[#fff8ee] px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                              Score interno
                            </p>
                            <p className="mt-1 font-semibold text-[#14263f]">
                              {client.internalScore !== null
                                ? `${client.internalScore}/100`
                                : 'Sin score'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex w-full gap-2 sm:w-auto">
                        <Link href={`/dashboard/clientes/${client.id}`} className="w-full sm:w-auto">
                          <Button variant="outline" size="sm" className="w-full rounded-xl">
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Ficha
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Paginación ──────────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages} — {total} resultados
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={page <= 1 || isPending}
                  onClick={() => goToPage(page - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={page >= totalPages || isPending}
                  onClick={() => goToPage(page + 1)}
                >
                  Siguiente
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
