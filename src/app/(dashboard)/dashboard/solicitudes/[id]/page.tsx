import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  FileText,
  History,
  UserRound,
  Wallet,
  XCircle,
} from 'lucide-react'
import { type AuditAction } from '@prisma/client'
import { auth } from '@/lib/auth'
import { ApplicationService } from '@/services/applicationService'
import { AuditService } from '@/services/auditService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatPercentage } from '@/lib/formatters/currency'
import { formatDate, formatDateTime } from '@/lib/formatters/date'
import { decryptSafe } from '@/lib/security/encryption'
import { hasPermission } from '@/lib/constants/permissions'
import { ApplicationWorkflowPanel } from '@/components/applications/ApplicationWorkflowPanel'

function getApplicationActionLabel(action: AuditAction, status?: string | null) {
  if (action === 'CREATE') return 'Solicitud creada'
  if (action === 'APPROVE') return 'Solicitud aprobada'
  if (action === 'REJECT') return 'Solicitud rechazada'
  if (action === 'DISBURSE') return 'Solicitud desembolsada'
  if (action === 'UPDATE_STATUS' && status === 'UNDER_REVIEW') return 'Enviada a revisión'
  if (action === 'UPDATE_STATUS') return 'Estado actualizado'
  return 'Movimiento registrado'
}

function getApplicationActionIcon(action: AuditAction, status?: string | null) {
  if (action === 'APPROVE' || action === 'DISBURSE') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
  }

  if (action === 'REJECT') {
    return <XCircle className="h-4 w-4 text-red-600" />
  }

  if (action === 'UPDATE_STATUS' && status === 'UNDER_REVIEW') {
    return <History className="h-4 w-4 text-amber-600" />
  }

  return <History className="h-4 w-4 text-slate-500" />
}

export default async function SolicitudDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [session, application, auditHistory] = await Promise.all([
    auth(),
    ApplicationService.getById(id),
    AuditService.getEntityHistory('credit_applications', id),
  ])

  if (!application) {
    notFound()
  }

  const clientName =
    application.client.type === 'INDIVIDUAL'
      ? `${application.client.individualProfile?.firstName || ''} ${application.client.individualProfile?.lastName || ''}`.trim()
      : application.client.businessProfile?.businessName || 'Cliente'

  const clientTaxId =
    application.client.type === 'INDIVIDUAL'
      ? application.client.individualProfile?.taxId
      : application.client.businessProfile?.taxId
  const decryptedClientTaxId = clientTaxId ? decryptSafe(clientTaxId) : ''

  const existingLoans = application.client.loans.filter(
    loan => loan.status === 'ACTIVE' || loan.status === 'DEFAULTED'
  )

  const canSubmit =
    session?.user?.role ? hasPermission(session.user.role, 'APPLICATIONS_CREATE') : false
  const canApprove =
    session?.user?.role ? hasPermission(session.user.role, 'APPLICATIONS_APPROVE') : false
  const canReject =
    session?.user?.role ? hasPermission(session.user.role, 'APPLICATIONS_REJECT') : false
  const createLoanHref =
    application.status === 'APPROVED'
      ? `/dashboard/prestamos/nuevo?applicationId=${application.id}`
      : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/solicitudes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Solicitud de Crédito</h1>
            <p className="text-muted-foreground">
              {clientName} · creada el {formatDate(application.createdAt)}
            </p>
          </div>
        </div>
        <StatusBadge type="application" value={application.status} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monto solicitado</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(Number(application.requestedAmount))}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Plazo</CardDescription>
            <CardTitle className="text-2xl">{application.termMonths} meses</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tasa propuesta</CardDescription>
            <CardTitle className="text-2xl">
              {formatPercentage(Number(application.proposedRate))}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Frecuencia</CardDescription>
            <CardTitle className="text-2xl">
              {application.paymentFrequency === 'MONTHLY' && 'Mensual'}
              {application.paymentFrequency === 'WEEKLY' && 'Semanal'}
              {application.paymentFrequency === 'BIWEEKLY' && 'Quincenal'}
              {application.paymentFrequency === 'QUARTERLY' && 'Trimestral'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Resumen de la solicitud</CardTitle>
            <CardDescription>Datos comerciales y contexto de evaluación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserRound className="h-4 w-4" />
                  Cliente
                </div>
                <div>
                  <p className="font-semibold text-foreground">{clientName}</p>
                  {decryptedClientTaxId && (
                    <p className="text-sm text-muted-foreground">{decryptedClientTaxId}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {application.client.type === 'INDIVIDUAL' ? 'Persona Física' : 'Empresa'}
                  </Badge>
                  <StatusBadge type="risk" value={application.client.riskLevel} />
                  <StatusBadge type="client" value={application.client.status} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Trazabilidad
                </div>
                <div className="space-y-1 text-sm">
                  <p>
                    Creada: <span className="font-medium">{formatDateTime(application.createdAt)}</span>
                  </p>
                  {application.submittedAt && (
                    <p>
                      Enviada a revisión:{' '}
                      <span className="font-medium">{formatDateTime(application.submittedAt)}</span>
                    </p>
                  )}
                  {application.reviewedAt && (
                    <p>
                      Revisada: <span className="font-medium">{formatDateTime(application.reviewedAt)}</span>
                    </p>
                  )}
                  {application.approver && (
                    <p>
                      Responsable: <span className="font-medium">{application.approver.name}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                Propósito y contexto
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                {application.purpose || 'No se registró contexto adicional para esta solicitud.'}
              </p>
            </div>

            {(application.approvalNotes || application.rejectionReason) && (
              <div className="grid gap-4 md:grid-cols-2">
                {application.approvalNotes && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm font-semibold text-emerald-800">Notas de aprobación</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-900">
                      {application.approvalNotes}
                    </p>
                  </div>
                )}
                {application.rejectionReason && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-semibold text-red-800">Motivo de rechazo</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-red-900">
                      {application.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <ApplicationWorkflowPanel
            applicationId={application.id}
            status={application.status}
            canSubmit={canSubmit}
            canApprove={canApprove}
            canReject={canReject}
            createLoanHref={createLoanHref}
          />

          <Card>
            <CardHeader>
              <CardTitle>Exposición del cliente</CardTitle>
              <CardDescription>Contexto financiero actual para esta evaluación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/60 p-4">
                <p className="text-sm text-muted-foreground">Cupo de crédito</p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatCurrency(Number(application.client.creditLimit))}
                </p>
              </div>

              <div className="rounded-xl border border-border/60 p-4">
                <p className="text-sm text-muted-foreground">Operaciones activas</p>
                <p className="mt-1 text-2xl font-semibold">{existingLoans.length}</p>
              </div>

              <div className="rounded-xl border border-border/60 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  Préstamos vigentes
                </div>
                {existingLoans.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tiene operaciones activas.</p>
                ) : (
                  <div className="space-y-3">
                    {existingLoans.map(loan => (
                      <div key={loan.id} className="rounded-lg border border-border/60 p-3">
                        <p className="font-medium">{loan.loanNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(Number(loan.principalAmount))} · {loan.termMonths} meses
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial del flujo</CardTitle>
              <CardDescription>Trazabilidad cronológica del expediente.</CardDescription>
            </CardHeader>
            <CardContent>
              {auditHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todavía no hay movimientos de auditoría registrados para esta solicitud.
                </p>
              ) : (
                <div className="space-y-3">
                  {auditHistory.map(entry => {
                    const newValue =
                      entry.newValue && typeof entry.newValue === 'object' && !Array.isArray(entry.newValue)
                        ? (entry.newValue as Record<string, unknown>)
                        : null
                    const newStatus = newValue ? String(newValue.status || '') : null
                    const linkedLoanId =
                      newValue && typeof newValue.loanId === 'string' ? newValue.loanId : null
                    const linkedLoanNumber =
                      newValue && typeof newValue.loanNumber === 'string' ? newValue.loanNumber : null

                    return (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-border/60 bg-muted/20 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">{getApplicationActionIcon(entry.action, newStatus)}</div>
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-semibold text-foreground">
                              {getApplicationActionLabel(entry.action, newStatus)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDateTime(entry.createdAt)}
                              {entry.user?.name ? ` · ${entry.user.name}` : ''}
                            </p>
                            {entry.action === 'APPROVE' && application.approvalNotes && (
                              <p className="text-sm leading-6 text-muted-foreground">
                                {application.approvalNotes}
                              </p>
                            )}
                            {entry.action === 'REJECT' && application.rejectionReason && (
                              <p className="text-sm leading-6 text-muted-foreground">
                                {application.rejectionReason}
                              </p>
                            )}
                            {entry.action === 'DISBURSE' && linkedLoanId && linkedLoanNumber && (
                              <p className="text-sm leading-6 text-muted-foreground">
                                Operación creada:{' '}
                                <Link
                                  href={`/dashboard/prestamos/${linkedLoanId}`}
                                  className="font-medium text-[#8d6730] transition-colors hover:text-[#a97b36]"
                                >
                                  {linkedLoanNumber}
                                </Link>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
