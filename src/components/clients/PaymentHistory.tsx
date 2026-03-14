'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/formatters/date'
import { formatCurrency } from '@/lib/formatters/currency'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { downloadPaymentReceipt } from '@/lib/utils/paymentReceiptDownload'

interface PaymentWithLoan {
  id: string
  amount: number
  paymentMethod: string
  paidAt: Date
  reference?: string | null
  notes?: string | null
  loan: {
    loanNumber: string
  }
  allocations: Array<{
    id: string
    type: string
    amount: number
  }>
}

interface PaymentHistoryProps {
  payments: PaymentWithLoan[]
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Efectivo',
  BANK_TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  CHECK: 'Cheque',
  OTHER: 'Otro',
}

const allocationTypeLabels: Record<string, string> = {
  PRINCIPAL: 'Capital',
  INTEREST: 'Interés',
  PENALTY: 'Mora',
  FEE: 'Comisión',
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleDownloadReceipt = async (paymentId: string) => {
    try {
      setDownloadingId(paymentId)
      await downloadPaymentReceipt(paymentId)
    } catch (error) {
      console.error('Error downloading receipt:', error)
      alert(error instanceof Error ? error.message : 'Error al descargar el recibo')
    } finally {
      setDownloadingId(null)
    }
  }

  if (payments.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No hay pagos registrados
      </div>
    )
  }

  // Calcular totales
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Pagado</p>
              <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Núm. de Pagos</p>
              <p className="text-2xl font-bold">{payments.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pago Promedio</p>
              <p className="text-2xl font-bold">
                {formatCurrency(payments.length > 0 ? totalPaid / payments.length : 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Último Pago</p>
              <p className="text-2xl font-bold">
                {payments.length > 0 ? formatDate(payments[0].paidAt) : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de pagos */}
      <div className="space-y-3">
        {payments.map(payment => (
          <Card key={payment.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-medium">
                      Pago #{payment.id.slice(0, 8)}
                    </p>
                    <Badge variant="outline">
                      {paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod}
                    </Badge>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Préstamo: {payment.loan.loanNumber}</p>
                    <p>Fecha: {formatDate(payment.paidAt)}</p>
                    {payment.reference && <p>Referencia: {payment.reference}</p>}
                    {payment.notes && <p className="italic">Notas: {payment.notes}</p>}
                  </div>

                  {/* Allocations breakdown */}
                  {payment.allocations && payment.allocations.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Distribución del pago:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {payment.allocations.map(allocation => (
                          <Badge key={allocation.id} variant="secondary" className="text-xs">
                            {allocationTypeLabels[allocation.type] || allocation.type}:{' '}
                            {formatCurrency(allocation.amount)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-right ml-4">
                  <p className="text-2xl font-bold">{formatCurrency(Number(payment.amount))}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => handleDownloadReceipt(payment.id)}
                    disabled={downloadingId === payment.id}
                  >
                    {downloadingId === payment.id ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-3 w-3" />
                        Descargar Recibo
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
