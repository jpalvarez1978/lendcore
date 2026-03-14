import { ClientService } from '@/services/clientService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/formatters/currency'
import { formatDate } from '@/lib/formatters/date'
import { ArrowLeft, Edit, FileText, DollarSign, TrendingUp, Clock, Phone, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PaymentHistory } from '@/components/clients/PaymentHistory'
import { ActivityTimeline } from '@/components/clients/ActivityTimeline'
import { ClientNotes } from '@/components/clients/ClientNotes'
import { decryptSafe } from '@/lib/security/encryption'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [session, client] = await Promise.all([auth(), ClientService.getById(id)])

  if (!client) {
    notFound()
  }

  const canEditClient =
    session?.user?.role ? hasPermission(session.user.role, 'CLIENTS_EDIT') : false

  const metrics = await ClientService.getClientMetrics(id)
  const activities = await ClientService.getClientActivities(id)

  const name =
    client.type === 'INDIVIDUAL'
      ? `${client.individualProfile?.firstName} ${client.individualProfile?.lastName}`
      : client.businessProfile?.businessName

  const taxId =
    client.type === 'INDIVIDUAL'
      ? client.individualProfile?.taxId
      : client.businessProfile?.taxId

  // Desencriptar datos sensibles
  const decryptedTaxId = taxId ? decryptSafe(taxId) : ''
  const decryptedEmail = client.email ? decryptSafe(client.email) : ''
  const decryptedPhone = client.phone ? decryptSafe(client.phone) : ''
  const decryptedAddress = client.address ? decryptSafe(client.address) : ''

  // Extraer todos los pagos de todos los préstamos con referencia al préstamo
  const allPayments = client.loans.flatMap(loan =>
    (loan.payments || []).map(payment => ({
      ...payment,
      amount: Number(payment.amount),
      loan: {
        loanNumber: loan.loanNumber
      },
      allocations: (payment.allocations || []).map(alloc => ({
        id: alloc.id,
        type: alloc.type,
        amount: Number(alloc.amount)
      }))
    }))
  ).sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/clientes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{name}</h1>
            <p className="text-muted-foreground">{decryptedTaxId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEditClient && (
            <Link href={`/dashboard/clientes/${client.id}/editar`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Estado y Riesgo */}
      <div className="flex gap-2">
        <Badge variant="outline" className="text-sm">
          {client.type === 'INDIVIDUAL' ? 'Persona Física' : 'Empresa'}
        </Badge>
        <StatusBadge type="client" value={client.status} />
        <StatusBadge type="risk" value={client.riskLevel} />
      </div>

      {/* Métricas Clave */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Exposición Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalExposure)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cupo Disponible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.availableCredit)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Préstamos Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeLoans}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasa de Cumplimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.onTimePaymentRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs con información organizada */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">
            <FileText className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="prestamos">
            <DollarSign className="mr-2 h-4 w-4" />
            Préstamos
          </TabsTrigger>
          <TabsTrigger value="pagos">
            <TrendingUp className="mr-2 h-4 w-4" />
            Pagos
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Clock className="mr-2 h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="notas">
            <FileText className="mr-2 h-4 w-4" />
            Notas
          </TabsTrigger>
        </TabsList>

        {/* Tab General */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Contacto</h3>
                <div className="space-y-3 text-sm">
                  {decryptedEmail && <p>Email: {decryptedEmail}</p>}
                  <div>
                    <p className="mb-2">Teléfono: {decryptedPhone}</p>
                    <div className="flex gap-2">
                      <a href={`tel:${decryptedPhone}`}>
                        <Button size="sm" variant="outline">
                          <Phone className="h-3 w-3 mr-1" />
                          Llamar
                        </Button>
                      </a>
                      <a
                        href={`https://wa.me/${decryptedPhone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700">
                          <MessageCircle className="h-3 w-3 mr-1" />
                          WhatsApp
                        </Button>
                      </a>
                    </div>
                  </div>
                  {decryptedAddress && <p>Dirección: {decryptedAddress}</p>}
                  {client.city && client.postalCode && (
                    <p>
                      {client.city}, CP {client.postalCode}
                    </p>
                  )}
                </div>
              </div>

              {client.type === 'INDIVIDUAL' && client.individualProfile && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Datos Personales
                  </h3>
                  <div className="space-y-1 text-sm">
                    {client.individualProfile.dateOfBirth && (
                      <p>Fecha Nac: {formatDate(client.individualProfile.dateOfBirth)}</p>
                    )}
                    {client.individualProfile.occupation && (
                      <p>Ocupación: {client.individualProfile.occupation}</p>
                    )}
                    {client.individualProfile.income && (
                      <p>Ingresos: {formatCurrency(Number(client.individualProfile.income))}/mes</p>
                    )}
                  </div>
                </div>
              )}

              {client.type === 'BUSINESS' && client.businessProfile && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Datos de la Empresa
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p>Representante: {client.businessProfile.legalRepName}</p>
                    <p>DNI Rep: {client.businessProfile.legalRepTaxId}</p>
                    {client.businessProfile.industry && <p>Sector: {client.businessProfile.industry}</p>}
                    {client.businessProfile.employeeCount && (
                      <p>Empleados: {client.businessProfile.employeeCount}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historial de Cupo */}
          {client.creditLimitChanges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Historial de Cupo ({client.creditLimitChanges.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {client.creditLimitChanges.map(change => (
                    <div key={change.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{formatDate(change.approvedAt)}</p>
                        {change.reason && (
                          <p className="text-muted-foreground">{change.reason}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Por: {change.approver?.name || 'Sistema'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p>
                          {formatCurrency(Number(change.previousLimit))} →{' '}
                          {formatCurrency(Number(change.newLimit))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab Préstamos */}
        <TabsContent value="prestamos">
          <Card>
            <CardHeader>
              <CardTitle>Préstamos ({client.loans.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {client.loans.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Este cliente no tiene préstamos registrados
                </p>
              ) : (
                <div className="space-y-3">
                  {client.loans.map(loan => (
                    <div
                      key={loan.id}
                      className="flex items-center justify-between border-b pb-3 last:border-0"
                    >
                      <div>
                        <p className="font-medium">{loan.loanNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(loan.disbursementDate)} • {loan.termMonths} meses
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(Number(loan.outstandingPrincipal))}</p>
                        <p className="text-sm text-muted-foreground">
                          de {formatCurrency(Number(loan.principalAmount))}
                        </p>
                      </div>
                      <StatusBadge type="loan" value={loan.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Pagos */}
        <TabsContent value="pagos">
          <PaymentHistory payments={allPayments} />
        </TabsContent>

        {/* Tab Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Actividades</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline activities={activities} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Notas */}
        <TabsContent value="notas">
          <ClientNotes clientId={client.id} notes={client.notes || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
