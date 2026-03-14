import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type FilterPrimitive = string | number | boolean | null
export type FilterRangeValue = [FilterPrimitive, FilterPrimitive]
export type FilterListValue = FilterPrimitive[]
export type FilterValue = FilterPrimitive | FilterRangeValue | FilterListValue

function isFilterPrimitive(value: FilterValue): value is FilterPrimitive {
  return !Array.isArray(value)
}

export interface FilterConfig {
  field: string
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between' | 'in'
  value: FilterValue
  label?: string
}

export interface SavedView {
  id: string
  name: string
  description?: string
  icon?: string
  filters: FilterConfig[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  context: 'clients' | 'loans' | 'payments' | 'collection' | 'applications'
  isPublic: boolean
  createdBy: string
  createdAt: Date
  lastUsed?: Date
}

interface SavedViewsState {
  views: SavedView[]
  addView: (view: Omit<SavedView, 'id' | 'createdAt' | 'lastUsed'>) => void
  updateView: (id: string, updates: Partial<SavedView>) => void
  deleteView: (id: string) => void
  getViewsByContext: (context: SavedView['context']) => SavedView[]
  markAsUsed: (id: string) => void
}

export const useSavedViewsStore = create<SavedViewsState>()(
  persist(
    (set, get) => ({
      views: [
        // Vistas predefinidas para Cobranza
        {
          id: 'predefined-critical-cases',
          name: 'Casos Críticos',
          description: 'Mora >90 días o monto >5.000€',
          icon: '🚨',
          filters: [
            {
              field: 'daysOverdue',
              operator: 'greaterThan',
              value: 90,
              label: 'Días de mora > 90',
            },
          ],
          context: 'collection' as const,
          isPublic: true,
          createdBy: 'system',
          createdAt: new Date(),
        },
        {
          id: 'predefined-my-assigned',
          name: 'Asignados a Mí',
          description: 'Gestiones pendientes asignadas',
          icon: '👤',
          filters: [
            {
              field: 'assignedTo',
              operator: 'equals',
              value: 'currentUser',
              label: 'Asignado a mí',
            },
            {
              field: 'status',
              operator: 'in',
              value: ['PENDING', 'IN_PROGRESS'],
              label: 'Estado: Pendiente o En Progreso',
            },
          ],
          context: 'collection' as const,
          isPublic: true,
          createdBy: 'system',
          createdAt: new Date(),
        },
        {
          id: 'predefined-promises-today',
          name: 'Promesas Hoy',
          description: 'Promesas que vencen hoy',
          icon: '📅',
          filters: [
            {
              field: 'promiseDate',
              operator: 'equals',
              value: 'today',
              label: 'Fecha: Hoy',
            },
            {
              field: 'status',
              operator: 'equals',
              value: 'PENDING',
              label: 'Estado: Pendiente',
            },
          ],
          context: 'collection' as const,
          isPublic: true,
          createdBy: 'system',
          createdAt: new Date(),
        },
        // Vistas para Clientes
        {
          id: 'predefined-active-clients',
          name: 'Clientes Activos',
          description: 'Clientes con estado ACTIVE',
          icon: '✅',
          filters: [
            {
              field: 'status',
              operator: 'equals',
              value: 'ACTIVE',
              label: 'Estado: Activo',
            },
          ],
          context: 'clients' as const,
          isPublic: true,
          createdBy: 'system',
          createdAt: new Date(),
        },
        {
          id: 'predefined-high-risk',
          name: 'Alto Riesgo',
          description: 'Clientes con riesgo ALTO o CRÍTICO',
          icon: '⚠️',
          filters: [
            {
              field: 'riskLevel',
              operator: 'in',
              value: ['HIGH', 'CRITICAL'],
              label: 'Riesgo: Alto o Crítico',
            },
          ],
          context: 'clients' as const,
          isPublic: true,
          createdBy: 'system',
          createdAt: new Date(),
        },
      ],

      addView: (view) =>
        set((state) => ({
          views: [
            ...state.views,
            {
              ...view,
              id: crypto.randomUUID(),
              createdAt: new Date(),
            },
          ],
        })),

      updateView: (id, updates) =>
        set((state) => ({
          views: state.views.map((v) => (v.id === id ? { ...v, ...updates } : v)),
        })),

      deleteView: (id) =>
        set((state) => ({
          views: state.views.filter((v) => v.id !== id && v.createdBy !== 'system'),
        })),

      getViewsByContext: (context) => {
        return get().views.filter((v) => v.context === context)
      },

      markAsUsed: (id) =>
        set((state) => ({
          views: state.views.map((v) => (v.id === id ? { ...v, lastUsed: new Date() } : v)),
        })),
    }),
    {
      name: 'saved-views-storage',
    }
  )
)

// Helper para construir query params desde filtros
export function buildQueryFromFilters(
  filters: FilterConfig[]
): Record<string, string | number | boolean | null> {
  const query: Record<string, string | number | boolean | null> = {}

  filters.forEach((filter) => {
    const value = filter.value

    switch (filter.operator) {
      case 'equals':
        if (isFilterPrimitive(value)) {
          query[filter.field] = value
        }
        break
      case 'contains':
        if (typeof value === 'string') {
          query[`${filter.field}_contains`] = value
        }
        break
      case 'greaterThan':
        if (typeof value === 'string' || typeof value === 'number') {
          query[`${filter.field}_gt`] = value
        }
        break
      case 'lessThan':
        if (typeof value === 'string' || typeof value === 'number') {
          query[`${filter.field}_lt`] = value
        }
        break
      case 'between':
        if (Array.isArray(value) && value.length === 2) {
          query[`${filter.field}_gte`] = value[0]
          query[`${filter.field}_lte`] = value[1]
        }
        break
      case 'in':
        if (Array.isArray(value)) {
          query[`${filter.field}_in`] = value.join(',')
        }
        break
    }
  })

  return query
}
