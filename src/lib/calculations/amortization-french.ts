/**
 * PRÉSTAMO TIPO FRANCÉS
 *
 * Sistema de amortización donde:
 * - Cuotas FIJAS durante todo el plazo
 * - Al inicio se paga más interés, al final más capital
 * - Usa fórmula de anualidad
 *
 * Ventajas:
 * - Cuotas predecibles
 * - Fácil de presupuestar
 *
 * Desventaja:
 * - Se paga más interés total que otros sistemas
 *
 * Uso: Casos donde el cliente prefiere estabilidad
 */

import { PaymentFrequency } from '@prisma/client'
import { addMonths, addWeeks } from 'date-fns'

export interface FrenchLoanTerms {
  principalAmount: number
  interestRate: number // Tasa MENSUAL (ej: 0.01 = 1%)
  termMonths: number
  paymentFrequency: PaymentFrequency
  firstDueDate: Date
}

export interface FrenchInstallmentData {
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
 * Calcular cuota fija del sistema francés
 *
 * Fórmula: C = P × [r × (1 + r)^n] / [(1 + r)^n - 1]
 *
 * Donde:
 * C = Cuota fija
 * P = Principal
 * r = Tasa de interés
 * n = Número de cuotas
 */
function calculateFixedPayment(
  principal: number,
  rate: number,
  periods: number
): number {
  // Si la tasa es 0, simplemente dividir el principal
  if (rate === 0) {
    return principal / periods
  }

  const numerator = rate * Math.pow(1 + rate, periods)
  const denominator = Math.pow(1 + rate, periods) - 1
  const payment = principal * (numerator / denominator)

  return payment
}

/**
 * Generar cronograma de préstamo tipo FRANCÉS
 *
 * Ejemplo:
 * Principal: 1,000€
 * Tasa: 1% mensual
 * Plazo: 10 meses
 *
 * Cuota fija: 105.58€
 *
 * Cuota 1: Capital 95.58€ + Interés 10.00€ = 105.58€ (Saldo: 904.42€)
 * Cuota 2: Capital 96.54€ + Interés 9.04€ = 105.58€ (Saldo: 807.88€)
 * ...
 * Cuota 10: Capital 104.53€ + Interés 1.05€ = 105.58€ (Saldo: 0€)
 */
export function generateFrenchSchedule(
  terms: FrenchLoanTerms
): FrenchInstallmentData[] {
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

  // Calcular cuota fija usando fórmula de anualidad
  const fixedPayment = calculateFixedPayment(
    principalAmount,
    interestRate,
    numberOfInstallments
  )

  const installments: FrenchInstallmentData[] = []
  let remainingPrincipal = principalAmount

  for (let i = 1; i <= numberOfInstallments; i++) {
    const dueDate = getNextDueDate(firstDueDate, paymentFrequency, i - 1)

    // Calcular interés sobre saldo restante
    const interestAmount = remainingPrincipal * interestRate

    // Capital = Cuota fija - Interés
    let principalThisInstallment = fixedPayment - interestAmount

    // En la última cuota, ajustar para evitar errores de redondeo
    if (i === numberOfInstallments) {
      principalThisInstallment = remainingPrincipal
    }

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
 * Calcular resumen financiero del préstamo francés
 */
export function calculateFrenchSummary(terms: FrenchLoanTerms) {
  const installments = generateFrenchSchedule(terms)

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
      fixedInstallmentAmount: installments[0]?.totalAmount || 0,
      firstInstallmentInterest: installments[0]?.interestAmount || 0,
      lastInstallmentInterest:
        installments[installments.length - 1]?.interestAmount || 0,
    },
  }
}

/**
 * Validar términos del préstamo francés
 */
export function validateFrenchLoanTerms(
  terms: FrenchLoanTerms
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
