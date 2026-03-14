import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Plus, Eye, CheckCircle, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/formatters/currency'
import { formatDate } from '@/lib/formatters/date'
import { prisma } from '@/lib/prisma'
import { EmptyState } from '@/components/shared/EmptyState'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'

export default async function SolicitudesPage() {
  const session = await auth()
  const canCreateApplication =
    session?.user?.role ? hasPermission(session.user.role, 'APPLICATIONS_CREATE') : false

  // Obtener todas las solicitudes
  const applications = await prisma.creditApplication.findMany({
    include: {
      client: {
        include: {
          individualProfile: true,
          businessProfile: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Calcular métricas
  const pending = applications.filter(
    app => app.status === 'DRAFT' || app.status === 'UNDER_REVIEW'
  ).length
  const approved = applications.filter(app => app.status === 'APPROVED').length
  const rejected = applications.filter(app => app.status === 'REJECTED').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Solicitudes de Crédito</h1>
          <p className="text-muted-foreground">
            Gestión de solicitudes de préstamos
          </p>
        </div>
        {canCreateApplication && (
          <Link href="/dashboard/solicitudes/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Solicitud
            </Button>
          </Link>
        )}
      </div>

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Solicitudes</CardDescription>
            <CardTitle className="text-3xl">{applications.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pendientes de gestión
            </CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Aprobadas
            </CardDescription>
            <CardTitle className="text-3xl text-green-600">{approved}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Rechazadas
            </CardDescription>
            <CardTitle className="text-3xl text-red-600">{rejected}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Lista de Solicitudes */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Solicitudes</CardTitle>
          <CardDescription>Mostrando {applications.length} solicitudes</CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="No hay solicitudes registradas"
              description="Las solicitudes de crédito aparecerán aquí"
              actionLabel={canCreateApplication ? 'Nueva Solicitud' : undefined}
              actionHref={canCreateApplication ? '/dashboard/solicitudes/nuevo' : undefined}
            />
          ) : (
            <div className="space-y-4">
              {applications.map(application => {
                const clientName =
                  application.client.type === 'INDIVIDUAL'
                    ? `${application.client.individualProfile?.firstName} ${application.client.individualProfile?.lastName}`
                    : application.client.businessProfile?.businessName

                return (
                  <div
                    key={application.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{clientName}</h3>
                        <StatusBadge type="application" value={application.status} />
                      </div>
                      <div className="flex gap-6 text-sm">
                        <span>
                          <span className="text-muted-foreground">Monto solicitado:</span>{' '}
                          <span className="font-medium">
                            {formatCurrency(Number(application.requestedAmount))}
                          </span>
                        </span>
                        <span>
                          <span className="text-muted-foreground">Plazo:</span>{' '}
                          <span className="font-medium">{application.termMonths} meses</span>
                        </span>
                        <span>
                          <span className="text-muted-foreground">Fecha:</span>{' '}
                          <span className="font-medium">{formatDate(application.createdAt)}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/solicitudes/${application.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalle
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
