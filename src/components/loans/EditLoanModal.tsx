'use client'

/**
 * EditLoanModal
 *
 * Modal exclusivo para ADMIN que permite corregir la tasa de interés de un
 * préstamo activo y/o actualizar sus notas / instrucciones al cliente.
 *
 * Si la tasa cambia, el backend recalcula automáticamente todas las cuotas
 * con estado PENDING. Las cuotas PAID / PARTIAL / OVERDUE no se tocan.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatPercentage } from '@/lib/formatters/currency'
import { Pencil, AlertTriangle, Loader2, CheckCircle2, ArrowRight } from 'lucide-react'

interface EditLoanModalProps {
  loanId: string
  loanNumber: string
  /** Tasa almacenada en BD (decimal, ej: 0.10 = 10%) */
  currentInterestRate: number
  interestType: string
  principalAmount: number
  outstandingPrincipal: number
  pendingInstallmentsCount: number
  currentNotes: string | null
  currentClientInstructions: string | null
}

export function EditLoanModal({
  loanId,
  loanNumber,
  currentInterestRate,
  interestType,
  principalAmount,
  outstandingPrincipal,
  pendingInstallmentsCount,
  currentNotes,
  currentClientInstructions,
}: EditLoanModalProps) {
  const router = useRouter()
  const [open, setOpen]               = useState(false)
  const [isPending, startTransition]  = useTransition()
  const [error, setError]             = useState<string | null>(null)
  const [success, setSuccess]         = useState(false)

  // La tasa en formato humano para mostrar en el input (ej: 0.1 → 10)
  const currentRateHuman = currentInterestRate < 1
    ? currentInterestRate * 100
    : currentInterestRate

  const [newRate, setNewRate]                         = useState<number>(currentRateHuman)
  const [notes, setNotes]                             = useState<string>(currentNotes ?? '')
  const [clientInstructions, setClientInstructions]   = useState<string>(currentClientInstructions ?? '')

  const isPercentage = interestType !== 'FIXED_AMOUNT'
  const rateChanged  = isPercentage && newRate !== currentRateHuman

  // Interés mensual proyectado con la nueva tasa
  const newMonthlyInterest = isPercentage
    ? outstandingPrincipal * (newRate / 100)
    : 0
  const oldMonthlyInterest = isPercentage
    ? outstandingPrincipal * (currentRateHuman / 100)
    : 0

  const handleSubmit = async () => {
    setError(null)

    const payload: Record<string, unknown> = {}

    if (rateChanged) {
      if (newRate <= 0 || newRate > 100) {
        setError('La tasa debe estar entre 0,01% y 100%')
        return
      }
      payload.interestRate = newRate
    }

    payload.notes              = notes.trim() || null
    payload.clientInstructions = clientInstructions.trim() || null

    startTransition(async () => {
      try {
        const res = await fetch(`/api/loans/${loanId}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })

        if (!res.ok) {
          const data = await res.json() as { error?: string }
          throw new Error(data.error ?? 'Error al actualizar el préstamo')
        }

        setSuccess(true)
        // Refrescar datos del servidor sin recargar la página completa
        router.refresh()

        setTimeout(() => {
          setOpen(false)
          setSuccess(false)
        }, 1800)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado')
      }
    })
  }

  const handleOpenChange = (next: boolean) => {
    if (isPending) return
    setOpen(next)
    if (!next) {
      setError(null)
      setSuccess(false)
      setNewRate(currentRateHuman)
      setNotes(currentNotes ?? '')
      setClientInstructions(currentClientInstructions ?? '')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4 mr-2" />
          Editar Préstamo
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Editar Préstamo {loanNumber}</DialogTitle>
          <DialogDescription>
            Solo el ADMIN puede modificar las condiciones de un préstamo activo.
            {rateChanged && pendingInstallmentsCount > 0 && (
              <span className="block mt-1 text-amber-600 font-medium">
                Se recalcularán {pendingInstallmentsCount} cuota{pendingInstallmentsCount !== 1 ? 's' : ''} PENDIENTE{pendingInstallmentsCount !== 1 ? 'S' : ''}.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-lg font-semibold text-green-700">Préstamo actualizado</p>
            <p className="text-sm text-muted-foreground">El cronograma ha sido recalculado.</p>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* ── Tasa de Interés ──────────────────────────────────────────── */}
            {isPercentage && (
              <div className="space-y-2">
                <Label htmlFor="edit-rate">
                  Tasa de Interés (%)
                  {interestType === 'PERCENTAGE_MONTHLY' ? ' mensual' : ' anual'}
                </Label>
                <Input
                  id="edit-rate"
                  type="number"
                  step="1"
                  min="0.01"
                  max="100"
                  value={newRate}
                  onChange={e => setNewRate(Number(e.target.value))}
                />

                {/* Comparativa antes / después */}
                <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-medium">Antes:</span>
                    <span>{formatPercentage(currentInterestRate)}</span>
                    <span className="text-xs">
                      → {formatCurrency(oldMonthlyInterest)}/cuota
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="h-3 w-3 text-primary" />
                    <span className="font-medium">Después:</span>
                    <span className={rateChanged ? 'text-primary font-semibold' : ''}>
                      {formatPercentage(newRate > 1 ? newRate / 100 : newRate)}
                    </span>
                    <span className="text-xs">
                      → {formatCurrency(newMonthlyInterest)}/cuota
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Capital pendiente: {formatCurrency(outstandingPrincipal)}
                    {outstandingPrincipal !== principalAmount && (
                      <span> (prestado: {formatCurrency(principalAmount)})</span>
                    )}
                  </p>
                </div>

                {/* Advertencia si hay cuotas vencidas sin tocar */}
                {rateChanged && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
                    <p>
                      Las cuotas VENCIDAS, PAGADAS y PARCIALMENTE PAGADAS conservan sus montos originales.
                      Solo se recalculan las {pendingInstallmentsCount} cuota{pendingInstallmentsCount !== 1 ? 's' : ''} PENDIENTE{pendingInstallmentsCount !== 1 ? 'S' : ''}.
                    </p>
                  </div>
                )}
              </div>
            )}

            <hr className="border-border" />

            {/* ── Notas Internas ───────────────────────────────────────────── */}
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notas Internas</Label>
              <Textarea
                id="edit-notes"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notas visibles solo para el equipo..."
              />
            </div>

            {/* ── Instrucciones al Cliente ─────────────────────────────────── */}
            <div className="space-y-2">
              <Label htmlFor="edit-instructions">Instrucciones para el Cliente</Label>
              <Textarea
                id="edit-instructions"
                rows={3}
                value={clientInstructions}
                onChange={e => setClientInstructions(e.target.value)}
                placeholder="Instrucciones especiales para el cliente..."
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        {!success && (
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando…
                </>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
