import { LoanService } from '@/services/loanService'
import { auth } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatPercentage } from '@/lib/formatters/currency'
import { formatDate } from '@/lib/formatters/date'
import { getInstallmentComponentBalances } from '@/lib/calculations/allocation'
import { hasPermission } from '@/lib/constants/permissions'
import { ArrowLeft, CreditCard, FileText, Calendar, TrendingUp, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [session, loan] = await Promise.all([auth(), LoanService.getById(id)])

  if (!loan) {
    notFound()
  }

  const clientName =
    loan.client.type === 'INDIVIDUAL'
      ? `${loan.client.individualProfile?.firstName} ${loan.client.individualProfile?.lastName}`
      : loan.client.businessProfile?.businessName

  const installmentBalances = loan.installments.map(installment =>
    getInstallmentComponentBalances(installment)
  )
  const totalPendingPrincipal = installmentBalances.reduce(
    (sum, balances) => sum + balances.pendingPrincipal,
    0
  )
  const totalPendingInterest = installmentBalances.reduce(
    (sum, balances) => sum + balances.pendingInterest + balances.pendingPenalty,
    0
  )
  const totalPending = totalPendingPrincipal + totalPendingInterest
  const canRegisterPayment =
    session?.user?.role ? hasPermission(session.user.role, 'PAYMENTS_REGISTER') : false
  const canEditLoan =
    session?.user?.role ? hasPermission(session.user.role, 'LOANS_EDIT') : false

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/prestamos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{loan.loanNumber}</h1>
            <p className="text-muted-foreground">Cliente: {clientName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {loan.status === 'ACTIVE' && (
            <>
              {canRegisterPayment && (
                <Link href={`/dashboard/pagos/nuevo?loanId=${loan.id}`}>
                  <Button>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Registrar Pago
                  </Button>
                </Link>
              )}
              {canEditLoan && (
                <Link href={`/dashboard/prestamos/${loan.id}/prorrogar`}>
                  <Button variant="outline">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Prorrogar Préstamo
                  </Button>
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* Estado */}
      <div className="flex gap-2">
        <StatusBadge type="loan" value={loan.status} />
        <Badge variant="outline">
          {loan.amortizationType === 'AMERICAN'
            ? 'Préstamo Americano'
            : loan.amortizationType === 'FRENCH'
              ? 'Préstamo Francés'
              : loan.amortizationType}
        </Badge>
      </div>

      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monto Prestado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Number(loan.principalAmount))}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Pendiente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPending)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Capital: {formatCurrency(totalPendingPrincipal)} + Interés: {formatCurrency(totalPendingInterest)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pagado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Number(loan.totalPaid))}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Interés Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Number(loan.totalInterest))}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">
            <FileText className="mr-2 h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="cronograma">
            <Calendar className="mr-2 h-4 w-4" />
            Cronograma
          </TabsTrigger>
          <TabsTrigger value="pagos">
            <TrendingUp className="mr-2 h-4 w-4" />
            Pagos
          </TabsTrigger>
        </TabsList>

        {/* Tab General */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información del Préstamo</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Términos Financieros
                </h3>
                <div className="space-y-1 text-sm">
                  <p>
                    Tasa de Interés: <span className="font-medium">{formatPercentage(Number(loan.interestRate))}</span>{' '}
                    {loan.interestType === 'PERCENTAGE_MONTHLY' && 'mensual'}
                    {loan.interestType === 'PERCENTAGE_ANNUAL' && 'anual'}
                  </p>
                  <p>
                    Plazo: <span className="font-medium">{loan.termMonths} meses</span>
                  </p>
                  <p>
                    Frecuencia de Pago:{' '}
                    <span className="font-medium">
                      {loan.paymentFrequency === 'MONTHLY' && 'Mensual'}
                      {loan.paymentFrequency === 'WEEKLY' && 'Semanal'}
                      {loan.paymentFrequency === 'BIWEEKLY' && 'Quincenal'}
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Fechas</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    Desembolso: <span className="font-medium">{formatDate(loan.disbursementDate)}</span>
                  </p>
                  <p>
                    Primer Vencimiento: <span className="font-medium">{formatDate(loan.firstDueDate)}</span>
                  </p>
                  {loan.finalDueDate && (
                    <p>
                      Último Vencimiento:{' '}
                      <span className="font-medium">{formatDate(loan.finalDueDate)}</span>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {loan.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{loan.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab Cronograma */}
        <TabsContent value="cronograma">
          <Card>
            <CardHeader>
              <CardTitle>Cronograma de Pagos</CardTitle>
              <CardDescription>
                {loan.installments.length} cuotas programadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-sm">
                      <th className="text-left p-2">Cuota</th>
                      <th className="text-left p-2">Fecha</th>
                      <th className="text-right p-2">Capital</th>
                      <th className="text-right p-2">Interés</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-right p-2">Pagado</th>
                      <th className="text-right p-2">Pendiente</th>
                      <th className="text-center p-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loan.installments.map((installment) => (
                      <tr key={installment.id} className="border-b text-sm">
                        <td className="p-2">{installment.installmentNumber}</td>
                        <td className="p-2">{formatDate(installment.dueDate)}</td>
                        <td className="text-right p-2">
                          {formatCurrency(Number(installment.principalAmount))}
                        </td>
                        <td className="text-right p-2 text-orange-600">
                          {formatCurrency(Number(installment.interestAmount))}
                        </td>
                        <td className="text-right p-2 font-medium">
                          {formatCurrency(Number(installment.totalAmount))}
                        </td>
                        <td className="text-right p-2 text-green-600">
                          {formatCurrency(Number(installment.paidAmount))}
                        </td>
                        <td className="text-right p-2 text-red-600">
                          {formatCurrency(Number(installment.pendingAmount))}
                        </td>
                        <td className="text-center p-2">
                          <StatusBadge type="installment" value={installment.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Pagos */}
        <TabsContent value="pagos">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos</CardTitle>
              <CardDescription>
                {loan.payments?.length || 0} pagos registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!loan.payments || loan.payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay pagos registrados para este préstamo
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-sm">
                        <th className="text-left p-2">Fecha</th>
                        <th className="text-left p-2">Método</th>
                        <th className="text-right p-2">Monto</th>
                        <th className="text-left p-2">Referencia</th>
                        <th className="text-left p-2">Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loan.payments.map((payment) => (
                        <tr key={payment.id} className="border-b text-sm">
                          <td className="p-2">{formatDate(payment.paidAt)}</td>
                          <td className="p-2">
                            <Badge variant="outline">
                              {payment.paymentMethod === 'CASH' && 'Efectivo'}
                              {payment.paymentMethod === 'BANK_TRANSFER' && 'Transferencia'}
                              {payment.paymentMethod === 'CARD' && 'Tarjeta'}
                              {payment.paymentMethod === 'CHECK' && 'Cheque'}
                              {payment.paymentMethod === 'OTHER' && 'Otro'}
                            </Badge>
                          </td>
                          <td className="text-right p-2 font-bold text-green-600">
                            {formatCurrency(Number(payment.amount))}
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {payment.reference || '-'}
                          </td>
                          <td className="p-2 text-muted-foreground text-xs">
                            {payment.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
