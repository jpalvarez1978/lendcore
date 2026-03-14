import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { BRAND } from '@/lib/constants/brand'

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    borderBottomStyle: 'solid',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 11,
    color: '#666',
  },
  section: {
    marginTop: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    marginBottom: 6,
    backgroundColor: '#f0f0f0',
    padding: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: '40%',
  },
  value: {
    width: '60%',
  },
  highlight: {
    backgroundColor: '#fffbcc',
    padding: 12,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#ffd700',
    borderStyle: 'solid',
  },
  highlightAmount: {
    fontSize: 18,
    color: '#006400',
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#333',
    color: 'white',
    padding: 6,
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    borderBottomStyle: 'solid',
    padding: 6,
    fontSize: 9,
  },
  col1: { width: '10%' },
  col2: { width: '25%' },
  col3: { width: '25%' },
  col4: { width: '20%' },
  col5: { width: '20%' },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#666',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    borderTopStyle: 'solid',
    paddingTop: 8,
  },
})

interface PaymentReceiptProps {
  payment: {
    id: string
    amount: number
    paymentMethod: string
    paidAt: string
    reference?: string | null
    notes?: string | null
    allocations: Array<{ type: string; amount: number }>
  }
  loan: {
    loanNumber: string
    principalAmount: number
    interestRate: number
    termMonths: number
    disbursementDate: string
  }
  client: {
    name: string
    taxId: string
    phone: string
    email?: string
    address?: string
  }
  installment: {
    installmentNumber: number
    totalAmount: number
  }
  pendingInstallments: Array<{
    installmentNumber: number
    dueDate: string
    totalAmount: number
    pendingAmount: number
  }>
  totalPending: number
}

const formatCurrency = (amount: number) => `${amount.toFixed(2)}€`
const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

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

export const PaymentReceipt: React.FC<PaymentReceiptProps> = ({
  payment,
  loan,
  client,
  installment,
  pendingInstallments,
  totalPending,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>RECIBO DE PAGO</Text>
        <Text style={styles.subtitle}>Comprobante de pago de préstamo</Text>
      </View>

      {/* Payment Highlight */}
      <View style={styles.highlight}>
        <Text style={{ fontSize: 11, marginBottom: 4 }}>
          Pago Registrado:
        </Text>
        <Text style={styles.highlightAmount}>{formatCurrency(payment.amount)}</Text>
        <Text style={{ marginTop: 4 }}>
          Cuota {installment.installmentNumber} de {loan.termMonths}
        </Text>
      </View>

      {/* Client Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DATOS DEL CLIENTE</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nombre:</Text>
          <Text style={styles.value}>{client.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>DNI/CIF:</Text>
          <Text style={styles.value}>{client.taxId}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Teléfono:</Text>
          <Text style={styles.value}>{client.phone}</Text>
        </View>
        {client.email && (
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{client.email}</Text>
          </View>
        )}
      </View>

      {/* Loan Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DATOS DEL PRÉSTAMO</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Número:</Text>
          <Text style={styles.value}>{loan.loanNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Monto Original:</Text>
          <Text style={styles.value}>{formatCurrency(loan.principalAmount)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tasa:</Text>
          <Text style={styles.value}>{loan.interestRate}% mensual</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Plazo:</Text>
          <Text style={styles.value}>{loan.termMonths} meses</Text>
        </View>
      </View>

      {/* Payment Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DETALLES DEL PAGO</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Cuota:</Text>
          <Text style={styles.value}>
            {installment.installmentNumber} de {loan.termMonths}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Monto:</Text>
          <Text style={styles.value}>{formatCurrency(payment.amount)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Forma de Pago:</Text>
          <Text style={styles.value}>
            {paymentMethodLabels[payment.paymentMethod] || payment.paymentMethod}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Fecha y Hora:</Text>
          <Text style={styles.value}>
            {new Date(payment.paidAt).toLocaleString('es-ES')}
          </Text>
        </View>
        {payment.reference && (
          <View style={styles.row}>
            <Text style={styles.label}>Referencia:</Text>
            <Text style={styles.value}>{payment.reference}</Text>
          </View>
        )}
      </View>

      {/* Distribution */}
      {payment.allocations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DISTRIBUCIÓN</Text>
          {payment.allocations.map((alloc, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.label}>
                {allocationTypeLabels[alloc.type] || alloc.type}:
              </Text>
              <Text style={styles.value}>{formatCurrency(alloc.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Pending */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          SALDO PENDIENTE: {formatCurrency(totalPending)}
        </Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>#</Text>
            <Text style={styles.col2}>Vencimiento</Text>
            <Text style={styles.col3}>Valor</Text>
            <Text style={styles.col4}>Pendiente</Text>
            <Text style={styles.col5}>Estado</Text>
          </View>
          {pendingInstallments.slice(0, 8).map((inst) => (
            <View key={inst.installmentNumber} style={styles.tableRow}>
              <Text style={styles.col1}>{inst.installmentNumber}</Text>
              <Text style={styles.col2}>{formatDate(inst.dueDate)}</Text>
              <Text style={styles.col3}>{formatCurrency(inst.totalAmount)}</Text>
              <Text style={styles.col4}>{formatCurrency(inst.pendingAmount)}</Text>
              <Text style={styles.col5}>Pendiente</Text>
            </View>
          ))}
          {pendingInstallments.length > 8 && (
            <Text style={{ marginTop: 4, fontSize: 8, fontStyle: 'italic' }}>
              ... y {pendingInstallments.length - 8} cuotas más
            </Text>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text>Recibo generado automáticamente por {BRAND.name}</Text>
        <Text>Fecha: {new Date().toLocaleString('es-ES')}</Text>
        <Text>ID: {payment.id}</Text>
      </View>
    </Page>
  </Document>
)
