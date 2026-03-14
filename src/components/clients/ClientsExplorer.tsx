'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, BriefcaseBusiness, Eye, Search, ShieldCheck, X } from 'lucide-react'
import type { ClientStatus, RiskLevel } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { formatCurrency } from '@/lib/formatters/currency'
import { matchesSearchTerm } from '@/lib/utils/search'

interface ClientItem {
  id: string
  type: 'INDIVIDUAL' | 'BUSINESS'
  status: ClientStatus
  riskLevel: RiskLevel
  name: string
  taxId: string
  email: string
  phone: string
  creditLimit: number
  activeLoans: number
  internalScore: number | null
}

interface ClientsExplorerProps {
  clients: ClientItem[]
}

export function ClientsExplorer({ clients }: ClientsExplorerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
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

  const filteredClients = useMemo(() => {
    return clients.filter(client =>
      matchesSearchTerm(query, [
        client.name,
        client.taxId,
        client.email,
        client.phone,
        client.type === 'INDIVIDUAL' ? 'Persona Física' : 'Empresa',
      ])
    )
  }, [clients, query])

  const suggestions = filteredClients.slice(0, 6)
  const individuals = clients.filter(client => client.type === 'INDIVIDUAL').length
  const businesses = clients.filter(client => client.type === 'BUSINESS').length
  const activeRelationships = clients.filter(client => client.activeLoans > 0).length
  const criticalRisk = clients.filter(client => client.riskLevel === 'CRITICAL').length

  return (
    <div className="space-y-6">
      <Card className="rounded-[1.8rem] border-white/80 bg-white/88 shadow-[0_22px_44px_-34px_rgba(20,38,63,0.42)]">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
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
                placeholder="Buscar por nombre, DNI/CIF, email o teléfono..."
                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                      No hay clientes que coincidan.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {suggestions.map(client => (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setQuery(client.name)
                            setShowSuggestions(false)
                          }}
                          className="flex w-full items-start justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{client.name}</p>
                            <p className="truncate text-sm text-muted-foreground">
                              {[client.taxId, client.email || client.phone].filter(Boolean).join(' • ')}
                            </p>
                          </div>
                          <span className="ml-3 rounded-full bg-muted px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {client.type === 'INDIVIDUAL' ? 'Persona' : 'Empresa'}
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
          <p className="mt-3 text-sm text-muted-foreground">
            Coincidencias parciales activas: escribe una parte del nombre, DNI/CIF, email o teléfono.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[1.6rem] border-[#dce6f2] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(20,38,63,0.46)]">
          <CardHeader className="pb-3">
            <CardDescription>Total Clientes</CardDescription>
            <CardTitle className="text-[clamp(1.8rem,3vw,2.5rem)]">{clients.length}</CardTitle>
            <p className="text-xs text-muted-foreground">Base total registrada en cartera</p>
          </CardHeader>
        </Card>
        <Card className="rounded-[1.6rem] border-[#e8efe9] bg-[linear-gradient(180deg,#f5fbf7_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(31,94,55,0.35)]">
          <CardHeader className="pb-3">
            <CardDescription>Con Operación Activa</CardDescription>
            <CardTitle className="text-[clamp(1.8rem,3vw,2.5rem)]">{activeRelationships}</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-[#208454]" />
              Seguimiento vivo en préstamos o cobranza
            </div>
          </CardHeader>
        </Card>
        <Card className="rounded-[1.6rem] border-[#f1e4cd] bg-[linear-gradient(180deg,#fff8ee_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(141,103,48,0.32)]">
          <CardHeader className="pb-3">
            <CardDescription>Mix de Cartera</CardDescription>
            <CardTitle className="text-[clamp(1.5rem,2.5vw,2.1rem)]">{individuals} personas</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BriefcaseBusiness className="h-3.5 w-3.5 text-[#8d6730]" />
              {businesses} empresas en la base actual
            </div>
          </CardHeader>
        </Card>
        <Card className="rounded-[1.6rem] border-[#f3d8d6] bg-[linear-gradient(180deg,#fff8f8_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(166,53,43,0.28)]">
          <CardHeader className="pb-3">
            <CardDescription>Riesgo Crítico</CardDescription>
            <CardTitle className="text-[clamp(1.8rem,3vw,2.5rem)]">{criticalRisk}</CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 text-[#c13d33]" />
              Clientes que requieren revisión inmediata
            </div>
          </CardHeader>
        </Card>
      </div>

      <Card className="rounded-[1.8rem] border-white/80 bg-white/88 shadow-[0_22px_44px_-34px_rgba(20,38,63,0.42)]">
        <CardHeader>
          <CardTitle>Listado de Clientes</CardTitle>
          <CardDescription>
            Mostrando {filteredClients.length} de {clients.length} clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              No hay resultados para esta búsqueda.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClients.map(client => (
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
                            {client.internalScore !== null ? `${client.internalScore}/100` : 'Sin score'}
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
        </CardContent>
      </Card>
    </div>
  )
}
