/**
 * PRÉSTAMO TIPO ALEMÁN
 *
 * Sistema de amortización donde:
 * - Cuotas de CAPITAL fijas
 * - Intereses decrecientes (calculados sobre saldo restante)
 * - Cuota total decreciente
 *
 * Ventajas:
 * - Menos interés total que sistema francés
 * - Deuda baja rápidamente
 *
 * Desventaja:
 * - Cuotas iniciales más altas
 *
 * Uso: Clientes con capacidad de pago alta al inicio
 */

import { PaymentFrequency } from '@prisma/client'
import { addMonths, addWeeks } from 'date-fns'

export interface GermanLoanTerms {
  principalAmount: number
  interestRate: number // Tasa MENSUAL
  termMonths: number
  paymentFrequency: PaymentFrequency
  firstDueDate: Date
}

export interface GermanInstallmentData {
  installmentNumber: number
  dueDate: Date
  principalAmount: number
  interestAmount: number
  totalAmount: number
  pendingAmount: number
  remainingPrincipal: number
}

/**
 * Calcular número de cuotas
 */
function calculateNumberOfInstallments(
  termMonths: number,
  frequency: PaymentFrequency
): number {
  switch (frequency) {
    case 'WEEKLY':
      return Math.ceil((termMonths * 30) / 7)
    case 'BIWEEKLY':
      return Math.ceil((termMonths * 30) / 14)
    case 'MONTHLY':
      return termMonths
    case 'QUARTERLY':
      return Math.ceil(termMonths / 3)
    default:
      return termMonths
  }
}

/**
 * Calcular fecha de próxima cuota
 */
function getNextDueDate(
  baseDate: Date,
  frequency: PaymentFrequency,
  installmentNumber: number
): Date {
  switch (frequency) {
    case 'WEEKLY':
      return addWeeks(baseDate, installmentNumber)
    case 'BIWEEKLY':
      return addWeeks(baseDate, installmentNumber * 2)
    case 'MONTHLY':
      return addMonths(baseDate, installmentNumber)
    case 'QUARTERLY':
      return addMonths(baseDate, installmentNumber * 3)
    default:
      return addMonths(baseDate, installmentNumber)
  }
}

/**
 * Generar cronograma de préstamo tipo ALEMÁN
 *
 * Ejemplo:
 * Principal: 1,000€
 * Tasa: 1% mensual
 * Plazo: 10 meses
 *
 * Capital fijo: 100€
 *
 * Cuota 1: Capital 100€ + Interés 10.00€ = 110.00€ (Saldo: 900€)
 * Cuota 2: Capital 100€ + Interés 9.00€ = 109.00€ (Saldo: 800€)
 * Cuota 3: Capital 100€ + Interés 8.00€ = 108.00€ (Saldo: 700€)
 * ...
 * Cuota 10: Capital 100€ + Interés 1.00€ = 101.00€ (Saldo: 0€)
 */
export function generateGermanSchedule(
  terms: GermanLoanTerms
): GermanInstallmentData[] {
  const {
    principalAmount,
    interestRate,
    termMonths,
    paymentFrequency,
    firstDueDate,
  } = terms

  const numberOfInstallments = calculateNumberOfInstallments(
    termMonths,
    paymentFrequency
  )

  // Capital fijo por cuota
  const fixedPrincipal = principalAmount / numberOfInstallments

  const installments: GermanInstallmentData[] = []
  let remainingPrincipal = principalAmount

  for (let i = 1; i <= numberOfInstallments; i++) {
    const dueDate = getNextDueDate(firstDueDate, paymentFrequency, i - 1)

    // Interés sobre saldo restante (esta es la clave del sistema alemán)
    const interestAmount = remainingPrincipal * interestRate

    // Capital es fijo (excepto última cuota por redondeo)
    const principalThisInstallment =
      i === numberOfInstallments ? remainingPrincipal : fixedPrincipal

    const totalAmount = principalThisInstallment + interestAmount

    installments.push({
      installmentNumber: i,
      dueDate,
      principalAmount: Number(principalThisInstallment.toFixed(2)),
      interestAmount: Number(interestAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      pendingAmount: Number(totalAmount.toFixed(2)),
      remainingPrincipal: Number(
        (remainingPrincipal - principalThisInstallment).toFixed(2)
      ),
    })

    remainingPrincipal -= principalThisInstallment
  }

  return installments
}

/**
 * Calcular resumen financiero del préstamo alemán
 */
export function calculateGermanSummary(terms: GermanLoanTerms) {
  const installments = generateGermanSchedule(terms)

  const totalInterest = installments.reduce(
    (sum, inst) => sum + inst.interestAmount,
    0
  )

  const totalToPay = terms.principalAmount + totalInterest

  return {
    installments,
    summary: {
      principalAmount: terms.principalAmount,
      totalInterest: Number(totalInterest.toFixed(2)),
      totalToPay: Number(totalToPay.toFixed(2)),
      numberOfInstallments: installments.length,
      fixedPrincipalAmount: installments[0]?.principalAmount || 0,
      firstInstallmentAmount: installments[0]?.totalAmount || 0,
      lastInstallmentAmount:
        installments[installments.length - 1]?.totalAmount || 0,

      // Ventaja del sistema alemán
      savingsVsFrench: 0, // Se calcula comparando con francés
    },
  }
}

/**
 * Validar términos del préstamo alemán
 */
export function validateGermanLoanTerms(
  terms: GermanLoanTerms
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (terms.principalAmount <= 0) {
    errors.push('El monto principal debe ser mayor a 0')
  }

  if (terms.interestRate < 0) {
    errors.push('La tasa de interés no puede ser negativa')
  }

  if (terms.termMonths <= 0) {
    errors.push('El plazo debe ser mayor a 0 meses')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
