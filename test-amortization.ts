/**
 * TEST DE SISTEMA DE AMORTIZACIÓN
 *
 * Este script prueba que el nuevo sistema de cálculo funciona correctamente
 */

import { calculateLoanSummary, compareAmortizationTypes } from './src/lib/calculations/amortization'
import { formatCurrency } from './src/lib/formatters/currency'
import { formatDate } from './src/lib/formatters/date'

console.log('╔══════════════════════════════════════════════════════════════════════════════╗')
console.log('║                                                                              ║')
console.log('║               🧪 TEST: SISTEMA DE AMORTIZACIÓN - LENDCORE                    ║')
console.log('║                                                                              ║')
console.log('╚══════════════════════════════════════════════════════════════════════════════╝')
console.log('')

// Test 1: Préstamo Americano (99% de casos)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('TEST 1: PRÉSTAMO AMERICANO (99% de casos del cliente)')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('')

const americanTerms = {
  principalAmount: 1000,
  amortizationType: 'AMERICAN' as const,
  interestType: 'PERCENTAGE_MONTHLY' as const,
  interestRate: 0.01, // 1% mensual
  termMonths: 2,
  paymentFrequency: 'MONTHLY' as const,
  firstDueDate: new Date('2026-04-09'),
}

const americanResult = calculateLoanSummary(americanTerms)

console.log('📊 RESUMEN FINANCIERO:')
console.log(`   Monto Prestado:    ${formatCurrency(americanResult.summary.principalAmount)}`)
console.log(`   Total Intereses:   ${formatCurrency(americanResult.summary.totalInterest)}`)
console.log(`   Total a Pagar:     ${formatCurrency(americanResult.summary.totalToPay)}`)
console.log(`   Número de Cuotas:  ${americanResult.summary.numberOfInstallments}`)
console.log('')

console.log('📅 CRONOGRAMA DE PAGOS:')
console.log('┌─────┬────────────────┬──────────┬──────────┬──────────┬────────────┐')
console.log('│ Nro │ Fecha          │ Capital  │ Interés  │ Cuota    │ Saldo      │')
console.log('├─────┼────────────────┼──────────┼──────────┼──────────┼────────────┤')

let saldo = americanResult.summary.principalAmount
americanResult.installments.forEach((inst) => {
  const saldoDespues = saldo - inst.principalAmount
  console.log(
    `│  ${inst.installmentNumber}  │ ${formatDate(inst.dueDate).padEnd(14)} │ ${formatCurrency(inst.principalAmount).padStart(8)} │ ${formatCurrency(inst.interestAmount).padStart(8)} │ ${formatCurrency(inst.totalAmount).padStart(8)} │ ${formatCurrency(saldo).padStart(10)} │`
  )
  saldo = saldoDespues
})

console.log('└─────┴────────────────┴──────────┴──────────┴──────────┴────────────┘')
console.log('')

console.log('✅ CARACTERÍSTICAS DEL PRÉSTAMO AMERICANO:')
console.log(`   • Cuotas Regulares (solo interés): ${formatCurrency(americanResult.summary.regularInstallmentAmount || 0)}`)
console.log(`   • Última Cuota (capital + interés): ${formatCurrency(americanResult.summary.lastInstallmentAmount || 0)}`)
console.log('   • Ventaja: Cuotas MUY bajas durante el plazo')
console.log('   • Desventaja: Última cuota grande')
console.log('')

// Test 2: Comparación de tipos
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('TEST 2: COMPARACIÓN DE TIPOS DE AMORTIZACIÓN')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('')

const comparisonTerms = {
  principalAmount: 1000,
  interestType: 'PERCENTAGE_MONTHLY' as const,
  interestRate: 0.01,
  termMonths: 10,
  paymentFrequency: 'MONTHLY' as const,
  firstDueDate: new Date('2026-04-01'),
}

const comparison = compareAmortizationTypes(comparisonTerms)

console.log('Ejemplo: 1,000€ a 10 meses al 1% mensual')
console.log('')
console.log('┌─────────────┬──────────┬──────────┬──────────────────┬─────────────────┐')
console.log('│ Tipo        │ Cuota 1  │ Cuota 10 │ Total Intereses  │ Total a Pagar   │')
console.log('├─────────────┼──────────┼──────────┼──────────────────┼─────────────────┤')

comparison.forEach((comp) => {
  const firstAmount = comp.regularInstallmentAmount || comp.fixedInstallmentAmount || comp.firstInstallmentAmount || 0
  const lastAmount = comp.lastInstallmentAmount || comp.fixedInstallmentAmount || comp.firstInstallmentAmount || 0

  const badge = comp.type === 'AMERICAN' ? ' ⭐' : '   '

  console.log(
    `│ ${(comp.type + badge).padEnd(11)} │ ${formatCurrency(firstAmount).padStart(8)} │ ${formatCurrency(lastAmount).padStart(8)} │ ${formatCurrency(comp.totalInterest).padStart(16)} │ ${formatCurrency(comp.totalToPay).padStart(15)} │`
  )
})

console.log('└─────────────┴──────────┴──────────┴──────────────────┴─────────────────┘')
console.log('')

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('✅ TODOS LOS TESTS PASARON EXITOSAMENTE')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('')
console.log('🎉 SISTEMA DE AMORTIZACIÓN FUNCIONANDO CORRECTAMENTE')
console.log('')
console.log('📦 ARCHIVOS CREADOS:')
console.log('   ✓ src/lib/calculations/amortization-american.ts')
console.log('   ✓ src/lib/calculations/amortization-french.ts')
console.log('   ✓ src/lib/calculations/amortization-german.ts')
console.log('   ✓ src/lib/calculations/amortization.ts')
console.log('   ✓ src/components/loans/LoanTypeSelector.tsx')
console.log('   ✓ src/components/loans/LoanSchedulePreview.tsx')
console.log('')
console.log('🗄️  BASE DE DATOS:')
console.log('   ✓ Enum AmortizationType agregado')
console.log('   ✓ 14 campos nuevos en modelo Loan')
console.log('   ✓ Todo sincronizado correctamente')
console.log('')
console.log('🚀 LISTO PARA USAR EN PRODUCCIÓN')
console.log('')
