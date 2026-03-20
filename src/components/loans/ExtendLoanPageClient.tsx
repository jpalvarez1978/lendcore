'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/formatters/currency'
import {
  getInstallmentComponentBalances,
  type InstallmentComponentBalances,
  type InstallmentLike,
} from '@/lib/calculations/allocation'
import { formatPercentage } from '@/lib/formatters/currency'
import { normalizeInterestRateForInput } from '@/lib/utils/interestRate'
import { ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { addMonths } from 'date-fns'

interface LoanClientSummary {
  type: 'INDIVIDUAL' | 'BUSINESS'
  individualProfile?: {
    firstName?: string | null
    lastName?: string | null
  } | null
  businessProfile?: {
    businessName?: string | null
  } | null
}

interface ExtendLoanInstallment extends InstallmentLike {
  id: string
  installmentNumber: number
  dueDate: string
}

interface ExtendLoanData {
  id: string
  loanNumber: string
  principalAmount: number | string
  interestRate: number | string
  termMonths: number
  client: LoanClientSummary
  installments: ExtendLoanInstallment[]
}

interface ExtensionPreview {
  currentPending: number
  capitalPending: number
  months: number
  newInterestRate: number
  monthlyPayment: number
  totalNewInterest: number
  finalPayment: number
  totalToPay: number
}

interface ScheduleInstallment {
  number: number
  dueDate: Date
  principal: number
  interest: number
  total: number
  balance: number
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0)
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json()
  return data as T
}

export default function ExtendLoanPageClient() {
  const router = useRouter()
  const params = useParams()
  const loanId = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loan, setLoan] = useState<ExtendLoanData | null>(null)

  const [additionalMonths, setAdditionalMonths] = useState('3')
  const [newInterestRate, setNewInterestRate] = useState('')
  const [preview, setPreview] = useState<ExtensionPreview | null>(null)
  const [newSchedule, setNewSchedule] = useState<ScheduleInstallment[]>([])

  useEffect(() => {
    if (!loanId) return

    fetch(`/api/loans/${loanId}`)
      .then(res => parseResponse<ExtendLoanData & { error?: string }>(res))
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setLoan(data)
          setNewInterestRate(
            normalizeInterestRateForInput(
              toNumber(data.interestRate),
              'PERCENTAGE_MONTHLY'
            ).toString()
          )
        }
      })
      .catch((err: unknown) => setError(getErrorMessage(err, 'Error al cargar el préstamo')))
      .finally(() => setLoading(false))
  }, [loanId])

  // Generar preview y cronograma cuando cambian los valores
  useEffect(() => {
    if (!loan || !additionalMonths || !newInterestRate) return

    const installmentBalances = loan.installments.map(inst =>
      getInstallmentComponentBalances(inst)
    )
    const capitalPending = installmentBalances.reduce(
      (sum: number, balances: InstallmentComponentBalances) => sum + balances.pendingPrincipal,
      0
    )
    const totalPending = installmentBalances.reduce(
      (sum: number, balances: InstallmentComponentBalances) =>
        sum + balances.pendingPrincipal + balances.pendingInterest + balances.pendingPenalty,
      0
    )

    const months = parseInt(additionalMonths)
    const rate = parseFloat(newInterestRate) / 100

    // IMPORTANTE: Interés calculado SOLO sobre el CAPITAL, no sobre el saldo total
    const monthlyInterest = capitalPending * rate
    const totalNewInterest = monthlyInterest * months

    setPreview({
      currentPending: totalPending,
      capitalPending,
      months,
      newInterestRate: parseFloat(newInterestRate),
      monthlyPayment: monthlyInterest,
      totalNewInterest: totalNewInterest,
      finalPayment: capitalPending,
      totalToPay: totalPending + totalNewInterest,
    })

    // Generar cronograma completo
    const lastInstallment = loan.installments[loan.installments.length - 1]
    const lastDueDate = new Date(lastInstallment.dueDate)
    const lastNumber = lastInstallment.installmentNumber

    const schedule = []
    for (let i = 0; i < months; i++) {
      const isLast = i === months - 1
      const dueDate = addMonths(lastDueDate, i + 1)

      schedule.push({
        number: lastNumber + i + 1,
        dueDate,
        principal: isLast ? capitalPending : 0,
        interest: monthlyInterest,
        total: isLast ? capitalPending + monthlyInterest : monthlyInterest,
        balance: isLast ? 0 : capitalPending,
      })
    }

    setNewSchedule(schedule)
  }, [loan, additionalMonths, newInterestRate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch(`/api/loans/${loanId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          additionalMonths: parseInt(additionalMonths),
          newInterestRate: parseFloat(newInterestRate),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al prorrogar el préstamo')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push(`/dashboard/prestamos/${loanId}`)
      }, 2000)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error al prorrogar el préstamo'))
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!loan) {
    return (
      <div className="space-y-6">
        <p className="text-red-600">{error || 'Préstamo no encontrado'}</p>
        <Link href="/dashboard/prestamos">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </Link>
      </div>
    )
  }

  const clientName =
    loan.client.type === 'INDIVIDUAL'
      ? `${loan.client.individualProfile?.firstName} ${loan.client.individualProfile?.lastName}`
      : loan.client.businessProfile?.businessName

  const loanInstallmentBalances = loan.installments.map(inst =>
    getInstallmentComponentBalances(inst)
  )
  const currentPendingPrincipal = loanInstallmentBalances.reduce(
    (sum: number, balances: InstallmentComponentBalances) => sum + balances.pendingPrincipal,
    0
  )
  const currentPendingInterest = loanInstallmentBalances.reduce(
    (sum: number, balances: InstallmentComponentBalances) =>
      sum + balances.pendingInterest + balances.pendingPenalty,
    0
  )
  const currentPendingTotal = currentPendingPrincipal + currentPendingInterest

  const formatDateShort = (date: Date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/prestamos/${loanId}`}>
          <Button variant="ghost" size="icon" aria-label="Volver al préstamo">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Prorrogar Préstamo</h1>
          <p className="text-muted-foreground">
            {loan.loanNumber} - {clientName}
          </p>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          ¡Préstamo prorrogado exitosamente! Redirigiendo...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estado Actual del Préstamo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Monto Original</p>
              <p className="text-lg font-semibold">{formatCurrency(Number(loan.principalAmount))}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo Pendiente</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(currentPendingTotal)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Capital: {formatCurrency(currentPendingPrincipal)} + Interés:{' '}
                {formatCurrency(currentPendingInterest)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tasa Actual</p>
              <p className="text-lg">
                {formatPercentage(Number(loan.interestRate))} mensual
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Plazo Original</p>
              <p className="text-lg">{loan.termMonths} meses</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configurar Prórroga</CardTitle>
            <CardDescription>
              Extiende el plazo y ajusta la tasa de interés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Meses Adicionales *</Label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  required
                  value={additionalMonths}
                  onChange={e => setAdditionalMonths(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Cuántos meses adicionales deseas agregar
                </p>
              </div>

              <div>
                <Label>Nueva Tasa de Interés (%) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={newInterestRate}
                  onChange={e => setNewInterestRate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tasa mensual para las nuevas cuotas (ejemplo: 1 para 1%)
                </p>
              </div>

              {preview && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                  <p className="font-semibold text-blue-900">Preview de la Prórroga:</p>
                  <div className="text-sm space-y-1">
                    <p>• {preview.months} nuevas cuotas de <span className="font-bold">{formatCurrency(Number(preview.monthlyPayment))}</span> (solo interés)</p>
                    <p>• Última cuota: <span className="font-bold">{formatCurrency(preview.finalPayment)}</span> (capital completo)</p>
                    <p>• Interés adicional total: <span className="font-bold text-orange-600">{formatCurrency(preview.totalNewInterest)}</span></p>
                    <p className="pt-2 border-t border-blue-300">
                      <span className="font-bold text-blue-900">Total a pagar: {formatCurrency(preview.totalToPay)}</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={submitting || success}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Prorrogar Préstamo'
                  )}
                </Button>
                <Link href={`/dashboard/prestamos/${loanId}`}>
                  <Button type="button" variant="outline" disabled={submitting}>
                    Cancelar
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* NUEVO CRONOGRAMA */}
      {newSchedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Nuevo Cronograma de Pagos</CardTitle>
            <CardDescription>
              Así quedarán las {newSchedule.length} nuevas cuotas después de la prórroga
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-sm bg-gray-50">
                    <th className="text-left p-3">Cuota</th>
                    <th className="text-left p-3">Fecha Vencimiento</th>
                    <th className="text-right p-3">Capital</th>
                    <th className="text-right p-3">Interés</th>
                    <th className="text-right p-3">Total Cuota</th>
                    <th className="text-right p-3">Saldo Restante</th>
                  </tr>
                </thead>
                <tbody>
                  {newSchedule.map((inst, idx) => (
                    <tr key={idx} className="border-b text-sm hover:bg-gray-50">
                      <td className="p-3 font-medium">#{inst.number}</td>
                      <td className="p-3">{formatDateShort(inst.dueDate)}</td>
                      <td className="text-right p-3">
                        {inst.principal > 0 ? (
                          <span className="font-bold text-blue-600">
                            {formatCurrency(inst.principal)}
                          </span>
                        ) : (
                          <span className="text-gray-400">0,00 €</span>
                        )}
                      </td>
                      <td className="text-right p-3 text-orange-600">
                        {formatCurrency(inst.interest)}
                      </td>
                      <td className="text-right p-3 font-bold">
                        {formatCurrency(inst.total)}
                      </td>
                      <td className="text-right p-3 text-gray-600">
                        {formatCurrency(inst.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-100 font-bold">
                    <td className="p-3" colSpan={2}>TOTALES</td>
                    <td className="text-right p-3">
                      {formatCurrency(newSchedule.reduce((sum, inst) => sum + inst.principal, 0))}
                    </td>
                    <td className="text-right p-3 text-orange-600">
                      {formatCurrency(newSchedule.reduce((sum, inst) => sum + inst.interest, 0))}
                    </td>
                    <td className="text-right p-3">
                      {formatCurrency(newSchedule.reduce((sum, inst) => sum + inst.total, 0))}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-900">⚠️ Importante</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-yellow-900">
          <ul className="list-disc list-inside space-y-1">
            <li>Se mantendrán todas las cuotas pendientes actuales</li>
            <li>La cuota que tenía el capital se modificará para tener solo interés</li>
            <li>Se crearán {additionalMonths || '___'} nuevas cuotas con la nueva tasa de interés</li>
            <li>La última cuota nueva incluirá todo el capital pendiente</li>
            <li>Esta acción no se puede deshacer</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
