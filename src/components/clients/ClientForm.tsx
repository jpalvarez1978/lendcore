'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  clientSchema,
} from '@/lib/validations/client.schema'
import { User, Building2 } from 'lucide-react'

type ClientTypeValue = 'INDIVIDUAL' | 'BUSINESS'
type RiskLevelValue = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface ClientFormValues {
  type: ClientTypeValue
  firstName?: string
  lastName?: string
  taxId?: string
  dateOfBirth?: string | null
  occupation?: string | null
  income?: number | null
  reference1Name?: string | null
  reference1Phone?: string | null
  reference2Name?: string | null
  reference2Phone?: string | null
  businessName?: string
  legalRepName?: string
  legalRepTaxId?: string
  industry?: string | null
  annualRevenue?: number | null
  employeeCount?: number | null
  email?: string | null
  phone: string
  address?: string | null
  city?: string | null
  postalCode?: string | null
  creditLimit: number
  riskLevel: RiskLevelValue
  internalScore?: number | null
}

interface ClientFormInitialData {
  id?: string
  type?: ClientTypeValue
  individualProfile?: Partial<ClientFormValues>
  businessProfile?: Partial<ClientFormValues>
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  postalCode?: string | null
  creditLimit?: number
  riskLevel?: RiskLevelValue
  internalScore?: number | null
}

interface ClientFormProps {
  initialData?: ClientFormInitialData
  isEditing?: boolean
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function buildDefaultValues(
  initialData: ClientFormInitialData | undefined,
  clientType: ClientTypeValue
): ClientFormValues {
  return {
    type: initialData?.type || clientType,
    firstName: initialData?.individualProfile?.firstName || '',
    lastName: initialData?.individualProfile?.lastName || '',
    taxId: initialData?.individualProfile?.taxId || initialData?.businessProfile?.taxId || '',
    dateOfBirth: initialData?.individualProfile?.dateOfBirth || '',
    occupation: initialData?.individualProfile?.occupation || '',
    income: initialData?.individualProfile?.income ?? null,
    reference1Name: initialData?.individualProfile?.reference1Name || '',
    reference1Phone: initialData?.individualProfile?.reference1Phone || '',
    reference2Name: initialData?.individualProfile?.reference2Name || '',
    reference2Phone: initialData?.individualProfile?.reference2Phone || '',
    businessName: initialData?.businessProfile?.businessName || '',
    legalRepName: initialData?.businessProfile?.legalRepName || '',
    legalRepTaxId: initialData?.businessProfile?.legalRepTaxId || '',
    industry: initialData?.businessProfile?.industry || '',
    annualRevenue: initialData?.businessProfile?.annualRevenue ?? null,
    employeeCount: initialData?.businessProfile?.employeeCount ?? null,
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    postalCode: initialData?.postalCode || '',
    creditLimit: initialData?.creditLimit ?? 0,
    riskLevel: initialData?.riskLevel || 'MEDIUM',
    internalScore: initialData?.internalScore ?? null,
  }
}

export function ClientForm({ initialData, isEditing = false }: ClientFormProps) {
  const router = useRouter()
  const [clientType, setClientType] = useState<ClientTypeValue>(
    initialData?.type || 'INDIVIDUAL'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema) as Resolver<ClientFormValues>,
    defaultValues: buildDefaultValues(initialData, clientType),
  })

  const onSubmit = async (data: ClientFormValues) => {
    setLoading(true)
    setError('')

    try {
      const url = isEditing ? `/api/clients/${initialData.id}` : '/api/clients'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al guardar cliente')
      }

      router.push('/dashboard/clientes')
      router.refresh()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error al guardar cliente'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" aria-label="Formulario de cliente">
      {/* Tipo de Cliente */}
      {!isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Tipo de Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4" role="group" aria-label="Seleccionar tipo de cliente">
              <button
                type="button"
                onClick={() => setClientType('INDIVIDUAL')}
                aria-pressed={clientType === 'INDIVIDUAL'}
                aria-label="Persona Física"
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-6 transition-colors ${
                  clientType === 'INDIVIDUAL'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <User className="h-8 w-8" aria-hidden="true" />
                <span className="font-medium">Persona Física</span>
              </button>
              <button
                type="button"
                onClick={() => setClientType('BUSINESS')}
                aria-pressed={clientType === 'BUSINESS'}
                aria-label="Empresa"
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-6 transition-colors ${
                  clientType === 'BUSINESS'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Building2 className="h-8 w-8" aria-hidden="true" />
                <span className="font-medium">Empresa</span>
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Datos del Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>
            {clientType === 'INDIVIDUAL' ? 'Datos Personales' : 'Datos de la Empresa'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input type="hidden" {...register('type')} value={clientType} />

          {clientType === 'INDIVIDUAL' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="text-sm font-medium">
                    Nombre *
                  </label>
                  <Input
                    id="firstName"
                    {...register('firstName')}
                    placeholder="Juan"
                    aria-invalid={!!errors.firstName}
                    aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                  />
                  {errors.firstName && (
                    <p id="firstName-error" className="text-sm text-red-500 mt-1" role="alert">
                      {(errors.firstName?.message || "") as string}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="lastName" className="text-sm font-medium">
                    Apellidos *
                  </label>
                  <Input
                    id="lastName"
                    {...register('lastName')}
                    placeholder="García Pérez"
                    aria-invalid={!!errors.lastName}
                    aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                  />
                  {errors.lastName && (
                    <p id="lastName-error" className="text-sm text-red-500 mt-1" role="alert">
                      {(errors.lastName?.message || "") as string}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="taxId" className="text-sm font-medium">
                    Documento de identidad o pasaporte
                  </label>
                  <Input
                    id="taxId"
                    {...register('taxId')}
                    placeholder="Documento fiscal, identidad o pasaporte"
                    aria-invalid={!!errors.taxId}
                    aria-describedby={errors.taxId ? 'taxId-error' : undefined}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Opcional. Puedes usar un documento de cualquier país.
                  </p>
                  {errors.taxId && (
                    <p id="taxId-error" className="text-sm text-red-500 mt-1" role="alert">
                      {(errors.taxId?.message || "") as string}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="dateOfBirth" className="text-sm font-medium">
                    Fecha de Nacimiento
                  </label>
                  <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="occupation" className="text-sm font-medium">Ocupación</label>
                  <Input id="occupation" {...register('occupation')} placeholder="Ingeniero" />
                </div>
                <div>
                  <label htmlFor="income" className="text-sm font-medium">Ingresos Mensuales (€)</label>
                  <Input
                    id="income"
                    type="number"
                    {...register('income', { valueAsNumber: true })}
                    placeholder="3000"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label htmlFor="businessName" className="text-sm font-medium">Razón Social *</label>
                <Input id="businessName" {...register('businessName')} placeholder="Constructora ABC SL" />
                {errors.businessName && (
                  <p className="text-sm text-red-500 mt-1">{(errors.businessName?.message || "") as string}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="businessTaxId" className="text-sm font-medium">
                    Identificación fiscal
                  </label>
                  <Input
                    id="businessTaxId"
                    {...register('taxId')}
                    placeholder="NIF, VAT, EIN o identificador local"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Opcional. Acepta identificadores fiscales de cualquier país.
                  </p>
                  {errors.taxId && (
                    <p className="text-sm text-red-500 mt-1">{(errors.taxId?.message || "") as string}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="industry" className="text-sm font-medium">Sector/Industria</label>
                  <Input id="industry" {...register('industry')} placeholder="Construcción" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="legalRepName" className="text-sm font-medium">Representante Legal *</label>
                  <Input id="legalRepName" {...register('legalRepName')} placeholder="Alberto Martínez" />
                  {errors.legalRepName && (
                    <p className="text-sm text-red-500 mt-1">{(errors.legalRepName?.message || "") as string}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="legalRepTaxId" className="text-sm font-medium">
                    Documento del representante
                  </label>
                  <Input
                    id="legalRepTaxId"
                    {...register('legalRepTaxId')}
                    placeholder="Documento de identidad o pasaporte"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Opcional. Puedes registrar un documento internacional.
                  </p>
                  {errors.legalRepTaxId && (
                    <p className="text-sm text-red-500 mt-1">{(errors.legalRepTaxId?.message || "") as string}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="annualRevenue" className="text-sm font-medium">Facturación Anual (€)</label>
                  <Input
                    id="annualRevenue"
                    type="number"
                    {...register('annualRevenue', { valueAsNumber: true })}
                    placeholder="500000"
                  />
                </div>
                <div>
                  <label htmlFor="employeeCount" className="text-sm font-medium">Número de Empleados</label>
                  <Input
                    id="employeeCount"
                    type="number"
                    {...register('employeeCount', { valueAsNumber: true })}
                    placeholder="15"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Datos de Contacto */}
      <Card>
        <CardHeader>
          <CardTitle>Datos de Contacto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="cliente@email.com"
              />
            </div>
            <div>
              <label htmlFor="phone" className="text-sm font-medium">
                Teléfono *
              </label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="+34 600 123 456"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
              />
              {errors.phone && (
                <p id="phone-error" className="text-sm text-red-500 mt-1" role="alert">
                  {(errors.phone?.message || "") as string}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="address" className="text-sm font-medium">Dirección</label>
            <Input id="address" {...register('address')} placeholder="Calle Gran Vía, 45" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className="text-sm font-medium">Ciudad</label>
              <Input id="city" {...register('city')} placeholder="Ciudad" />
            </div>
            <div>
              <label htmlFor="postalCode" className="text-sm font-medium">Código Postal</label>
              <Input id="postalCode" {...register('postalCode')} placeholder="48001" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información Crediticia */}
      <Card>
        <CardHeader>
          <CardTitle>Información Crediticia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="creditLimit" className="text-sm font-medium">Cupo de Crédito (€)</label>
              <Input
                id="creditLimit"
                type="number"
                {...register('creditLimit', { valueAsNumber: true })}
                placeholder="30000"
              />
            </div>
            <div>
              <label htmlFor="riskLevel" className="text-sm font-medium">
                Nivel de Riesgo
              </label>
              <select
                id="riskLevel"
                {...register('riskLevel')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                aria-label="Seleccionar nivel de riesgo del cliente"
              >
                <option value="LOW">Bajo</option>
                <option value="MEDIUM">Medio</option>
                <option value="HIGH">Alto</option>
                <option value="CRITICAL">Crítico</option>
              </select>
            </div>
            <div>
              <label htmlFor="internalScore" className="text-sm font-medium">Score Interno (0-100)</label>
              <Input
                id="internalScore"
                type="number"
                {...register('internalScore', { valueAsNumber: true })}
                placeholder="70"
                min="0"
                max="100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error y Botones */}
      {error && (
        <div
          className="rounded-md bg-red-50 p-4 text-sm text-red-800"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : isEditing ? 'Actualizar Cliente' : 'Crear Cliente'}
        </Button>
      </div>
    </form>
  )
}
