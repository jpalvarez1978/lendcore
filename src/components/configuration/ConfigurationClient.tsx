'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import { formatNumber } from '@/lib/formatters/currency'
import { EditParameterModal } from './EditParameterModal'
import type { ParameterType, ParameterCategory } from '@prisma/client'

interface Parameter {
  id: string
  key: string
  value: string
  description: string | null
  type: ParameterType
  category: ParameterCategory
  unit: string | null
  minValue: string | null
  maxValue: string | null
  isEditable: boolean
  isActive: boolean
  lastModifiedAt: Date | null
  lastModifiedBy: string | null
}

interface ConfigurationClientProps {
  parameters: Parameter[]
}

export function ConfigurationClient({ parameters }: ConfigurationClientProps) {
  const [editingParameter, setEditingParameter] = useState<Parameter | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [localParameters, setLocalParameters] = useState(parameters)

  const handleRefresh = async (updatedParam?: Parameter) => {
    if (updatedParam) {
      // Actualizar el estado local con el parámetro actualizado
      setLocalParameters(prev =>
        prev.map(p => (p.id === updatedParam.id ? updatedParam : p))
      )
    } else {
      // Si no hay parámetro específico, recargar todo
      window.location.reload()
    }
  }

  const handleEdit = (param: Parameter) => {
    setEditingParameter(param)
    setModalOpen(true)
  }

  const formatValue = (param: Parameter) => {
    switch (param.type) {
      case 'DECIMAL':
        return formatNumber(parseFloat(param.value))
      case 'INTEGER':
        return param.value
      case 'BOOLEAN':
        return param.value === 'true' ? 'Sí' : 'No'
      case 'STRING':
        // Formato especial para ciertos parámetros
        if (param.key === 'BUSINESS_WORKING_DAYS') {
          const map: Record<string, string> = {
            MON_TO_FRI: 'Lunes a Viernes',
            MON_TO_SAT: 'Lunes a Sábado',
            ALL_DAYS: 'Todos los días',
          }
          return map[param.value] || param.value
        }
        if (param.key === 'FINANCIAL_NUMBER_FORMAT') {
          return param.value === 'ES' ? 'Europeo (1.000,00)' : 'Americano (1,000.00)'
        }
        if (param.key === 'SYSTEM_THEME') {
          return param.value === 'LIGHT' ? 'Claro' : 'Oscuro'
        }
        return param.value
      default:
        return param.value
    }
  }

  const renderParameterList = (categoryParams: Parameter[]) => (
    <div className="space-y-4">
      {categoryParams.map(param => (
        <Card key={param.id}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{param.description || param.key}</h4>
                  {!param.isEditable && (
                    <Badge variant="secondary" className="text-xs">
                      No editable
                    </Badge>
                  )}
                  {!param.isActive && (
                    <Badge variant="destructive" className="text-xs">
                      Inactivo
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground font-mono">{param.key}</p>
                {param.unit && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Unidad: {param.unit}
                  </p>
                )}
                {(param.minValue || param.maxValue) && (
                  <p className="text-xs text-muted-foreground">
                    Rango: {param.minValue || '∞'} - {param.maxValue || '∞'}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatValue(param)}</p>
                  {param.unit && <p className="text-xs text-muted-foreground">{param.unit}</p>}
                </div>
                {param.isEditable && (
                  <Button size="sm" variant="outline" onClick={() => handleEdit(param)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {param.lastModifiedAt && (
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                Última modificación: {new Date(param.lastModifiedAt).toLocaleString('es-ES')}
                {param.lastModifiedBy && ` por ${param.lastModifiedBy}`}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {categoryParams.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No hay parámetros en esta categoría
        </p>
      )}
    </div>
  )

  return (
    <>
      <div className="space-y-4">
        {renderParameterList(localParameters)}
      </div>

      <EditParameterModal
        parameter={editingParameter}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleRefresh}
      />
    </>
  )
}
