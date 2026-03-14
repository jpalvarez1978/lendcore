import { PaymentFrequency, InterestType } from '@prisma/client'
import { addMonths, addWeeks } from 'date-fns'

export interface InstallmentData {
  installmentNumber: number
  dueDate: Date
  principalAmount: number
  interestAmount: number
  totalAmount: number
  pendingAmount: number
}

export interface LoanTerms {
  principalAmount: number
  interestType: InterestType
  interestRate: number // Decimal (ej: 0.035 = 3.5%)
  fixedInterestAmount?: number
  termMonths: number
  paymentFrequency: PaymentFrequency
  firstDueDate: Date
}

/**
 * Calcular número de cuotas basado en frecuencia y plazo
 */
export function calculateNumberOfInstallments(
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
export function getNextDueDate(
  currentDate: Date,
  frequency: PaymentFrequency,
  installmentNumber: number
): Date {
  switch (frequency) {
    case 'WEEKLY':
      return addWeeks(currentDate, installmentNumber)
    case 'BIWEEKLY':
      return addWeeks(currentDate, installmentNumber * 2)
    case 'MONTHLY':
      return addMonths(currentDate, installmentNumber)
    case 'QUARTERLY':
      return addMonths(currentDate, installmentNumber * 3)
    default:
      return addMonths(currentDate, installmentNumber)
  }
}

/**
 * Calcular interés de una cuota
 */
export function calculateInstallmentInterest(
  outstandingPrincipal: number,
  interestType: InterestType,
  interestRate: number,
  fixedInterestAmount?: number
): number {
  switch (interestType) {
    case 'FIXED_AMOUNT':
      return fixedInterestAmount || 0

    case 'PERCENTAGE_MONTHLY':
      return outstandingPrincipal * interestRate

    case 'PERCENTAGE_ANNUAL':
      // Convertir tasa anual a mensual
      const monthlyRate = interestRate / 12
      return outstandingPrincipal * monthlyRate

    default:
      return 0
  }
}

/**
 * Generar cronograma completo de cuotas
 */
export function generateInstallmentSchedule(terms: LoanTerms): InstallmentData[] {
  const {
    principalAmount,
    interestType,
    interestRate,
    fixedInterestAmount,
    termMonths,
    paymentFrequency,
    firstDueDate,
  } = terms

  const numberOfInstallments = calculateNumberOfInstallments(termMonths, paymentFrequency)
  const principalPerInstallment = principalAmount / numberOfInstallments

  const installments: InstallmentData[] = []
  let remainingPrincipal = principalAmount

  for (let i = 1; i <= numberOfInstallments; i++) {
    // Calcular fecha de vencimiento
    const dueDate = getNextDueDate(firstDueDate, paymentFrequency, i - 1)

    // Para la última cuota, usar todo el principal restante (evitar errores de redondeo)
    const principalThisInstallment =
      i === numberOfInstallments ? remainingPrincipal : principalPerInstallment

    // Calcular interés sobre el principal restante
    const interestAmount = calculateInstallmentInterest(
      remainingPrincipal,
      interestType,
      interestRate,
      fixedInterestAmount
    )

    const totalAmount = principalThisInstallment + interestAmount

    installments.push({
      installmentNumber: i,
      dueDate,
      principalAmount: Number(principalThisInstallment.toFixed(2)),
      interestAmount: Number(interestAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      pendingAmount: Number(totalAmount.toFixed(2)),
    })

    remainingPrincipal -= principalThisInstallment
  }

  return installments
}

/**
 * Calcular total de interés de todo el préstamo
 */
export function calculateTotalInterest(installments: InstallmentData[]): number {
  return installments.reduce((sum, inst) => sum + inst.interestAmount, 0)
}

/**
 * Calcular TIR (Tasa Interna de Retorno) anual
 */
export function calculateAPR(
  principalAmount: number,
  totalInterest: number,
  termMonths: number
): number {
  const totalAmount = principalAmount + totalInterest
  const years = termMonths / 12
  const apr = (totalAmount / principalAmount - 1) / years
  return apr * 100 // Retornar como porcentaje
}
