'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type ClientTypeValue = 'INDIVIDUAL' | 'BUSINESS'
type ClientStatusValue = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BLACKLISTED'
type RiskLevelValue = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface ClientIndividualProfile {
  firstName?: string | null
  lastName?: string | null
  taxId?: string | null
  dateOfBirth?: string | null
  occupation?: string | null
  income?: number | string | null
}

interface ClientBusinessProfile {
  businessName?: string | null
  taxId?: string | null
  legalRepName?: string | null
  legalRepTaxId?: string | null
  industry?: string | null
  employeeCount?: number | string | null
}

interface ClientEditData {
  id: string
  type: ClientTypeValue
  status: ClientStatusValue
  riskLevel: RiskLevelValue
  creditLimit: number | string
  phone?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  postalCode?: string | null
  individualProfile?: ClientIndividualProfile | null
  businessProfile?: ClientBusinessProfile | null
}

interface ClientUpdatePayload {
  status: ClientStatusValue
  riskLevel: RiskLevelValue
  creditLimit: number
  phone: string
  email: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  individualProfile?: {
    firstName: string
    lastName: string
    taxId: string | null
    dateOfBirth: string | null
    occupation: string | null
    income: number | null
  }
  businessProfile?: {
    businessName: string
    taxId: string | null
    legalRepName: string
    legalRepTaxId: string | null
    industry: string | null
    employeeCount: number | null
  }
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

export default function EditClientPageClient() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Datos del cliente
  const [clientType, setClientType] = useState<ClientTypeValue>('INDIVIDUAL')
  const [status, setStatus] = useState<ClientStatusValue>('ACTIVE')
  const [riskLevel, setRiskLevel] = useState<RiskLevelValue>('MEDIUM')
  const [creditLimit, setCreditLimit] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')

  // Persona Física
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [occupation, setOccupation] = useState('')
  const [income, setIncome] = useState('')

  // Empresa
  const [businessName, setBusinessName] = useState('')
  const [businessTaxId, setBusinessTaxId] = useState('')
  const [legalRepName, setLegalRepName] = useState('')
  const [legalRepTaxId, setLegalRepTaxId] = useState('')
  const [industry, setIndustry] = useState('')
  const [employeeCount, setEmployeeCount] = useState('')

  useEffect(() => {
    async function loadClient() {
      try {
        const response = await fetch(`/api/clients/${clientId}`)
        if (!response.ok) throw new Error('Error al cargar cliente')

        const client = await parseResponse<ClientEditData>(response)

        setClientType(client.type)
        setStatus(client.status)
        setRiskLevel(client.riskLevel)
        setCreditLimit(toNumber(client.creditLimit).toString())
        setPhone(client.phone || '')
        setEmail(client.email || '')
        setAddress(client.address || '')
        setCity(client.city || '')
        setPostalCode(client.postalCode || '')

        if (client.type === 'INDIVIDUAL' && client.individualProfile) {
          setFirstName(client.individualProfile.firstName || '')
          setLastName(client.individualProfile.lastName || '')
          setTaxId(client.individualProfile.taxId || '')
          setDateOfBirth(
            client.individualProfile.dateOfBirth
              ? new Date(client.individualProfile.dateOfBirth).toISOString().split('T')[0]
              : ''
          )
          setOccupation(client.individualProfile.occupation || '')
          setIncome(
            client.individualProfile.income != null
              ? toNumber(client.individualProfile.income).toString()
              : ''
          )
        } else if (client.type === 'BUSINESS' && client.businessProfile) {
          setBusinessName(client.businessProfile.businessName || '')
          setBusinessTaxId(client.businessProfile.taxId || '')
          setLegalRepName(client.businessProfile.legalRepName || '')
          setLegalRepTaxId(client.businessProfile.legalRepTaxId || '')
          setIndustry(client.businessProfile.industry || '')
          setEmployeeCount(
            client.businessProfile.employeeCount != null
              ? toNumber(client.businessProfile.employeeCount).toString()
              : ''
          )
        }

        setLoadingData(false)
      } catch (err: unknown) {
        setError(getErrorMessage(err, 'Error al cargar cliente'))
        setLoadingData(false)
      }
    }

    loadClient()
  }, [clientId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const data: ClientUpdatePayload = {
        status,
        riskLevel,
        creditLimit: parseFloat(creditLimit),
        phone,
        email: email || null,
        address: address || null,
        city: city || null,
        postalCode: postalCode || null,
      }

      if (clientType === 'INDIVIDUAL') {
        data.individualProfile = {
          firstName,
          lastName,
          taxId: taxId.trim() || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
          occupation: occupation || null,
          income: income ? parseFloat(income) : null,
        }
      } else {
        data.businessProfile = {
          businessName,
          taxId: businessTaxId.trim() || null,
          legalRepName,
          legalRepTaxId: legalRepTaxId.trim() || null,
          industry: industry || null,
          employeeCount: employeeCount ? parseInt(employeeCount) : null,
        }
      }

      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await parseResponse<{ error?: string }>(response)

      if (!response.ok) {
        throw new Error(result.error || 'Error al actualizar cliente')
      }

      setSuccess('Cliente actualizado correctamente')

      // Redirect después de 1 segundo
      setTimeout(() => {
        router.push(`/dashboard/clientes/${clientId}`)
      }, 1000)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error al actualizar cliente'))
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/clientes/${clientId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Editar Cliente</h1>
          <p className="text-muted-foreground">
            Modificar información y límite de crédito
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Configuración General */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="status">Estado</Label>
                <Select value={status} onValueChange={value => setStatus(value as ClientStatusValue)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Activo</SelectItem>
                    <SelectItem value="INACTIVE">Inactivo</SelectItem>
                    <SelectItem value="SUSPENDED">Suspendido</SelectItem>
                    <SelectItem value="BLACKLISTED">Lista Negra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="riskLevel">Nivel de Riesgo</Label>
                <Select
                  value={riskLevel}
                  onValueChange={value => setRiskLevel(value as RiskLevelValue)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Bajo</SelectItem>
                    <SelectItem value="MEDIUM">Medio</SelectItem>
                    <SelectItem value="HIGH">Alto</SelectItem>
                    <SelectItem value="CRITICAL">Crítico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="creditLimit">Límite de Crédito (€) *</Label>
              <Input
                id="creditLimit"
                type="number"
                step="0.01"
                required
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="10000.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Monto máximo que el cliente puede tener en préstamos activos
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Datos de Contacto */}
        <Card>
          <CardHeader>
            <CardTitle>Datos de Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                  id="phone"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+34 600 123 456"
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@ejemplo.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle Principal 123"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Madrid"
                />
              </div>

              <div>
                <Label htmlFor="postalCode">Código Postal</Label>
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="28001"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Datos Persona Física */}
        {clientType === 'INDIVIDUAL' && (
          <Card>
            <CardHeader>
              <CardTitle>Datos Personales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">Nombre *</Label>
                  <Input
                    id="firstName"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="lastName">Apellidos *</Label>
                  <Input
                    id="lastName"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="taxId">Documento de identidad o pasaporte</Label>
                  <Input
                    id="taxId"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="Documento fiscal, identidad o pasaporte"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Opcional. Puedes registrar documentos de cualquier país.
                  </p>
                </div>

                <div>
                  <Label htmlFor="dateOfBirth">Fecha de Nacimiento</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="occupation">Ocupación</Label>
                  <Input
                    id="occupation"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="Ingeniero"
                  />
                </div>

                <div>
                  <Label htmlFor="income">Ingresos Mensuales (€)</Label>
                  <Input
                    id="income"
                    type="number"
                    step="0.01"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    placeholder="3000.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Datos Empresa */}
        {clientType === 'BUSINESS' && (
          <Card>
            <CardHeader>
              <CardTitle>Datos de la Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessName">Razón Social *</Label>
                <Input
                  id="businessName"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="businessTaxId">Identificación fiscal</Label>
                  <Input
                    id="businessTaxId"
                    value={businessTaxId}
                    onChange={(e) => setBusinessTaxId(e.target.value)}
                    placeholder="NIF, VAT, EIN o identificador local"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Opcional. Acepta identificadores fiscales internacionales.
                  </p>
                </div>

                <div>
                  <Label htmlFor="industry">Sector</Label>
                  <Input
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Construcción"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="legalRepName">Representante Legal *</Label>
                  <Input
                    id="legalRepName"
                    required
                    value={legalRepName}
                    onChange={(e) => setLegalRepName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="legalRepTaxId">Documento del representante</Label>
                  <Input
                    id="legalRepTaxId"
                    value={legalRepTaxId}
                    onChange={(e) => setLegalRepTaxId(e.target.value)}
                    placeholder="Documento de identidad o pasaporte"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Opcional. Puedes registrar un documento internacional.
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="employeeCount">Número de Empleados</Label>
                <Input
                  id="employeeCount"
                  type="number"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
                  placeholder="50"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Botones */}
        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
          <Link href={`/dashboard/clientes/${clientId}`}>
            <Button type="button" variant="outline" disabled={loading}>
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
