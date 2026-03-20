'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PaymentSuccessModal } from './PaymentSuccessModal'
import { formatCurrency } from '@/lib/formatters/currency'
import { formatDate } from '@/lib/formatters/date'
import { getOpenInstallmentStatuses } from '@/lib/utils/installmentStatus'
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import type { InstallmentStatus } from '@prisma/client'

type PaymentMethodValue = 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'CHECK' | 'OTHER'

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

interface LoanInstallmentSummary {
  id: string
  installmentNumber: number
  dueDate: string
  pendingAmount: number | string
  totalAmount: number | string
  status: string
}

interface LoanPaymentPageData {
  id: string
  loanNumber: string
  client: LoanClientSummary
  installments: LoanInstallmentSummary[]
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0)
}

function isOpenInstallment(status: string) {
  return getOpenInstallmentStatuses().includes(status as InstallmentStatus)
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text()

  if (!text) {
    return {} as T
  }

  try {
    return JSON.parse(text) as T
  } catch {
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error('El servidor devolvió HTML en lugar de JSON. Revisa el endpoint de pagos.')
    }

    throw new Error('El servidor devolvió una respuesta inesperada.')
  }
}

export default function NewPaymentPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const loanId = searchParams.get('loanId')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loan, setLoan] = useState<LoanPaymentPageData | null>(null)
  const [selectedInstallmentId, setSelectedInstallmentId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>('CASH')
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split('T')[0])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    amount: number
    paymentMethod: string
    loanNumber: string
    clientName: string
    remainingBalance: number
    allocatedToPrincipal: number
    allocatedToInterest: number
    allocatedToPenalty?: number
  } | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // F2: Advertir si hay cambios sin guardar
  const hasUnsavedChanges = amount !== '' && !showSuccessModal
  useUnsavedChanges(hasUnsavedChanges)

  useEffect(() => {
    if (!loanId) {
      setError('No se especificó el préstamo')
      setLoading(false)
      return
    }

    fetch(`/api/loans/${loanId}`)
      .then(async res => {
        const data = await parseResponse<LoanPaymentPageData & { error?: string }>(res)

        if (!res.ok) {
          throw new Error(data.error || 'Error al cargar el préstamo')
        }

        return data
      })
      .then(data => {
        setLoan(data)
        const firstPending = data.installments?.find(
          inst => isOpenInstallment(inst.status) && toNumber(inst.pendingAmount) > 0
        )
        if (firstPending) {
          setSelectedInstallmentId(firstPending.id)
          setAmount(toNumber(firstPending.pendingAmount).toString())
        }
      })
      .catch((err: unknown) => setError(getErrorMessage(err, 'Error al cargar el préstamo')))
      .finally(() => setLoading(false))
  }, [loanId])

  // F1: Interceptar submit para mostrar confirmación
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowConfirmDialog(true)
  }

  const handleConfirmedSubmit = async () => {
    setShowConfirmDialog(false)
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanId,
          amount: parseFloat(amount),
          paymentMethod,
          paidAt,
          installmentId: selectedInstallmentId || null,
        }),
      })

      const result = await parseResponse<{
        error?: string
        id: string
        amount: number
        paymentMethod: string
        allocations?: Array<{
          type: 'PRINCIPAL' | 'INTEREST' | 'PENALTY'
          amount: number
        }>
        loan?: {
          loanNumber: string
          outstandingPrincipal: number
          client: LoanClientSummary
        }
      }>(response)

      if (!response.ok) {
        throw new Error(result.error || 'Error al registrar el pago')
      }

      // Preparar datos para el modal de éxito
      const clientName =
        loan?.client.type === 'INDIVIDUAL'
          ? `${loan.client.individualProfile?.firstName} ${loan.client.individualProfile?.lastName}`
          : loan?.client.businessProfile?.businessName || 'Cliente'

      const allocatedToPrincipal =
        result.allocations?.find(a => a.type === 'PRINCIPAL')?.amount || 0
      const allocatedToInterest =
        result.allocations?.find(a => a.type === 'INTEREST')?.amount || 0
      const allocatedToPenalty =
        result.allocations?.find(a => a.type === 'PENALTY')?.amount || 0

      const modalData = {
        amount: result.amount,
        paymentMethod: result.paymentMethod,
        loanNumber: result.loan?.loanNumber || loan?.loanNumber || '',
        clientName,
        remainingBalance: result.loan?.outstandingPrincipal
          ? toNumber(result.loan.outstandingPrincipal)
          : 0,
        allocatedToPrincipal,
        allocatedToInterest,
        allocatedToPenalty: allocatedToPenalty > 0 ? allocatedToPenalty : undefined,
      }

      setPaymentSuccessData(modalData)
      setShowSuccessModal(true)
      setSubmitting(false)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error al registrar el pago'))
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

  const pendingInstallments = loan.installments?.filter(
    inst => isOpenInstallment(inst.status) && toNumber(inst.pendingAmount) > 0
  ) || []

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/prestamos/${loanId}`}>
          <Button variant="ghost" size="icon" aria-label="Volver atrás">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Registrar Pago</h1>
          <p className="text-muted-foreground">
            {loan.loanNumber} - {clientName}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cuotas Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingInstallments.length === 0 ? (
              <div className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <p className="text-lg font-semibold text-green-800 mb-2">
                  ¡Préstamo Completado!
                </p>
                <p className="text-sm text-gray-600">
                  Este préstamo no tiene cuotas pendientes.
                  <br />
                  Todas las cuotas han sido pagadas.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingInstallments.map(inst => (
                  <div
                    key={inst.id}
                    onClick={() => {
                      setSelectedInstallmentId(inst.id)
                      setAmount(toNumber(inst.pendingAmount).toString())
                    }}
                    className={`p-4 border rounded cursor-pointer hover:bg-gray-50 ${
                      selectedInstallmentId === inst.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">Cuota #{inst.installmentNumber}</p>
                        <p className="text-sm text-gray-600">{formatDate(inst.dueDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">
                          {formatCurrency(toNumber(inst.pendingAmount))}
                        </p>
                        <p className="text-xs text-gray-500">
                          Total: {formatCurrency(toNumber(inst.totalAmount))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Datos del Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <Label htmlFor="payment-amount">Monto a Pagar *</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="payment-method">Método de Pago *</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={value => setPaymentMethod(value as PaymentMethodValue)}
                >
                  <SelectTrigger id="payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Efectivo</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Transferencia</SelectItem>
                    <SelectItem value="CARD">Tarjeta</SelectItem>
                    <SelectItem value="CHECK">Cheque</SelectItem>
                    <SelectItem value="OTHER">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="payment-date">Fecha de Pago</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paidAt}
                  onChange={e => setPaidAt(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={submitting || pendingInstallments.length === 0}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    'Registrar Pago'
                  )}
                </Button>
                <Link href={`/dashboard/prestamos/${loanId}`}>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* F1: Diálogo de confirmación antes de registrar pago */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-label="Confirmar pago">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#14263f]">Confirmar registro de pago</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Estás a punto de registrar un pago por <strong>{formatCurrency(parseFloat(amount || '0'))}</strong>.
              Esta operación no se puede deshacer.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmedSubmit}
                className="rounded-xl bg-[linear-gradient(135deg,#14263f_0%,#1f3a5c_72%,#a97b36_100%)] text-white"
              >
                Confirmar pago
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de éxito */}
      {paymentSuccessData && (
        <PaymentSuccessModal
          open={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false)
            router.push(`/dashboard/prestamos/${loanId}`)
            router.refresh()
          }}
          paymentData={paymentSuccessData}
        />
      )}
    </div>
  )
}
