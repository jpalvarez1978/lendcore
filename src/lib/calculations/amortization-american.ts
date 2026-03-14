/**
 * PRÉSTAMO TIPO AMERICANO
 *
 * Sistema de amortización donde:
 * - Durante el plazo: Se pagan SOLO INTERESES
 * - Última cuota: Se paga TODO EL CAPITAL + intereses
 *
 * Ventajas:
 * - Cuotas bajas durante el plazo
 * - Mayor liquidez para el cliente
 *
 * Desventaja:
 * - Última cuota muy grande
 *
 * Uso: 99% de los préstamos del cliente
 */

import { PaymentFrequency, InterestType } from '@prisma/client'
import { addMonths, addWeeks } from 'date-fns'

export interface AmericanLoanTerms {
  principalAmount: number
  interestType: InterestType
  interestRate: number
  fixedInterestAmount?: number
  termMonths: number
  paymentFrequency: PaymentFrequency
  firstDueDate: Date
}

export interface AmericanInstallmentData {
  installmentNumber: number
  dueDate: Date
  principalAmount: number
  interestAmount: number
  totalAmount: number
  pendingAmount: number
  isLastInstallment: boolean
}

/**
 * Calcular número de cuotas basado en frecuencia y plazo
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
 * Calcular interés de una cuota
 */
function calculateInstallmentInterest(
  principalAmount: number,
  interestType: InterestType,
  interestRate: number,
  fixedInterestAmount?: number
): number {
  switch (interestType) {
    case 'FIXED_AMOUNT':
      return fixedInterestAmount || 0

    case 'PERCENTAGE_MONTHLY':
      // Convertir porcentaje a decimal (1% = 0.01)
      return principalAmount * (interestRate / 100)

    case 'PERCENTAGE_ANNUAL':
      // Convertir tasa anual a mensual y porcentaje a decimal
      const monthlyRate = interestRate / 12 / 100
      return principalAmount * monthlyRate

    default:
      return 0
  }
}

/**
 * Generar cronograma de préstamo tipo AMERICANO
 *
 * Ejemplo:
 * Principal: 1,000€
 * Tasa: 1% mensual
 * Plazo: 2 meses
 *
 * Resultado:
 * Cuota 1: Capital 0€ + Interés 10€ = 10€ (Saldo: 1,000€)
 * Cuota 2: Capital 1,000€ + Interés 10€ = 1,010€ (Saldo: 0€)
 *
 * Total Intereses: 20€
 * Total a Pagar: 1,020€
 */
export function generateAmericanSchedule(
  terms: AmericanLoanTerms
): AmericanInstallmentData[] {
  const {
    principalAmount,
    interestType,
    interestRate,
    fixedInterestAmount,
    termMonths,
    paymentFrequency,
    firstDueDate,
  } = terms

  // Calcular número de cuotas
  const numberOfInstallments = calculateNumberOfInstallments(
    termMonths,
    paymentFrequency
  )

  const installments: AmericanInstallmentData[] = []

  for (let i = 1; i <= numberOfInstallments; i++) {
    const isLastInstallment = i === numberOfInstallments

    // Calcular fecha de vencimiento
    const dueDate = getNextDueDate(firstDueDate, paymentFrequency, i - 1)

    // Calcular interés (siempre sobre el capital total, no el restante)
    // Esta es la característica clave del préstamo americano
    const interestAmount = calculateInstallmentInterest(
      principalAmount,
      interestType,
      interestRate,
      fixedInterestAmount
    )

    // En préstamo americano:
    // - Cuotas 1 a n-1: Capital = 0, solo se paga interés
    // - Cuota n (última): Capital = todo el principal + interés
    const principalThisInstallment = isLastInstallment ? principalAmount : 0
    const totalAmount = principalThisInstallment + interestAmount

    installments.push({
      installmentNumber: i,
      dueDate,
      principalAmount: Number(principalThisInstallment.toFixed(2)),
      interestAmount: Number(interestAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      pendingAmount: Number(totalAmount.toFixed(2)),
      isLastInstallment,
    })
  }

  return installments
}

/**
 * Calcular resumen financiero del préstamo americano
 */
export function calculateAmericanSummary(terms: AmericanLoanTerms) {
  const installments = generateAmericanSchedule(terms)

  const totalInterest = installments.reduce(
    (sum, inst) => sum + inst.interestAmount,
    0
  )

  const totalToPay = terms.principalAmount + totalInterest

  // La última cuota es la más grande
  const lastInstallment = installments[installments.length - 1]

  // La cuota regular es solo el interés
  const regularInstallment = installments[0]

  return {
    installments,
    summary: {
      principalAmount: terms.principalAmount,
      totalInterest: Number(totalInterest.toFixed(2)),
      totalToPay: Number(totalToPay.toFixed(2)),
      numberOfInstallments: installments.length,

      // Información específica del americano
      regularInstallmentAmount: regularInstallment?.totalAmount || 0, // Solo interés
      lastInstallmentAmount: lastInstallment.totalAmount, // Capital + interés

      // Métricas
      averageInstallmentAmount: Number((totalToPay / installments.length).toFixed(2)),
      effectiveAnnualRate: calculateEffectiveRate(terms),
    },
  }
}

/**
 * Calcular tasa efectiva anual (TAE)
 */
function calculateEffectiveRate(terms: AmericanLoanTerms): number {
  const { interestRate, interestType } = terms

  // Convertir porcentaje a decimal
  let monthlyRate = interestRate / 100

  // Si es tasa anual, convertir a mensual
  if (interestType === 'PERCENTAGE_ANNUAL') {
    monthlyRate = interestRate / 12 / 100
  }

  // Calcular TAE: (1 + r)^12 - 1
  const tae = Math.pow(1 + monthlyRate, 12) - 1

  return Number((tae * 100).toFixed(2)) // Retornar como porcentaje
}

/**
 * Validar términos del préstamo americano
 */
export function validateAmericanLoanTerms(
  terms: AmericanLoanTerms
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

  if (terms.interestType === 'FIXED_AMOUNT' && !terms.fixedInterestAmount) {
    errors.push('Debe especificar el monto fijo de interés')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
