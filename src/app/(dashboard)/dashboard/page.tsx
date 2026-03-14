import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  DollarSign,
  Layers3,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import { StatCard } from '@/components/shared/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GlowingEffect } from '@/components/ui/glowing-effect'
import { auth } from '@/lib/auth'
import { BRAND } from '@/lib/constants/brand'
import { hasPermission } from '@/lib/constants/permissions'
import { formatCurrency, formatNumber } from '@/lib/formatters/currency'
import { prisma } from '@/lib/prisma'
import { getOverdueInstallmentWhere, getUpcomingInstallmentWhere } from '@/lib/utils/installmentStatus'

export const dynamic = 'force-dynamic'

export default async function DashboardHomePage() {
  const [session, totalClients, activeLoans, totalExposure, recentPayments, pendingApplications] =
    await Promise.all([
      auth(),
      prisma.client.count({ where: { status: 'ACTIVE' } }),
      prisma.loan.count({ where: { status: 'ACTIVE' } }),
      prisma.loan.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { outstandingPrincipal: true },
      }),
      prisma.payment.findMany({
        take: 5,
        orderBy: [{ createdAt: 'desc' }, { paidAt: 'desc' }],
        include: {
          loan: {
            include: {
              client: {
                include: {
                  individualProfile: true,
                  businessProfile: true,
                },
              },
            },
          },
        },
      }),
      prisma.creditApplication.count({
        where: {
          status: {
            in: ['DRAFT', 'UNDER_REVIEW'],
          },
        },
      }),
    ])

  const overdueLoans = await prisma.loan.count({
    where: {
      status: { in: ['ACTIVE', 'DEFAULTED'] },
      installments: {
        some: getOverdueInstallmentWhere(),
      },
    },
  })

  const exposureAmount = Number(totalExposure._sum.outstandingPrincipal || 0)
  const exposureAmountLabel = formatNumber(exposureAmount)
  const userRole = session?.user?.role
  const canCreateClient = userRole ? hasPermission(userRole, 'CLIENTS_CREATE') : false
  const canCreateLoan = userRole ? hasPermission(userRole, 'LOANS_CREATE') : false
  const canViewReports = userRole ? hasPermission(userRole, 'REPORTS_VIEW') : false
  const canViewApplications = userRole ? hasPermission(userRole, 'APPLICATIONS_VIEW') : false
  const canViewCollection = userRole ? hasPermission(userRole, 'COLLECTION_VIEW') : false

  const upcomingInstallments = await prisma.installment.findMany({
    where: getUpcomingInstallmentWhere({
      referenceDate: new Date(),
      daysAhead: 7,
    }),
    take: 5,
    orderBy: { dueDate: 'asc' },
    include: {
      loan: {
        include: {
          client: {
            include: {
              individualProfile: true,
              businessProfile: true,
            },
          },
        },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="relative rounded-[2rem]">
          <GlowingEffect
            blur={4}
            spread={34}
            proximity={96}
            inactiveZone={0.22}
            borderWidth={2}
            glow
            disabled={false}
            className="rounded-[2rem]"
          />
          <Card className="brand-shell relative rounded-[2rem] border-0">
            <CardContent className="p-6 sm:p-8">
              <div className="space-y-7">
                <div className="inline-flex items-center rounded-full border border-[#e3d2b0] bg-[#f8efe0] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.32em] text-[#8d6730]">
                  {BRAND.dashboardEyebrow}
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <BrandMark variant="compact" />
                    <div className="space-y-3">
                      <h1 className="max-w-3xl text-3xl font-semibold leading-[1.02] text-[#14263f] sm:text-4xl 2xl:text-[3.15rem]">
                        Pulso diario de la operación y la cartera.
                      </h1>
                      <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                        Una vista ejecutiva para priorizar originación, seguimiento de préstamos,
                        pagos, vencimientos y cobranza sin perder claridad.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-[1.75rem] border border-white/80 bg-white/88 p-5 shadow-[0_24px_48px_-34px_rgba(20,38,63,0.48)] md:min-h-[220px]">
                      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8d6730]">
                        Clientes activos
                      </p>
                      <p className="mt-5 text-[clamp(2.5rem,3.5vw,3.15rem)] font-bold leading-[0.94] tracking-[-0.04em] text-[#14263f]">
                        {totalClients}
                      </p>
                      <p className="mt-3 max-w-[18ch] text-sm leading-6 text-muted-foreground">
                        Base vigente para operar hoy.
                      </p>
                    </div>
                    <div className="rounded-[1.75rem] border border-white/80 bg-white/88 p-5 shadow-[0_24px_48px_-34px_rgba(20,38,63,0.48)] md:min-h-[220px]">
                      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8d6730]">
                        Exposición activa
                      </p>
                      <div className="mt-5 flex items-baseline gap-2">
                        <span className="text-[clamp(2rem,2.9vw,2.65rem)] font-bold leading-[0.94] tracking-[-0.025em] text-[#14263f]">
                          {exposureAmountLabel}
                        </span>
                        <span className="shrink-0 text-[clamp(1rem,1.25vw,1.35rem)] font-semibold leading-none text-[#14263f]/82">
                          €
                        </span>
                      </div>
                      <p className="mt-3 max-w-[18ch] text-sm leading-6 text-muted-foreground">
                        Capital vivo pendiente de cobro.
                      </p>
                    </div>
                    <div className="rounded-[1.75rem] border border-white/80 bg-white/88 p-5 shadow-[0_24px_48px_-34px_rgba(20,38,63,0.48)] md:min-h-[220px]">
                      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#8d6730]">
                        En seguimiento
                      </p>
                      <p className="mt-5 text-[clamp(2.5rem,3.5vw,3.15rem)] font-bold leading-[0.94] tracking-[-0.04em] text-[#14263f]">
                        {overdueLoans + pendingApplications}
                      </p>
                      <p className="mt-3 max-w-[19ch] text-sm leading-6 text-muted-foreground">
                        Casos que requieren acción del equipo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative rounded-[2rem]">
          <GlowingEffect
            blur={4}
            spread={30}
            proximity={88}
            inactiveZone={0.22}
            borderWidth={2}
            glow
            disabled={false}
            className="rounded-[2rem]"
          />
          <Card className="brand-panel relative rounded-[2rem] border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#14263f_0%,#1f3a5c_100%)] text-[#f1e0b8] shadow-[0_18px_28px_-18px_rgba(20,38,63,0.9)]">
                  <Layers3 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-[#14263f]">Acciones rápidas</CardTitle>
                  <CardDescription>Lo más importante para mover hoy.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.5rem] border border-[#e4ebf2] bg-white/85 p-4">
                <p className="text-sm font-semibold text-[#14263f]">Solicitudes por gestionar</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#14263f]">
                  {pendingApplications}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Coordina aprobaciones y evita que la originación se estanque.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-[#e4ebf2] bg-white/85 p-4">
                <p className="text-sm font-semibold text-[#14263f]">Préstamos con mora</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#c94e4e]">
                  {overdueLoans}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Prioriza contacto y gestión de cobro sobre las operaciones vencidas.
                </p>
              </div>
              {(canCreateClient || canCreateLoan) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {canCreateClient && (
                    <Link href="/dashboard/clientes/nuevo">
                      <Button
                        variant="outline"
                        className="h-12 w-full rounded-2xl border-[#d6dee7] bg-white/80 text-[#14263f] hover:bg-white"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Nuevo cliente
                      </Button>
                    </Link>
                  )}
                  {canCreateLoan && (
                    <Link href="/dashboard/prestamos/nuevo">
                      <Button className="h-12 w-full rounded-2xl bg-[linear-gradient(135deg,#14263f_0%,#1f3a5c_72%,#a97b36_100%)] text-white shadow-[0_18px_36px_-18px_rgba(20,38,63,0.7)]">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo préstamo
                      </Button>
                    </Link>
                  )}
                </div>
              )}
              {canViewReports && (
                <Link
                  href="/dashboard/reportes"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#8d6730] transition-colors hover:text-[#a97b36]"
                >
                  Ver reportes estratégicos
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Clientes Activos"
          value={totalClients}
          description="Base de clientes registrados"
          icon={Users}
          variant="primary"
        />

        <StatCard
          title="Préstamos Activos"
          value={activeLoans}
          description="Operaciones en curso"
          icon={DollarSign}
          variant="default"
        />

        <StatCard
          title="Exposición Total"
          value={formatCurrency(exposureAmount)}
          description="Capital pendiente de cobro"
          icon={TrendingUp}
          variant="success"
        />

        <StatCard
          title="Préstamos Vencidos"
          value={overdueLoans}
          description="Requieren atención inmediata"
          icon={AlertCircle}
          variant={overdueLoans > 0 ? 'danger' : 'default'}
        />
      </div>

      {(pendingApplications > 0 || overdueLoans > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {pendingApplications > 0 && canViewApplications && (
            <Card className="rounded-[1.8rem] border-[#f0dfbc] bg-[linear-gradient(180deg,rgba(255,244,225,0.96),rgba(255,255,255,0.92))] shadow-[0_22px_44px_-34px_rgba(196,136,44,0.34)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <Clock className="h-5 w-5" aria-hidden="true" />
                  Solicitudes Pendientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-yellow-900/80">
                  Tienes <span className="font-bold text-yellow-900">{pendingApplications}</span>{' '}
                  solicitudes de crédito pendientes de revisión
                </p>
                <Link href="/dashboard/solicitudes">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-2xl border-yellow-600 text-yellow-700 hover:bg-yellow-100"
                  >
                    Ver solicitudes
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {overdueLoans > 0 && canViewCollection && (
            <Card className="rounded-[1.8rem] border-red-500/25 bg-[linear-gradient(180deg,rgba(255,240,240,0.96),rgba(255,255,255,0.92))] shadow-[0_22px_44px_-34px_rgba(201,78,78,0.28)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-5 w-5" aria-hidden="true" />
                  Préstamos Vencidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-red-900/80">
                  <span className="font-bold text-red-900">{overdueLoans}</span> préstamos
                  requieren gestión de cobranza
                </p>
                <Link href="/dashboard/cobranza">
                  <Button variant="destructive" size="sm" className="rounded-2xl shadow-sm">
                    Ir a cobranza
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-[1.8rem] border-white/80 bg-white/88 shadow-[0_22px_44px_-34px_rgba(20,38,63,0.42)]">
          <CardHeader className="border-b border-border/70 bg-[linear-gradient(180deg,rgba(247,242,232,0.88),rgba(255,255,255,0.72))]">
            <CardTitle className="text-primary">Pagos Recientes</CardTitle>
            <CardDescription>Últimos pagos registrados</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {recentPayments.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No hay pagos registrados aún</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map(payment => {
                  const clientName =
                    payment.loan.client.type === 'INDIVIDUAL'
                      ? `${payment.loan.client.individualProfile?.firstName} ${payment.loan.client.individualProfile?.lastName}`
                      : payment.loan.client.businessProfile?.businessName

                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-2xl border-b p-2 pb-3 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-green-500 p-2 shadow-sm">
                          <CheckCircle className="h-4 w-4 text-white" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{clientName}</p>
                          <p className="text-xs text-muted-foreground">{payment.loan.loanNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          {formatCurrency(Number(payment.amount))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.paidAt).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.8rem] border-white/80 bg-white/88 shadow-[0_22px_44px_-34px_rgba(20,38,63,0.42)]">
          <CardHeader className="border-b border-border/70 bg-[linear-gradient(180deg,rgba(247,242,232,0.88),rgba(255,255,255,0.72))]">
            <CardTitle className="text-primary">Próximos Vencimientos</CardTitle>
            <CardDescription>Cuotas que vencen en los próximos 7 días</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {upcomingInstallments.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No hay vencimientos próximos</p>
            ) : (
              <div className="space-y-3">
                {upcomingInstallments.map(installment => {
                  const clientName =
                    installment.loan.client.type === 'INDIVIDUAL'
                      ? `${installment.loan.client.individualProfile?.firstName} ${installment.loan.client.individualProfile?.lastName}`
                      : installment.loan.client.businessProfile?.businessName

                  const daysUntilDue = Math.ceil(
                    (new Date(installment.dueDate).getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  )

                  return (
                    <div
                      key={installment.id}
                      className="flex items-center justify-between rounded-2xl border-b p-2 pb-3 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-primary p-2 shadow-sm">
                          <Clock className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{clientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {installment.loan.loanNumber} - Cuota #{installment.installmentNumber}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(Number(installment.totalAmount))}
                        </p>
                        <Badge
                          variant={daysUntilDue <= 2 ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {daysUntilDue === 0
                            ? 'Hoy'
                            : daysUntilDue === 1
                              ? 'Mañana'
                              : `${daysUntilDue} días`}
                        </Badge>
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
  )
}
