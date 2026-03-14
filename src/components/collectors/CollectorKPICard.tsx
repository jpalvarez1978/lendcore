'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/formatters/currency'
import { TrendingUp, TrendingDown, DollarSign, Target, Clock, Award, MoreVertical, Pencil, Trash2, Power } from 'lucide-react'

interface CollectorKPIs {
  totalAssignedLoans: number
  activeLoans: number
  paidLoans: number
  defaultedLoans: number
  totalAssignedAmount: number
  totalCollected: number
  totalPending: number
  successRate: number
  collectionRate: number
  averageDaysToCollect: number
  collectedThisMonth: number
  collectedLastMonth: number
}

interface CollectorKPICardProps {
  collectorId: string
  collectorName: string
  collectorEmail: string
  isActive: boolean
  kpis: CollectorKPIs
  onAssignLoan: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
}

export function CollectorKPICard({
  collectorId,
  collectorName,
  collectorEmail,
  isActive,
  kpis,
  onAssignLoan,
  onEdit,
  onDelete,
  onToggleActive,
}: CollectorKPICardProps) {
  const monthTrend = kpis.collectedThisMonth - kpis.collectedLastMonth
  const isTrendPositive = monthTrend >= 0

  return (
    <Card className={`w-full ${!isActive ? 'opacity-60' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-semibold">{collectorName}</CardTitle>
              {!isActive && (
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                  Inactivo
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{collectorEmail}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={onAssignLoan} disabled={!isActive}>
              Asignar Préstamo
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onToggleActive}>
                  <Power className="mr-2 h-4 w-4" />
                  {isActive ? 'Desactivar' : 'Activar'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Préstamos Asignados */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Préstamos Asignados</p>
            <p className="text-2xl font-bold">{kpis.totalAssignedLoans}</p>
            <div className="flex gap-1 text-xs text-muted-foreground">
              <span className="text-green-600">{kpis.activeLoans} activos</span>
              <span>•</span>
              <span className="text-blue-600">{kpis.paidLoans} pagados</span>
            </div>
          </div>

          {/* Monto Total Asignado */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>Monto Asignado</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(kpis.totalAssignedAmount)}</p>
            <p className="text-xs text-muted-foreground">
              Pendiente: {formatCurrency(kpis.totalPending)}
            </p>
          </div>

          {/* Monto Cobrado */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>Total Cobrado</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(kpis.totalCollected)}
            </p>
            <div className="flex items-center gap-1 text-xs">
              {isTrendPositive ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={isTrendPositive ? 'text-green-600' : 'text-red-600'}>
                {isTrendPositive ? '+' : ''}
                {formatCurrency(Math.abs(monthTrend))} vs mes anterior
              </span>
            </div>
          </div>

          {/* Tasa de Éxito */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              <span>Tasa de Éxito</span>
            </div>
            <p className="text-2xl font-bold">
              {kpis.successRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {kpis.paidLoans} de {kpis.totalAssignedLoans} préstamos
            </p>
          </div>

          {/* Tasa de Cobro */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Award className="h-3 w-3" />
              <span>Tasa de Cobro</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {kpis.collectionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              del monto asignado
            </p>
          </div>

          {/* Promedio de Días */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Promedio Días</span>
            </div>
            <p className="text-2xl font-bold">
              {kpis.averageDaysToCollect > 0
                ? kpis.averageDaysToCollect.toFixed(0)
                : '-'}
            </p>
            <p className="text-xs text-muted-foreground">
              {kpis.averageDaysToCollect > 0 ? 'para cobrar' : 'sin datos'}
            </p>
          </div>
        </div>

        {/* Alertas si hay préstamos en mora */}
        {kpis.defaultedLoans > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              ⚠️ <span className="font-semibold">{kpis.defaultedLoans}</span> préstamo(s) en mora requieren atención
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
