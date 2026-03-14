'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CollectorKPICard } from './CollectorKPICard'
import { AssignLoanModal } from './AssignLoanModal'
import { CreateCollectorModal } from './CreateCollectorModal'
import { toast } from '@/hooks/use-toast'

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

interface Collector {
  id: string
  name: string
  email: string
  phone?: string | null
  isActive: boolean
  _count: {
    assignedLoans: number
  }
}

interface CollectorWithKPIs extends Collector {
  kpis: CollectorKPIs
}

interface CollectorManagementTabProps {
  selectedMonth?: number
  selectedYear?: number
}

export function CollectorManagementTab({
  selectedMonth,
  selectedYear,
}: CollectorManagementTabProps) {
  const [collectors, setCollectors] = useState<CollectorWithKPIs[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCollector, setSelectedCollector] = useState<{
    id: string
    name: string
  } | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingCollector, setEditingCollector] = useState<Collector | null>(null)

  const fetchCollectorsWithKPIs = async () => {
    setLoading(true)
    try {
      // 1. Obtener lista de cobradores (incluir inactivos)
      const collectorsRes = await fetch('/api/collectors?includeInactive=true')
      if (!collectorsRes.ok) {
        throw new Error('Error al cargar cobradores')
      }
      const collectorsData: Collector[] = await collectorsRes.json()

      // 2. Obtener KPIs de cada cobrador
      const collectorsWithKPIs = await Promise.all(
        collectorsData.map(async (collector) => {
          try {
            // Construir parámetros de fecha si están disponibles
            const params = new URLSearchParams()
            if (selectedMonth && selectedYear) {
              const startDate = new Date(selectedYear, selectedMonth - 1, 1)
              const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999)
              params.set('startDate', startDate.toISOString())
              params.set('endDate', endDate.toISOString())
            }

            const kpisRes = await fetch(
              `/api/collectors/${collector.id}/kpis${params.toString() ? `?${params}` : ''}`
            )

            if (!kpisRes.ok) {
              console.error(`Error fetching KPIs for collector ${collector.id}`)
              return {
                ...collector,
                kpis: getEmptyKPIs(),
              }
            }

            const kpis: CollectorKPIs = await kpisRes.json()
            return {
              ...collector,
              kpis,
            }
          } catch (error) {
            console.error(`Error fetching KPIs for collector ${collector.id}:`, error)
            return {
              ...collector,
              kpis: getEmptyKPIs(),
            }
          }
        })
      )

      setCollectors(collectorsWithKPIs)
    } catch (error) {
      console.error('Error fetching collectors:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos de cobradores',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCollectorsWithKPIs()
  }, [selectedMonth, selectedYear])

  const handleAssignLoanSuccess = () => {
    fetchCollectorsWithKPIs()
  }

  const handleCreateSuccess = () => {
    fetchCollectorsWithKPIs()
  }

  const handleEdit = (collector: Collector) => {
    setEditingCollector(collector)
    setCreateModalOpen(true)
  }

  const handleDelete = async (collectorId: string, collectorName: string) => {
    if (!confirm(`¿Estás seguro de eliminar a ${collectorName}?`)) {
      return
    }

    try {
      const res = await fetch(`/api/collectors/${collectorId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast({
          title: 'Cobrador eliminado',
          description: `${collectorName} fue eliminado exitosamente`,
        })
        fetchCollectorsWithKPIs()
      } else {
        const error = await res.json()
        toast({
          title: 'Error',
          description: error.error || 'No se pudo eliminar el cobrador',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al eliminar cobrador',
        variant: 'destructive',
      })
    }
  }

  const handleToggleActive = async (collector: Collector) => {
    try {
      const res = await fetch(`/api/collectors/${collector.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !collector.isActive,
        }),
      })

      if (res.ok) {
        toast({
          title: collector.isActive ? 'Cobrador desactivado' : 'Cobrador activado',
          description: `${collector.name} fue ${collector.isActive ? 'desactivado' : 'activado'}`,
        })
        fetchCollectorsWithKPIs()
      } else {
        const error = await res.json()
        toast({
          title: 'Error',
          description: error.error || 'No se pudo actualizar el cobrador',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al actualizar cobrador',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header con botón crear */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Cobradores</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona los cobradores y asigna préstamos
          </p>
        </div>
        <Button onClick={() => {
          setEditingCollector(null)
          setCreateModalOpen(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Cobrador
        </Button>
      </div>

      {collectors.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            No hay cobradores registrados en el sistema.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Haz clic en &ldquo;Nuevo Cobrador&rdquo; para crear uno.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {collectors.map((collector) => (
            <CollectorKPICard
              key={collector.id}
              collectorId={collector.id}
              collectorName={collector.name}
              collectorEmail={collector.email}
              isActive={collector.isActive}
              kpis={collector.kpis}
              onAssignLoan={() =>
                setSelectedCollector({ id: collector.id, name: collector.name })
              }
              onEdit={() => handleEdit(collector)}
              onDelete={() => handleDelete(collector.id, collector.name)}
              onToggleActive={() => handleToggleActive(collector)}
            />
          ))}
        </div>
      )}

      {/* Modal de asignación */}
      {selectedCollector && (
        <AssignLoanModal
          collectorId={selectedCollector.id}
          collectorName={selectedCollector.name}
          open={!!selectedCollector}
          onOpenChange={(open) => {
            if (!open) setSelectedCollector(null)
          }}
          onSuccess={handleAssignLoanSuccess}
        />
      )}

      {/* Modal de crear/editar */}
      <CreateCollectorModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open)
          if (!open) setEditingCollector(null)
        }}
        onSuccess={handleCreateSuccess}
        collector={editingCollector || undefined}
      />
    </div>
  )
}

// Helper para KPIs vacíos
function getEmptyKPIs(): CollectorKPIs {
  return {
    totalAssignedLoans: 0,
    activeLoans: 0,
    paidLoans: 0,
    defaultedLoans: 0,
    totalAssignedAmount: 0,
    totalCollected: 0,
    totalPending: 0,
    successRate: 0,
    collectionRate: 0,
    averageDaysToCollect: 0,
    collectedThisMonth: 0,
    collectedLastMonth: 0,
  }
}
