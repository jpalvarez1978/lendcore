import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'
import { formatCurrency } from '@/lib/formatters/currency'
import { prisma } from '@/lib/prisma'
import { PaymentsList } from '@/components/payments/PaymentsList'
import { ExportButton } from '@/components/export/ExportButton'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PagosPage() {
  const session = await auth()
  const canRegisterPayment =
    session?.user?.role ? hasPermission(session.user.role, 'PAYMENTS_REGISTER') : false
  const canExportPayments =
    session?.user?.role ? hasPermission(session.user.role, 'REPORTS_EXPORT') : false
  // Obtener pagos recientes
  const payments = await prisma.payment.findMany({
    take: 50,
    orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
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

  // Calcular total de pagos
  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const averagePayment = payments.length > 0 ? totalAmount / payments.length : 0
  const cashPayments = payments.filter(payment => payment.paymentMethod === 'CASH').length

  // Convertir payments para el componente cliente
  const serializedPayments = payments.map(payment => ({
    id: payment.id,
    amount: Number(payment.amount),
    paymentMethod: payment.paymentMethod,
    paidAt: payment.paidAt,
    reference: payment.reference,
    notes: payment.notes,
    loan: {
      loanNumber: payment.loan.loanNumber,
      client: {
        type: payment.loan.client.type,
        individualProfile: payment.loan.client.individualProfile ? {
          firstName: payment.loan.client.individualProfile.firstName,
          lastName: payment.loan.client.individualProfile.lastName,
        } : null,
        businessProfile: payment.loan.client.businessProfile ? {
          businessName: payment.loan.client.businessProfile.businessName,
        } : null,
      },
    },
    clientName:
      payment.loan.client.type === 'INDIVIDUAL'
        ? `${payment.loan.client.individualProfile?.firstName || ''} ${payment.loan.client.individualProfile?.lastName || ''}`.trim()
        : payment.loan.client.businessProfile?.businessName || 'Cliente',
    paymentMethodLabel:
      payment.paymentMethod === 'CASH'
        ? 'Efectivo'
        : payment.paymentMethod === 'BANK_TRANSFER'
          ? 'Transferencia'
          : payment.paymentMethod === 'CARD'
            ? 'Tarjeta'
            : payment.paymentMethod === 'CHECK'
              ? 'Cheque'
              : 'Otro',
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pagos</h1>
          <p className="text-muted-foreground">
            Historial y gestión de pagos recibidos
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          {canExportPayments && (
            <ExportButton
              data={serializedPayments}
              filename="pagos_recibidos"
              type="payments"
              variant="outline"
            />
          )}
          {canRegisterPayment && (
            <Link href="/dashboard/pagos/nuevo" className="w-full sm:w-auto">
              <Button className="w-full rounded-xl sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Registrar Pago
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[1.6rem] border-[#dce6f2] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(20,38,63,0.46)]">
          <CardHeader className="pb-3">
            <CardDescription>Total Pagos</CardDescription>
            <CardTitle className="text-[clamp(1.8rem,3vw,2.5rem)]">{payments.length}</CardTitle>
            <p className="text-xs text-muted-foreground">Últimos 50 registros operativos</p>
          </CardHeader>
        </Card>
        <Card className="rounded-[1.6rem] border-[#e8efe9] bg-[linear-gradient(180deg,#f5fbf7_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(31,94,55,0.35)]">
          <CardHeader className="pb-3">
            <CardDescription>Monto Total</CardDescription>
            <CardTitle className="text-[clamp(1.45rem,2.4vw,2rem)]">{formatCurrency(totalAmount)}</CardTitle>
            <p className="text-xs text-muted-foreground">Volumen visible del historial reciente</p>
          </CardHeader>
        </Card>
        <Card className="rounded-[1.6rem] border-[#f1e4cd] bg-[linear-gradient(180deg,#fff8ee_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(141,103,48,0.32)]">
          <CardHeader className="pb-3">
            <CardDescription>Promedio por Pago</CardDescription>
            <CardTitle className="text-[clamp(1.45rem,2.4vw,2rem)]">{formatCurrency(averagePayment)}</CardTitle>
            <p className="text-xs text-muted-foreground">Ticket medio del lote visible</p>
          </CardHeader>
        </Card>
        <Card className="rounded-[1.6rem] border-[#f3d8d6] bg-[linear-gradient(180deg,#fff8f8_0%,#ffffff_100%)] shadow-[0_18px_34px_-30px_rgba(166,53,43,0.28)]">
          <CardHeader className="pb-3">
            <CardDescription>Pagos en Efectivo</CardDescription>
            <CardTitle className="text-[clamp(1.8rem,3vw,2.5rem)]">{cashPayments}</CardTitle>
            <p className="text-xs text-muted-foreground">Para monitoreo de caja y conciliación</p>
          </CardHeader>
        </Card>
      </div>

      {/* Tabla de Pagos */}
      <Card className="rounded-[1.8rem] border-white/80 bg-white/88 shadow-[0_22px_44px_-34px_rgba(20,38,63,0.42)]">
        <CardHeader>
          <CardTitle>Historial de Pagos</CardTitle>
          <CardDescription>
            Mostrando los últimos {payments.length} pagos recibidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentsList payments={serializedPayments} />
        </CardContent>
      </Card>
    </div>
  )
}
