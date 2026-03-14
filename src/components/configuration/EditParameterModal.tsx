'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import type { ParameterType } from '@prisma/client'

interface Parameter {
  id: string
  key: string
  value: string
  description: string
  type: ParameterType
  unit?: string | null
  minValue?: string | null
  maxValue?: string | null
}

interface EditParameterModalProps {
  parameter: Parameter | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (updatedParam?: Parameter) => void
}

export function EditParameterModal({
  parameter,
  open,
  onOpenChange,
  onSuccess,
}: EditParameterModalProps) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (parameter) {
      setValue(parameter.value)
    }
  }, [parameter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!parameter) return

    // Validaciones
    if (parameter.type === 'INTEGER') {
      const numValue = parseInt(value)
      if (isNaN(numValue)) {
        toast({
          title: 'Error',
          description: 'Debe ser un número entero',
          variant: 'destructive',
        })
        return
      }

      if (parameter.minValue && numValue < parseInt(parameter.minValue)) {
        toast({
          title: 'Error',
          description: `El valor mínimo es ${parameter.minValue}`,
          variant: 'destructive',
        })
        return
      }

      if (parameter.maxValue && numValue > parseInt(parameter.maxValue)) {
        toast({
          title: 'Error',
          description: `El valor máximo es ${parameter.maxValue}`,
          variant: 'destructive',
        })
        return
      }
    }

    if (parameter.type === 'DECIMAL') {
      const numValue = parseFloat(value)
      if (isNaN(numValue)) {
        toast({
          title: 'Error',
          description: 'Debe ser un número decimal',
          variant: 'destructive',
        })
        return
      }
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/parameters/${parameter.key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      })

      if (res.ok) {
        const updatedParam = await res.json()
        toast({
          title: 'Parámetro actualizado',
          description: 'Los cambios se han guardado correctamente',
        })
        onSuccess?.(updatedParam)
        onOpenChange(false)
      } else {
        const error = await res.json()
        toast({
          title: 'Error',
          description: error.error || 'No se pudo actualizar el parámetro',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al actualizar parámetro',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!parameter) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Parámetro</DialogTitle>
          <DialogDescription>{parameter.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="value">
              Valor {parameter.unit && `(${parameter.unit})`}
            </Label>

            {parameter.type === 'BOOLEAN' ? (
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Sí / Habilitado</SelectItem>
                  <SelectItem value="false">No / Deshabilitado</SelectItem>
                </SelectContent>
              </Select>
            ) : parameter.key === 'BUSINESS_WORKING_DAYS' ? (
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MON_TO_FRI">Lunes a Viernes</SelectItem>
                  <SelectItem value="MON_TO_SAT">Lunes a Sábado</SelectItem>
                  <SelectItem value="ALL_DAYS">Todos los días</SelectItem>
                </SelectContent>
              </Select>
            ) : parameter.key === 'FINANCIAL_NUMBER_FORMAT' ? (
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ES">Europeo (1.000,00)</SelectItem>
                  <SelectItem value="US">Americano (1,000.00)</SelectItem>
                </SelectContent>
              </Select>
            ) : parameter.key === 'SYSTEM_THEME' ? (
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LIGHT">Claro</SelectItem>
                  <SelectItem value="DARK">Oscuro</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                type={parameter.type === 'INTEGER' || parameter.type === 'DECIMAL' ? 'number' : 'text'}
                step={parameter.type === 'DECIMAL' ? '0.01' : '1'}
                min={parameter.minValue || undefined}
                max={parameter.maxValue || undefined}
                required
              />
            )}

            {(parameter.minValue || parameter.maxValue) && (
              <p className="text-xs text-muted-foreground">
                Rango: {parameter.minValue || '∞'} - {parameter.maxValue || '∞'}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
