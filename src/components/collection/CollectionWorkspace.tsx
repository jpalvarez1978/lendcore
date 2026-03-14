'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters/currency'
import { formatDate, formatRelativeDate } from '@/lib/formatters/date'
import { matchesSearchTerm } from '@/lib/utils/search'
import type { CollectionMetrics, CollectionPriority } from '@/services/collectionDashboardService'
import { QuickActionDialog } from '@/components/collection/QuickActionDialog'

interface PrioritizedCaseItem
  extends Omit<CollectionPriority, 'lastContactDate'> {
  lastContactDate?: string
}

interface PromiseDueTodayItem {
  id: string
  clientId: string
  clientName: string
  phone: string
  promiseDate: string
  promisedAmount: number
}

interface CollectionWorkspaceProps {
  canCreateCollectionAction: boolean
  metrics: CollectionMetrics
  prioritizedCases: PrioritizedCaseItem[]
  promisesToday: PromiseDueTodayItem[]
}

const priorityConfig = {
  CRITICAL: {
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: AlertTriangle,
    label: 'CRÍTICO',
  },
  HIGH: {
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: AlertTriangle,
    label: 'ALTO',
  },
  MEDIUM: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: Clock,
    label: 'MEDIO',
  },
  LOW: {
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: Clock,
    label: 'BAJO',
  },
} as const

type PriorityFilter = 'ALL' | CollectionPriority['priorityLevel']

export function CollectionWorkspace({
  canCreateCollectionAction,
  metrics,
  prioritizedCases,
  promisesToday,
}: CollectionWorkspaceProps) {
  const [query, setQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL')
  const [selectedCase, setSelectedCase] = useState<PrioritizedCaseItem | null>(null)

  const filteredCases = useMemo(() => {
    return prioritizedCases.filter(caseItem => {
      const matchesPriority =
        priorityFilter === 'ALL' || caseItem.priorityLevel === priorityFilter

      const matchesQuery = matchesSearchTerm(query, [
        caseItem.clientName,
        caseItem.loanNumber,
        caseItem.phone,
        caseItem.suggestedAction,
        caseItem.lastContactResult,
      ])

      return matchesPriority && matchesQuery
    })
  }, [prioritizedCases, priorityFilter, query])

  const filteredPromises = useMemo(() => {
    return promisesToday.filter(promise =>
      matchesSearchTerm(query, [promise.clientName, promise.phone, promise.promisedAmount])
    )
  }, [promisesToday, query])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Cobranza</h1>
        <p className="text-muted-foreground">
          Gestión priorizada de morosidad, contacto y promesas del día.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Vencido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(Number(metrics.totalOverdueAmount))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {metrics.totalOverdue} cuotas vencidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Casos Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.criticalCases}</div>
            <p className="mt-1 text-xs text-muted-foreground">+90 días de mora</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Promesas Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics.promisesDueToday}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Mañana: {metrics.promisesDueTomorrow}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasa de Contacto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.contactabilityRate.toFixed(1)}%</div>
            <p className="mt-1 text-xs text-muted-foreground">Últimos 30 días</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribución de Casos por Prioridad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{metrics.criticalCases}</div>
              <div className="mt-1 text-sm text-red-700">Críticos</div>
              <div className="text-xs text-muted-foreground">+90 días</div>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">
                {metrics.highPriorityCases}
              </div>
              <div className="mt-1 text-sm text-orange-700">Altos</div>
              <div className="text-xs text-muted-foreground">31-90 días</div>
            </div>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {metrics.mediumPriorityCases}
              </div>
              <div className="mt-1 text-sm text-yellow-700">Medios</div>
              <div className="text-xs text-muted-foreground">8-30 días</div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{metrics.lowPriorityCases}</div>
              <div className="mt-1 text-sm text-blue-700">Bajos</div>
              <div className="text-xs text-muted-foreground">1-7 días</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Buscar y Filtrar Gestión</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_auto]">
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Buscar por cliente, préstamo, teléfono o acción sugerida..."
              className="flex h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={priorityFilter === 'ALL' ? 'default' : 'outline'}
                onClick={() => setPriorityFilter('ALL')}
              >
                Todos
              </Button>
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(level => (
                <Button
                  key={level}
                  type="button"
                  variant={priorityFilter === level ? 'default' : 'outline'}
                  onClick={() => setPriorityFilter(level)}
                >
                  {priorityConfig[level].label}
                </Button>
              ))}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Mostrando {filteredCases.length} de {prioritizedCases.length} casos priorizados.
          </p>
        </CardContent>
      </Card>

      {filteredPromises.length > 0 && (
        <Card className="border-orange-300 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Calendar className="h-5 w-5" />
              Promesas de Pago HOY ({filteredPromises.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredPromises.map(promise => (
                <div
                  key={promise.id}
                  className="flex items-center justify-between rounded-lg border border-orange-200 bg-white p-3"
                >
                  <div>
                    <p className="font-medium">{promise.clientName}</p>
                    <p className="text-sm text-muted-foreground">
                      {promise.phone} • {formatDate(promise.promiseDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-orange-600">
                      {formatCurrency(Number(promise.promisedAmount))}
                    </p>
                    <div className="mt-2 flex gap-2">
                      {promise.phone && (
                        <a href={`tel:${promise.phone}`}>
                          <Button size="sm" variant="outline">
                            <Phone className="mr-1 h-3 w-3" />
                            Llamar
                          </Button>
                        </a>
                      )}
                      {promise.phone && (
                        <a
                          href={`https://wa.me/${promise.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700"
                          >
                            <MessageCircle className="mr-1 h-3 w-3" />
                            WhatsApp
                          </Button>
                        </a>
                      )}
                      <Link href={`/dashboard/clientes/${promise.clientId}`}>
                        <Button size="sm" variant="ghost">
                          Ver
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Casos Priorizados para Gestión ({filteredCases.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ordenados por atraso, monto vencido, intentos fallidos y promesas rotas.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredCases.map((caseItem, index) => {
              const config = priorityConfig[caseItem.priorityLevel]
              const Icon = config.icon

              return (
                <div
                  key={caseItem.loanId}
                  className={`flex items-start gap-4 rounded-lg border-2 p-4 ${config.color}`}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold">
                    {index + 1}
                  </div>

                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h4 className="font-bold">{caseItem.clientName}</h4>
                      <Badge variant="outline" className={config.color}>
                        <Icon className="mr-1 h-3 w-3" />
                        {config.label}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Score: {caseItem.priorityScore}
                      </Badge>
                    </div>

                    <div className="mb-2 grid gap-2 text-sm md:grid-cols-4">
                      <div>
                        <span className="text-muted-foreground">Préstamo:</span>{' '}
                        <span className="font-mono font-medium">{caseItem.loanNumber}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mora:</span>{' '}
                        <span className="font-bold text-red-600">{caseItem.daysOverdue} días</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Monto:</span>{' '}
                        <span className="font-bold">
                          {formatCurrency(Number(caseItem.overdueAmount))}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Teléfono:</span>{' '}
                        <span className="font-medium">{caseItem.phone}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {caseItem.lastContactDate && (
                        <div>
                          Último contacto: {formatRelativeDate(caseItem.lastContactDate)}
                          {caseItem.lastContactResult && ` (${caseItem.lastContactResult})`}
                        </div>
                      )}
                      {caseItem.failedAttempts > 0 && (
                        <div className="flex items-center gap-1">
                          <XCircle className="h-3 w-3 text-red-500" />
                          {caseItem.failedAttempts} intentos fallidos
                        </div>
                      )}
                      {caseItem.brokenPromises > 0 && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 text-orange-500" />
                          {caseItem.brokenPromises} promesas rotas
                        </div>
                      )}
                    </div>

                    <div className="mt-2 rounded bg-white/50 p-2 text-sm">
                      <span className="font-medium">Acción sugerida:</span>{' '}
                      {caseItem.suggestedAction}
                    </div>
                  </div>

                  <div className="flex flex-shrink-0 flex-col gap-2">
                    {caseItem.phone && (
                      <a href={`tel:${caseItem.phone}`}>
                        <Button size="sm" className="w-full whitespace-nowrap">
                          <Phone className="mr-1 h-3 w-3" />
                          Llamar
                        </Button>
                      </a>
                    )}
                    {caseItem.phone && (
                      <a
                        href={`https://wa.me/${caseItem.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full whitespace-nowrap text-green-600 hover:text-green-700"
                        >
                          <MessageCircle className="mr-1 h-3 w-3" />
                          WhatsApp
                        </Button>
                      </a>
                    )}
                    {caseItem.suggestedAction === 'Visita domiciliaria' && (
                      <Button size="sm" variant="outline" className="w-full whitespace-nowrap">
                        <MapPin className="mr-1 h-3 w-3" />
                        Visitar
                      </Button>
                    )}
                    {canCreateCollectionAction && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full whitespace-nowrap"
                        onClick={() => setSelectedCase(caseItem)}
                      >
                        Registrar gestión
                      </Button>
                    )}
                    <Link href={`/dashboard/clientes/${caseItem.clientId}`}>
                      <Button size="sm" variant="ghost" className="w-full">
                        Ver Cliente
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}

            {filteredCases.length === 0 && (
              <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                No hay casos que coincidan con el criterio de búsqueda.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tasa de Contactabilidad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold">{metrics.contactabilityRate.toFixed(1)}%</div>
              <div className="flex-1">
                <div className="h-4 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${metrics.contactabilityRate}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Últimos 30 días</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasa de Cumplimiento de Promesas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold">
                {metrics.promiseComplianceRate.toFixed(1)}%
              </div>
              <div className="flex-1">
                <div className="h-4 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${metrics.promiseComplianceRate}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Últimos 30 días</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedCase && (
        <QuickActionDialog
          open={Boolean(selectedCase)}
          onOpenChange={open => {
            if (!open) {
              setSelectedCase(null)
            }
          }}
          clientId={selectedCase.clientId}
          clientName={selectedCase.clientName}
          loanId={selectedCase.loanId}
        />
      )}
    </div>
  )
}
