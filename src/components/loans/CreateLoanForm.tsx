'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ClientCombobox } from '@/components/ui/client-combobox'
import { LoanTypeSelector } from './LoanTypeSelector'
import { LoanSchedulePreview } from './LoanSchedulePreview'
import { LoanCreatedModal } from './LoanCreatedModal'
import { Loader2, Save, Eye, Sparkles } from 'lucide-react'
import type { AmortizationType, InterestType, PaymentFrequency } from '@prisma/client'
import { normalizeInterestRateForInput, normalizeInterestRateForStorage } from '@/lib/utils/interestRate'
import { calculateLoanSummary } from '@/lib/calculations/amortization'

// Schema de validación
const createLoanSchema = z.object({
  clientId: z.string().min(1, 'Debes seleccionar un cliente'),
  principalAmount: z.number().positive('El monto debe ser mayor a 0'),
  amortizationType: z.enum(['AMERICAN', 'FRENCH', 'GERMAN', 'SIMPLE', 'CUSTOM']),
  interestType: z.enum(['FIXED_AMOUNT', 'PERCENTAGE_MONTHLY', 'PERCENTAGE_ANNUAL']),
  interestRate: z.number().nonnegative('La tasa no puede ser negativa'),
  fixedInterestAmount: z.number().optional(),
  termMonths: z.number().int().positive('El plazo debe ser al menos 1 mes'),
  paymentFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY']),
  firstDueDate: z.date(),
  allowSaturdayPayments: z.boolean().default(true),
  allowSundayPayments: z.boolean().default(true),
  hasGuarantor: z.boolean().default(false),
  guarantorName: z.string().optional(),
  guarantorTaxId: z.string().optional(),
  guarantorPhone: z.string().optional(),
  guarantorAddress: z.string().optional(),
  collateralNotes: z.string().optional(),
  notes: z.string().optional(),
  clientInstructions: z.string().optional(),
  sendEmailOnCreate: z.boolean().default(true),
})

type CreateLoanFormData = z.infer<typeof createLoanSchema>

interface ClientsResponse {
  data?: Client[]
}

interface Client {
  id: string
  type: 'INDIVIDUAL' | 'BUSINESS'
  email?: string | null
  phone?: string | null
  individualProfile?: {
    firstName: string
    lastName: string
    taxId?: string | null
  } | null
  businessProfile?: {
    businessName: string
    taxId?: string | null
  } | null
}

interface SourceApplication {
  id: string
  clientId: string
  clientName: string
  requestedAmount: number
  termMonths: number
  proposedRate: number
  paymentFrequency: PaymentFrequency
  createdAt: Date
  status: string
}

interface CreateLoanFormProps {
  sourceApplication?: SourceApplication | null
}

export function CreateLoanForm({ sourceApplication }: CreateLoanFormProps) {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [createdLoanData, setCreatedLoanData] = useState<{
    clientName: string
    loanNumber: string
    amortizationType: string
    principalAmount: number
    termMonths: number
    installmentAmount: number
    finalPayment: number
    annualRate: number
  } | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateLoanFormData>({
    resolver: zodResolver(createLoanSchema),
    mode: 'onBlur', // Validate on blur for better UX
    defaultValues: {
      amortizationType: 'AMERICAN',
      interestType: 'PERCENTAGE_MONTHLY',
      interestRate: 1, // 1% mensual por defecto
      termMonths: 2,
      paymentFrequency: 'MONTHLY',
      firstDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 días
      allowSaturdayPayments: true,
      allowSundayPayments: true,
      hasGuarantor: false,
      sendEmailOnCreate: true,
    },
  })

  // Watch all fields for preview
  const watchedFields = watch()
  const hasGuarantor = watch('hasGuarantor')

  useEffect(() => {
    if (!sourceApplication) return

    reset({
      clientId: sourceApplication.clientId,
      principalAmount: sourceApplication.requestedAmount,
      amortizationType: 'AMERICAN',
      interestType: 'PERCENTAGE_MONTHLY',
      interestRate: normalizeInterestRateForInput(
        sourceApplication.proposedRate,
        'PERCENTAGE_MONTHLY'
      ),
      termMonths: sourceApplication.termMonths,
      paymentFrequency: sourceApplication.paymentFrequency,
      firstDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      allowSaturdayPayments: true,
      allowSundayPayments: true,
      hasGuarantor: false,
      sendEmailOnCreate: true,
    })
  }, [reset, sourceApplication])

  // Load clients
  useEffect(() => {
    async function loadClients() {
      try {
        const response = await fetch('/api/clients?pageSize=500')
        if (response.ok) {
          const result: ClientsResponse = await response.json()
          setClients(result.data || [])
        }
      } catch (error) {
        console.error('Error loading clients:', error)
      } finally {
        setLoadingClients(false)
      }
    }
    loadClients()
  }, [])

  const onSubmit = async (data: CreateLoanFormData) => {
    // Guard clause: prevenir doble envío
    if (submitting) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const response = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: sourceApplication?.id,
          ...data,
          firstDueDate: data.firstDueDate.toISOString(),
        }),
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || ''
        const errorPayload = contentType.includes('application/json')
          ? ((await response.json()) as { error?: string; message?: string })
          : null

        throw new Error(errorPayload?.error || errorPayload?.message || 'Error al crear préstamo')
      }

      const result = (await response.json()) as {
        id: string
        loanNumber: string
        amortizationType: AmortizationType
        principalAmount: number
        termMonths: number
        interestRate: number
        interestType: InterestType
        fixedInterestAmount?: number | null
      }

      // Obtener el nombre del cliente
      const selectedClient = clients.find(c => c.id === data.clientId)
      const clientName = selectedClient
        ? selectedClient.type === 'INDIVIDUAL'
          ? `${selectedClient.individualProfile?.firstName} ${selectedClient.individualProfile?.lastName}`
          : selectedClient.businessProfile?.businessName || 'Cliente'
        : 'Cliente'

      // Calcular el cronograma para obtener los montos de las cuotas
      const storedInterestRate = normalizeInterestRateForStorage(
        data.interestRate,
        data.interestType
      )
      const calculationInterestRate = normalizeInterestRateForInput(
        storedInterestRate,
        data.interestType
      )

      const { installments } = calculateLoanSummary({
        principalAmount: data.principalAmount,
        amortizationType: data.amortizationType,
        interestType: data.interestType,
        interestRate: calculationInterestRate,
        fixedInterestAmount: data.fixedInterestAmount || undefined,
        termMonths: data.termMonths,
        paymentFrequency: data.paymentFrequency,
        firstDueDate: data.firstDueDate,
      })

      // Calcular tasa anual para mostrar
      let annualRate = 0
      if (data.interestType === 'PERCENTAGE_ANNUAL') {
        annualRate = data.interestRate
      } else if (data.interestType === 'PERCENTAGE_MONTHLY') {
        annualRate = data.interestRate * 12
      }

      // Preparar datos para el modal
      const modalData = {
        clientName,
        loanNumber: result.loanNumber,
        amortizationType: result.amortizationType,
        principalAmount: result.principalAmount,
        termMonths: result.termMonths,
        installmentAmount: installments[0]?.totalAmount || 0,
        finalPayment: installments[installments.length - 1]?.totalAmount || 0,
        annualRate,
      }

      console.log('🎉 Préstamo creado exitosamente, mostrando modal:', modalData)
      setCreatedLoanData(modalData)
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al crear préstamo'
      setSubmitError(errorMessage)
      // Scroll to top para ver el error
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  // Preparar términos para preview
  const previewTerms = {
    principalAmount: Number(watchedFields.principalAmount) || 0,
    amortizationType: watchedFields.amortizationType as AmortizationType,
    interestType: watchedFields.interestType as InterestType,
    interestRate: Number(watchedFields.interestRate) || 0,
    termMonths: Number(watchedFields.termMonths) || 1,
    paymentFrequency: watchedFields.paymentFrequency as PaymentFrequency,
    firstDueDate: watchedFields.firstDueDate || new Date(),
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Mensaje de Error */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error al crear préstamo</h3>
              <p className="mt-1 text-sm text-red-700">{submitError}</p>
            </div>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="flex-shrink-0 text-red-400 hover:text-red-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        {/* Columna izquierda - Formulario */}
        <div className="space-y-4">
          {sourceApplication && (
            <Card className="border-[#d7c39a] bg-[linear-gradient(135deg,rgba(249,241,225,0.96),rgba(255,255,255,0.96))]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[#14263f]">
                  <Sparkles className="h-5 w-5 text-[#a97b36]" />
                  Originación desde solicitud aprobada
                </CardTitle>
                <CardDescription>
                  Esta operación nace desde una solicitud aprobada y quedará conectada en la auditoría del sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium text-foreground">{sourceApplication.clientName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha de solicitud</p>
                  <p className="font-medium text-foreground">
                    {new Date(sourceApplication.createdAt).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Monto aprobado</p>
                  <p className="font-medium text-foreground">
                    {sourceApplication.requestedAmount.toFixed(2)} €
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Plazo / frecuencia</p>
                  <p className="font-medium text-foreground">
                    {sourceApplication.termMonths} meses ·{' '}
                    {sourceApplication.paymentFrequency === 'MONTHLY'
                      ? 'Mensual'
                      : sourceApplication.paymentFrequency === 'WEEKLY'
                        ? 'Semanal'
                        : sourceApplication.paymentFrequency === 'BIWEEKLY'
                          ? 'Quincenal'
                          : 'Trimestral'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
              <CardDescription>Selecciona el cliente para este préstamo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="clientId">Cliente *</Label>
                <ClientCombobox
                  clients={clients}
                  value={watchedFields.clientId}
                  onValueChange={(value) => setValue('clientId', value)}
                  disabled={loadingClients || Boolean(sourceApplication)}
                />
                {sourceApplication && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    El cliente queda bloqueado para mantener la trazabilidad con la solicitud aprobada.
                  </p>
                )}
                {errors.clientId && (
                  <p className="text-sm text-red-500 mt-1">{(errors.clientId?.message || "") as string}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tipo de Amortización */}
          <Card>
            <CardHeader>
              <CardTitle>Tipo de Préstamo</CardTitle>
              <CardDescription>
                Selecciona el sistema de amortización
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LoanTypeSelector
                value={watchedFields.amortizationType as AmortizationType}
                onChange={(value) =>
                  setValue('amortizationType', value as CreateLoanFormData['amortizationType'])
                }
                showComparison={false}
              />
            </CardContent>
          </Card>

          {/* Términos Financieros */}
          <Card>
            <CardHeader>
              <CardTitle>Términos Financieros</CardTitle>
              <CardDescription>Monto, plazo y tasa de interés</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="principalAmount">Monto del Préstamo (€) *</Label>
                <Input
                  id="principalAmount"
                  type="number"
                  step="0.01"
                  {...register('principalAmount', { valueAsNumber: true })}
                  placeholder="1000.00"
                />
                {errors.principalAmount && (
                  <p className="text-sm text-red-500 mt-1">{(errors.principalAmount?.message || "") as string}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="termMonths">Plazo (meses) *</Label>
                  <Input
                    id="termMonths"
                    type="number"
                    {...register('termMonths', { valueAsNumber: true })}
                    placeholder="2"
                  />
                  {errors.termMonths && (
                    <p className="text-sm text-red-500 mt-1">{(errors.termMonths?.message || "") as string}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="paymentFrequency">Frecuencia *</Label>
                  <Select
                    value={watchedFields.paymentFrequency}
                    onValueChange={(value) =>
                      setValue(
                        'paymentFrequency',
                        value as CreateLoanFormData['paymentFrequency']
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEKLY">Semanal</SelectItem>
                      <SelectItem value="BIWEEKLY">Quincenal</SelectItem>
                      <SelectItem value="MONTHLY">Mensual</SelectItem>
                      <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="interestType">Tipo de Interés *</Label>
                <Select
                  value={watchedFields.interestType}
                  onValueChange={(value) =>
                    setValue('interestType', value as CreateLoanFormData['interestType'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED_AMOUNT">Monto Fijo (€)</SelectItem>
                    <SelectItem value="PERCENTAGE_MONTHLY">Porcentaje Mensual (%)</SelectItem>
                    <SelectItem value="PERCENTAGE_ANNUAL">Porcentaje Anual (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="interestRate">
                  Tasa de Interés *
                  {watchedFields.interestType === 'FIXED_AMOUNT' ? ' (€)' : ' (%)'}
                </Label>
                <Input
                  id="interestRate"
                  type="number"
                  step="0.1"
                  min="0"
                  {...register('interestRate', { valueAsNumber: true })}
                  placeholder={
                    watchedFields.interestType === 'FIXED_AMOUNT'
                      ? '50'
                      : watchedFields.interestType === 'PERCENTAGE_ANNUAL'
                        ? '12 (para 12% anual)'
                        : '1 (para 1% mensual)'
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {watchedFields.interestType === 'FIXED_AMOUNT'
                    ? 'Monto fijo en euros'
                    : watchedFields.interestType === 'PERCENTAGE_ANNUAL'
                      ? 'Escribe 1 para 1%, 12 para 12%, etc.'
                      : 'Escribe 1 para 1% mensual, 2 para 2%, etc.'}
                </p>
                {errors.interestRate && (
                  <p className="text-sm text-red-500 mt-1">{(errors.interestRate?.message || "") as string}</p>
                )}
              </div>

              <div>
                <Label htmlFor="firstDueDate">Fecha Primer Pago *</Label>
                <Input
                  id="firstDueDate"
                  type="date"
                  {...register('firstDueDate', {
                    valueAsDate: true,
                  })}
                />
                {errors.firstDueDate && (
                  <p className="text-sm text-red-500 mt-1">{(errors.firstDueDate?.message || "") as string}</p>
                )}
              </div>

              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowSaturdayPayments"
                    defaultChecked
                    onCheckedChange={(checked) =>
                      setValue('allowSaturdayPayments', checked === true)
                    }
                  />
                  <Label htmlFor="allowSaturdayPayments" className="text-sm font-normal">
                    Permitir pagos sábados
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowSundayPayments"
                    defaultChecked
                    onCheckedChange={(checked) =>
                      setValue('allowSundayPayments', checked === true)
                    }
                  />
                  <Label htmlFor="allowSundayPayments" className="text-sm font-normal">
                    Permitir pagos domingos
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Garantías y Avales (Opcional) */}
          <Card>
            <CardHeader>
              <CardTitle>Garantías y Avales</CardTitle>
              <CardDescription>Información opcional de garantías</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasGuarantor"
                  onCheckedChange={(checked) => setValue('hasGuarantor', checked === true)}
                />
                <Label htmlFor="hasGuarantor" className="text-sm font-normal">
                  Este préstamo tiene aval/garante
                </Label>
              </div>

              {hasGuarantor && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="guarantorName">Nombre del Garante</Label>
                    <Input id="guarantorName" {...register('guarantorName')} />
                  </div>
                  <div>
                    <Label htmlFor="guarantorTaxId">DNI/CIF del Garante</Label>
                    <Input id="guarantorTaxId" {...register('guarantorTaxId')} />
                  </div>
                  <div>
                    <Label htmlFor="guarantorPhone">Teléfono del Garante</Label>
                    <Input id="guarantorPhone" {...register('guarantorPhone')} />
                  </div>
                  <div>
                    <Label htmlFor="guarantorAddress">Dirección del Garante</Label>
                    <Textarea id="guarantorAddress" {...register('guarantorAddress')} rows={2} />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="collateralNotes">Notas de Garantías</Label>
                <Textarea
                  id="collateralNotes"
                  {...register('collateralNotes')}
                  placeholder="Describe cualquier garantía, colateral o condición especial..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notas e Instrucciones */}
          <Card>
            <CardHeader>
              <CardTitle>Notas e Instrucciones</CardTitle>
              <CardDescription>Información adicional del préstamo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notes">Notas Internas</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="Notas para uso interno del equipo..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="clientInstructions">Instrucciones para el Cliente</Label>
                <Textarea
                  id="clientInstructions"
                  {...register('clientInstructions')}
                  placeholder="Instrucciones especiales que verá el cliente..."
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendEmailOnCreate"
                  defaultChecked
                  onCheckedChange={(checked) => setValue('sendEmailOnCreate', checked === true)}
                />
                <Label htmlFor="sendEmailOnCreate" className="text-sm font-normal">
                  Enviar email al cliente al crear el préstamo
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Botones de acción - dentro del formulario izquierdo */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Crear Préstamo
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Columna derecha - Preview con sticky mejorado */}
        <div className="lg:relative">
          <div className="lg:sticky lg:top-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Vista Previa del Cronograma</h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Ocultar' : 'Mostrar'}
              </Button>
            </div>

            {showPreview && (
              <div className="max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">
                <LoanSchedulePreview terms={previewTerms} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de éxito */}
      {createdLoanData && (
        <LoanCreatedModal
          open={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false)
            // Redirigir al detalle del préstamo
            router.push(`/dashboard/prestamos`)
          }}
          loanData={createdLoanData}
        />
      )}
    </form>
  )
}
