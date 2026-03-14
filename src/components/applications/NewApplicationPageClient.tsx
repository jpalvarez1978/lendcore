'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ClientCombobox } from '@/components/ui/client-combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'

type PaymentFrequencyValue = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY'

interface ClientOption {
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

interface ClientsResponse {
  data?: ClientOption[]
}

interface CreateApplicationResponse {
  id?: string
  error?: string
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json()
  return data as T
}

export default function NewApplicationPageClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingClients, setLoadingClients] = useState(true)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [error, setError] = useState('')

  const [clientId, setClientId] = useState('')
  const [requestedAmount, setRequestedAmount] = useState('')
  const [termMonths, setTermMonths] = useState('12')
  const [proposedRate, setProposedRate] = useState('3')
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequencyValue>('MONTHLY')
  const [purpose, setPurpose] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function loadClients() {
      try {
        const response = await fetch('/api/clients?pageSize=500')
        if (response.ok) {
          const result = await parseResponse<ClientsResponse>(response)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const fullPurpose = [purpose.trim(), notes.trim()].filter(Boolean).join('\n\n')

      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          requestedAmount: parseFloat(requestedAmount),
          termMonths: parseInt(termMonths, 10),
          proposedRate: parseFloat(proposedRate) / 100,
          paymentFrequency,
          purpose: fullPurpose || null,
        }),
      })

      const result = await parseResponse<CreateApplicationResponse>(response)

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear solicitud')
      }

      router.push('/dashboard/solicitudes')
      router.refresh()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error al crear solicitud'))
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/solicitudes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nueva Solicitud de Crédito</h1>
          <p className="text-muted-foreground">
            Registrar una nueva solicitud de préstamo
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Datos de la Solicitud</CardTitle>
          <CardDescription>
            Completa la información de la solicitud de crédito
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="clientId">Cliente *</Label>
              <ClientCombobox
                clients={clients}
                value={clientId}
                onValueChange={setClientId}
                disabled={loadingClients}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="requestedAmount">Monto Solicitado (€) *</Label>
                <Input
                  id="requestedAmount"
                  type="number"
                  step="0.01"
                  required
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(e.target.value)}
                  placeholder="5000.00"
                />
              </div>

              <div>
                <Label htmlFor="termMonths">Plazo Solicitado (meses) *</Label>
                <Input
                  id="termMonths"
                  type="number"
                  required
                  min="1"
                  max="120"
                  value={termMonths}
                  onChange={(e) => setTermMonths(e.target.value)}
                  placeholder="12"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="proposedRate">Tasa Propuesta Mensual (%) *</Label>
                <Input
                  id="proposedRate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  required
                  value={proposedRate}
                  onChange={(e) => setProposedRate(e.target.value)}
                  placeholder="3.0"
                />
              </div>

              <div>
                <Label>Frecuencia de Pago *</Label>
                <Select
                  value={paymentFrequency}
                  onValueChange={(value) => setPaymentFrequency(value as PaymentFrequencyValue)}
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
              <Label htmlFor="purpose">Propósito del Préstamo *</Label>
              <Input
                id="purpose"
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Capital de trabajo, expansión, etc."
              />
            </div>

            <div>
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Información adicional sobre la solicitud..."
                rows={4}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading || !clientId}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Crear Solicitud
                  </>
                )}
              </Button>
              <Link href="/dashboard/solicitudes">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">ℹ️ Información</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900">
          <ul className="list-disc list-inside space-y-1">
            <li>La solicitud se registrará con monto, plazo, tasa propuesta y frecuencia</li>
            <li>El propósito y las notas se guardarán juntos en el contexto de la solicitud</li>
            <li>Tras crearla volverás al listado para continuar el seguimiento</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
