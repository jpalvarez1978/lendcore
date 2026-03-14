'use client'

/**
 * SELECTOR DE TIPOS DE PRÉSTAMO
 *
 * Componente profesional para seleccionar el tipo de amortización
 * Diseño estilo Silicon Valley con tarjetas interactivas
 */

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { GlowingEffect } from '@/components/ui/glowing-effect'
import { DollarSign, TrendingUp, Calendar, Zap, Info } from 'lucide-react'
import { AmortizationType } from '@prisma/client'
import { cn } from '@/lib/utils'

interface LoanType {
  id: AmortizationType
  name: string
  icon: typeof DollarSign
  description: string
  color: string
  textColor: string
  example: string
  pros: string[]
  bestFor: string
}

const LOAN_TYPES: LoanType[] = [
  {
    id: 'AMERICAN',
    name: 'Préstamo Americano',
    icon: DollarSign,
    description: 'Solo pagas intereses. Capital al final.',
    color: 'bg-blue-50 dark:bg-blue-950',
    textColor: 'text-blue-600 dark:text-blue-400',
    example: 'Ej: Cuotas de 50€, última 1,050€',
    pros: ['Cuotas muy bajas', 'Mayor liquidez mensual'],
    bestFor: 'Clientes que necesitan liquidez durante el plazo',
  },
  {
    id: 'FRENCH',
    name: 'Préstamo Francés',
    icon: TrendingUp,
    description: 'Cuotas fijas todo el tiempo.',
    color: 'bg-green-50 dark:bg-green-950',
    textColor: 'text-green-600 dark:text-green-400',
    example: 'Ej: Todas las cuotas 220€',
    pros: ['Cuotas predecibles', 'Fácil de presupuestar'],
    bestFor: 'Clientes que prefieren estabilidad',
  },
  {
    id: 'GERMAN',
    name: 'Préstamo Alemán',
    icon: Calendar,
    description: 'Cuotas decrecientes. Menos interés total.',
    color: 'bg-purple-50 dark:bg-purple-950',
    textColor: 'text-purple-600 dark:text-purple-400',
    example: 'Ej: Cuota 1: 300€, Cuota 10: 120€',
    pros: ['Menos interés total', 'Deuda baja rápido'],
    bestFor: 'Clientes con alta capacidad de pago inicial',
  },
  {
    id: 'SIMPLE',
    name: 'Préstamo Simple',
    icon: Zap,
    description: 'Todo en una sola cuota al final.',
    color: 'bg-orange-50 dark:bg-orange-950',
    textColor: 'text-orange-600 dark:text-orange-400',
    example: 'Ej: Una cuota de 1,100€',
    pros: ['Sin cuotas mensuales', 'Muy simple'],
    bestFor: 'Préstamos muy cortos (1-3 meses)',
  },
]

interface LoanTypeSelectorProps {
  value: AmortizationType
  onChange: (type: AmortizationType) => void
  disabled?: boolean
  showComparison?: boolean
}

export function LoanTypeSelector({
  value,
  onChange,
  disabled = false,
  showComparison = false,
}: LoanTypeSelectorProps) {
  const [hoveredType, setHoveredType] = useState<AmortizationType | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Tipo de Préstamo</h3>
          <p className="text-sm text-muted-foreground">
            Selecciona el sistema de amortización
          </p>
        </div>
        {showComparison && (
          <button className="text-sm text-primary hover:underline flex items-center gap-1">
            <Info className="h-4 w-4" />
            Ver comparación
          </button>
        )}
      </div>

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        {LOAN_TYPES.map((type) => {
          const Icon = type.icon
          const isSelected = value === type.id
          const isHovered = hoveredType === type.id

          return (
            <div
              key={type.id}
              className="group relative rounded-[1.5rem]"
              onMouseEnter={() => setHoveredType(type.id)}
              onMouseLeave={() => setHoveredType(null)}
            >
              <GlowingEffect
                blur={2}
                spread={24}
                proximity={68}
                inactiveZone={0.24}
                borderWidth={2}
                glow={isSelected || isHovered}
                disabled={false}
                className="rounded-[1.5rem]"
              />
              <Card
                className={cn(
                  'relative min-w-0 cursor-pointer overflow-hidden rounded-[1.5rem] transition-all duration-200',
                  'hover:shadow-xl hover:-translate-y-1',
                  isSelected && 'ring-2 ring-primary shadow-lg',
                  disabled && 'opacity-50 cursor-not-allowed',
                  type.color
                )}
                onClick={() => !disabled && onChange(type.id)}
              >
                <CardContent className="flex h-full flex-col p-5 sm:p-6">
                  {/* Header con icono */}
                  <div className="mb-4 flex items-start justify-between">
                    <div
                      className={cn(
                        'rounded-lg p-3',
                        type.color,
                        'border-2',
                        isSelected ? 'border-primary' : 'border-transparent'
                      )}
                    >
                      <Icon className={cn('h-6 w-6', type.textColor)} />
                    </div>
                  </div>

                  {/* Nombre y descripción */}
                  <div className="mb-3 min-w-0">
                    <h4 className="mb-1 text-[1.05rem] font-semibold leading-snug break-words">
                      {type.name}
                    </h4>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {type.description}
                    </p>
                  </div>

                  {/* Ejemplo */}
                  <div className="mb-4">
                    <div
                      className={cn(
                        'rounded p-2 text-xs leading-5',
                        'bg-white dark:bg-slate-900',
                        'border',
                        type.textColor
                      )}
                    >
                      {type.example}
                    </div>
                  </div>

                  {/* Ventajas (mostrar solo si está seleccionado o hover) */}
                  {(isSelected || isHovered) && (
                    <div className="animate-in slide-in-from-top-2 space-y-2 fade-in duration-200">
                      <div>
                        <p className="mb-1 text-xs font-semibold text-green-700 dark:text-green-400">
                          ✓ Ventajas:
                        </p>
                        <ul className="space-y-1 text-xs leading-5 text-muted-foreground">
                          {type.pros.map((pro, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="mt-0.5 text-green-600">•</span>
                              <span>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Indicador de selección */}
                  {isSelected && (
                    <div className="mt-auto border-t pt-4">
                      <div className="flex items-center gap-2 text-primary">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-xs font-medium">Seleccionado</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      {/* Información adicional del tipo seleccionado */}
      {value && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium mb-1">
                Mejor para: {LOAN_TYPES.find((t) => t.id === value)?.bestFor}
              </p>
              <p className="text-xs text-muted-foreground">
                El cronograma se generará automáticamente según este tipo de amortización.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Versión compacta para uso en formularios
 */
export function LoanTypeSelectorCompact({
  value,
  onChange,
  disabled = false,
}: LoanTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {LOAN_TYPES.map((type) => {
        const Icon = type.icon
        const isSelected = value === type.id

        return (
          <button
            key={type.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(type.id)}
            className={cn(
              'relative p-3 rounded-lg border-2 transition-all',
              'hover:shadow-md hover:scale-105',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Icon
              className={cn(
                'h-5 w-5 mx-auto mb-1',
                isSelected ? 'text-primary' : 'text-muted-foreground'
              )}
            />
            <div className="text-xs font-medium text-center">{type.name.replace('Préstamo ', '')}</div>
          </button>
        )
      })}
    </div>
  )
}
