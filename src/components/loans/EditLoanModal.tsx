'use client'

/**
 * EditLoanModal — v2
 *
 * Modal de edición avanzada exclusivo para ADMIN.
 *
 * Campos editables en préstamos ACTIVOS:
 *   · Tasa de interés (%)
 *   · Fecha del primer pago pendiente
 *   · Meses pendientes (aumentar o reducir)
 *   · Notas internas / Instrucciones al cliente
 *
 * Flujo en 2 pasos:
 *   Paso 1 — Formulario de edición
 *   Paso 2 — Revisión de cambios (diff antes/después) → Confirmar
 *
 * Garantías:
 *   · Solo toca cuotas con status PENDING
 *   · PAID / PARTIAL / OVERDUE quedan intactas
 *   · Todo en transacción atómica con AuditLog
 */

import { useState, useTransition, useMemo } from 'react'
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
import { Input }   from '@/components/ui/input'
import { Label }   from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency, formatPercentage } from '@/lib/formatters/currency'
import { formatDate } from '@/lib/formatters/date'
import {
  Pencil,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react'

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditLoanModalProps {
  loanId:                   string
  loanNumber:               string
  /** Tasa almacenada en BD (decimal, ej: 0.10 = 10%) */
  currentInterestRate:      number
  interestType:             string
  principalAmount:          number
  outstandingPrincipal:     number
  pendingInstallmentsCount: number
  /** dueDate (Date) de la primera cuota PENDING */
  firstPendingDueDate:      Date | string | null
  currentNotes:             string | null
  currentClientInstructions:string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convierte un Date o string a "yyyy-MM-dd" para los inputs type="date" */
function toInputDate(d: Date | string | null): string {
  if (!d) return ''
  const date = d instanceof Date ? d : new Date(d)
  return date.toISOString().slice(0, 10)
}

/** Devuelve la tasa en formato % humano (0.1 → 10) */
function toHumanRate(stored: number): number {
  return stored < 1 ? Number((stored * 100).toFixed(4)) : stored
}

// ─── DiffRow — fila de la tabla de cambios ────────────────────────────────────

interface DiffRowProps {
  label: string
  before: string
  after:  string
  changed: boolean
}

function DiffRow({ label, before, after, changed }: DiffRowProps) {
  return (
    <tr className={`border-b text-sm ${changed ? 'bg-amber-50' : ''}`}>
      <td className="py-2 px-3 font-medium text-muted-foreground w-44">{label}</td>
      <td className="py-2 px-3 text-slate-600">{before}</td>
      <td className="py-2 px-3">
        <div className="flex items-center gap-1">
          <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className={changed ? 'font-semibold text-primary' : 'text-slate-600'}>
            {after}
          </span>
        </div>
      </td>
    </tr>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditLoanModal({
  loanId,
  loanNumber,
  currentInterestRate,
  interestType,
  principalAmount,
  outstandingPrincipal,
  pendingInstallmentsCount,
  firstPendingDueDate,
  currentNotes,
  currentClientInstructions,
}: EditLoanModalProps) {
  const router = useRouter()
  const [open, setOpen]             = useState(false)
  const [step, setStep]             = useState<1 | 2>(1)
  const [isPending, startTransition] = useTransition()
  const [error, setError]           = useState<string | null>(null)
  const [success, setSuccess]       = useState(false)

  // ── Tasa ──────────────────────────────────────────────────────────────────
  const isPercentage     = interestType !== 'FIXED_AMOUNT'
  const currentRateHuman = toHumanRate(currentInterestRate)
  const [newRate, setNewRate] = useState<string>(String(currentRateHuman))

  // ── Fecha primer pago pendiente ──────────────────────────────────────────
  const [newFirstDate, setNewFirstDate] = useState<string>(
    toInputDate(firstPendingDueDate)
  )

  // ── Meses pendientes ─────────────────────────────────────────────────────
  const [newPendingMonths, setNewPendingMonths] = useState<string>(
    String(pendingInstallmentsCount)
  )

  // ── Notas ────────────────────────────────────────────────────────────────
  const [notes, setNotes]             = useState(currentNotes ?? '')
  const [clientInstr, setClientInstr] = useState(currentClientInstructions ?? '')

  // ── Cálculo de cambios (para el diff) ─────────────────────────────────────
  const parsedRate    = parseFloat(newRate)
  const parsedMonths  = parseInt(newPendingMonths)
  const rateChanged   = isPercentage && !isNaN(parsedRate) && parsedRate !== currentRateHuman
  const dateChanged   = newFirstDate !== toInputDate(firstPendingDueDate) && newFirstDate !== ''
  const monthsChanged = !isNaN(parsedMonths) && parsedMonths !== pendingInstallmentsCount

  const hasFinancialChange = rateChanged || dateChanged || monthsChanged
  const hasAnyChange       =
    hasFinancialChange ||
    notes.trim()      !== (currentNotes ?? '').trim() ||
    clientInstr.trim() !== (currentClientInstructions ?? '').trim()

  const newMonthlyInterest = isPercentage && !isNaN(parsedRate)
    ? outstandingPrincipal * (parsedRate / 100)
    : null
  const oldMonthlyInterest = isPercentage
    ? outstandingPrincipal * (currentRateHuman / 100)
    : null
  const oldTotalInterestApprox = oldMonthlyInterest !== null
    ? oldMonthlyInterest * pendingInstallmentsCount
    : null
  const newTotalInterestApprox = newMonthlyInterest !== null
    ? newMonthlyInterest * (isNaN(parsedMonths) ? pendingInstallmentsCount : parsedMonths)
    : null

  // ── Validación antes de pasar al paso 2 ──────────────────────────────────
  const validate = (): string | null => {
    if (isPercentage && rateChanged) {
      if (isNaN(parsedRate) || parsedRate <= 0 || parsedRate > 100)
        return 'La tasa debe estar entre 0,01% y 100%'
    }
    if (dateChanged && newFirstDate === '')
      return 'La fecha del primer pago pendiente no puede estar vacía'
    if (monthsChanged) {
      if (isNaN(parsedMonths) || parsedMonths < 1 || parsedMonths > 120)
        return 'Los meses pendientes deben ser un número entre 1 y 120'
    }
    if (!hasAnyChange)
      return 'No hay cambios que guardar'
    return null
  }

  const handleNextStep = () => {
    const err = validate()
    if (err) { setError(err); return }
    setError(null)
    setStep(2)
  }

  // ── Submit final ─────────────────────────────────────────────────────────
  const handleSubmit = () => {
    setError(null)
    const payload: Record<string, unknown> = {}

    if (rateChanged)    payload.interestRate        = parsedRate
    if (dateChanged)    payload.newFirstPendingDate  = new Date(newFirstDate).toISOString()
    if (monthsChanged)  payload.pendingMonths        = parsedMonths
    payload.notes              = notes.trim() || null
    payload.clientInstructions = clientInstr.trim() || null

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
        router.refresh()
        setTimeout(() => { setOpen(false); resetState() }, 1800)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error inesperado')
      }
    })
  }

  // ── Reset ────────────────────────────────────────────────────────────────
  const resetState = () => {
    setStep(1)
    setError(null)
    setSuccess(false)
    setNewRate(String(currentRateHuman))
    setNewFirstDate(toInputDate(firstPendingDueDate))
    setNewPendingMonths(String(pendingInstallmentsCount))
    setNotes(currentNotes ?? '')
    setClientInstr(currentClientInstructions ?? '')
  }

  const handleOpenChange = (next: boolean) => {
    if (isPending) return
    setOpen(next)
    if (!next) resetState()
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>

      {/* Botón disparador — rojo para visibilidad máxima */}
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-red-400 text-red-600 hover:bg-red-50 hover:border-red-500 hover:text-red-700 transition-colors"
        >
          <Pencil className="h-4 w-4 mr-2" />
          Editar Préstamo
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl">

        {/* ── Éxito ─────────────────────────────────────────────────────── */}
        {success ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <p className="text-lg font-semibold text-green-700">Préstamo actualizado</p>
            <p className="text-sm text-muted-foreground">
              El cronograma ha sido recalculado correctamente.
            </p>
          </div>
        ) : step === 1 ? (

          // ── Paso 1: Formulario ───────────────────────────────────────────
          <>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Pencil className="h-5 w-5 text-red-500" />
                Editar Préstamo — {loanNumber}
              </DialogTitle>
              <DialogDescription>
                Corrige las condiciones del préstamo. Solo las cuotas{' '}
                <span className="font-medium">PENDIENTES</span> se recalcularán.
                Las pagadas, vencidas o parciales quedan intactas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2 max-h-[60vh] overflow-y-auto pr-1">

              {/* ── Tasa de interés ──────────────────────────────────────── */}
              {isPercentage && (
                <div className="space-y-2">
                  <Label htmlFor="edit-rate" className="font-semibold">
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
                    onChange={e => setNewRate(e.target.value)}
                  />
                  {/* Preview en euros */}
                  {newMonthlyInterest !== null && outstandingPrincipal > 0 && (
                    <p className="text-xs font-semibold text-blue-600">
                      → {formatCurrency(newMonthlyInterest)} de interés por cuota
                      {rateChanged && (
                        <span className="text-muted-foreground font-normal ml-1">
                          (antes: {formatCurrency(oldMonthlyInterest!)})
                        </span>
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* ── Fecha primer pago pendiente ──────────────────────────── */}
              <div className="space-y-2">
                <Label htmlFor="edit-first-date" className="font-semibold">
                  Fecha del Primer Pago Pendiente
                </Label>
                <Input
                  id="edit-first-date"
                  type="date"
                  value={newFirstDate}
                  onChange={e => setNewFirstDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Las demás fechas se recalculan en cadena a partir de esta.
                </p>
              </div>

              {/* ── Meses pendientes ─────────────────────────────────────── */}
              <div className="space-y-2">
                <Label htmlFor="edit-months" className="font-semibold">
                  Meses Pendientes
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="edit-months"
                    type="number"
                    step="1"
                    min="1"
                    max="120"
                    value={newPendingMonths}
                    onChange={e => setNewPendingMonths(e.target.value)}
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground">
                    actualmente: <strong>{pendingInstallmentsCount}</strong> cuota{pendingInstallmentsCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Reduce o aumenta el número de cuotas que quedan por pagar.
                </p>
              </div>

              <hr className="border-border" />

              {/* ── Notas internas ───────────────────────────────────────── */}
              <div className="space-y-2">
                <Label htmlFor="edit-notes" className="font-semibold">
                  Notas Internas
                </Label>
                <Textarea
                  id="edit-notes"
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Visible solo para el equipo..."
                />
              </div>

              {/* ── Instrucciones al cliente ─────────────────────────────── */}
              <div className="space-y-2">
                <Label htmlFor="edit-instr" className="font-semibold">
                  Instrucciones para el Cliente
                </Label>
                <Textarea
                  id="edit-instr"
                  rows={2}
                  value={clientInstr}
                  onChange={e => setClientInstr(e.target.value)}
                  placeholder="Condiciones especiales visibles al cliente..."
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleNextStep} disabled={!hasAnyChange}>
                Revisar cambios
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </>

        ) : (

          // ── Paso 2: Revisión de cambios (diff) ──────────────────────────
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Revisar cambios — {loanNumber}</DialogTitle>
              <DialogDescription>
                Comprueba que todo es correcto antes de confirmar.
                Esta acción no se puede deshacer automáticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">

              {/* ── Tabla de diff ──────────────────────────────────────── */}
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/60">
                    <tr className="text-xs uppercase text-muted-foreground">
                      <th className="py-2 px-3 text-left font-semibold">Campo</th>
                      <th className="py-2 px-3 text-left font-semibold">Antes</th>
                      <th className="py-2 px-3 text-left font-semibold">Después</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isPercentage && (
                      <DiffRow
                        label="Tasa de interés"
                        before={formatPercentage(currentInterestRate)}
                        after={formatPercentage(parsedRate > 1 ? parsedRate / 100 : parsedRate)}
                        changed={rateChanged}
                      />
                    )}
                    {isPercentage && oldMonthlyInterest !== null && newMonthlyInterest !== null && (
                      <DiffRow
                        label="Interés / cuota"
                        before={formatCurrency(oldMonthlyInterest)}
                        after={formatCurrency(newMonthlyInterest)}
                        changed={rateChanged}
                      />
                    )}
                    <DiffRow
                      label="1er pago pendiente"
                      before={firstPendingDueDate ? formatDate(new Date(firstPendingDueDate)) : '—'}
                      after={newFirstDate ? formatDate(new Date(newFirstDate)) : '—'}
                      changed={dateChanged}
                    />
                    <DiffRow
                      label="Cuotas pendientes"
                      before={`${pendingInstallmentsCount} cuota${pendingInstallmentsCount !== 1 ? 's' : ''}`}
                      after={`${isNaN(parsedMonths) ? pendingInstallmentsCount : parsedMonths} cuota${parsedMonths !== 1 ? 's' : ''}`}
                      changed={monthsChanged}
                    />
                    {oldTotalInterestApprox !== null && newTotalInterestApprox !== null && (
                      <DiffRow
                        label="Interés total aprox."
                        before={formatCurrency(oldTotalInterestApprox)}
                        after={formatCurrency(newTotalInterestApprox)}
                        changed={rateChanged || monthsChanged}
                      />
                    )}
                    <DiffRow
                      label="Notas internas"
                      before={(currentNotes ?? '').trim() || '(sin notas)'}
                      after={notes.trim() || '(sin notas)'}
                      changed={notes.trim() !== (currentNotes ?? '').trim()}
                    />
                    <DiffRow
                      label="Instruc. cliente"
                      before={(currentClientInstructions ?? '').trim() || '(sin instrucciones)'}
                      after={clientInstr.trim() || '(sin instrucciones)'}
                      changed={clientInstr.trim() !== (currentClientInstructions ?? '').trim()}
                    />
                  </tbody>
                </table>
              </div>

              {/* ── Advertencia si hay cambio financiero ─────────────────── */}
              {hasFinancialChange && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <p className="font-semibold mb-0.5">
                      Se recalcularán {isNaN(parsedMonths) ? pendingInstallmentsCount : parsedMonths} cuota{parsedMonths !== 1 ? 's' : ''} PENDIENTE{parsedMonths !== 1 ? 'S' : ''}.
                    </p>
                    <p>
                      Las cuotas PAGADAS, VENCIDAS y PARCIALMENTE PAGADAS conservan
                      sus montos y fechas originales.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => { setStep(1); setError(null) }}
                disabled={isPending}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Volver a editar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  'Confirmar cambios'
                )}
              </Button>
            </DialogFooter>
          </>
        )}

      </DialogContent>
    </Dialog>
  )
}
