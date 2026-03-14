/**
 * SISTEMA UNIFICADO DE AMORTIZACIÓN
 *
 * Este módulo orquesta todos los tipos de amortización
 * y proporciona una interfaz unificada para generación de cronogramas
 */

import { AmortizationType, PaymentFrequency, InterestType } from '@prisma/client'
import {
  generateAmericanSchedule,
  calculateAmericanSummary,
  validateAmericanLoanTerms,
  type AmericanLoanTerms,
} from './amortization-american'
import {
  generateFrenchSchedule,
  calculateFrenchSummary,
  validateFrenchLoanTerms,
  type FrenchLoanTerms,
} from './amortization-french'
import {
  generateGermanSchedule,
  calculateGermanSummary,
  validateGermanLoanTerms,
  type GermanLoanTerms,
} from './amortization-german'
import { generateInstallmentSchedule } from './installments'

export interface UnifiedLoanTerms {
  principalAmount: number
  amortizationType: AmortizationType
  interestType: InterestType
  interestRate: number
  fixedInterestAmount?: number
  termMonths: number
  paymentFrequency: PaymentFrequency
  firstDueDate: Date
}

export interface UnifiedInstallmentData {
  installmentNumber: number
  dueDate: Date
  principalAmount: number
  interestAmount: number
  totalAmount: number
  pendingAmount: number
  remainingPrincipal?: number
  isLastInstallment?: boolean
}

export interface LoanSummary {
  principalAmount: number
  totalInterest: number
  totalToPay: number
  numberOfInstallments: number
  averageInstallmentAmount?: number
  regularInstallmentAmount?: number
  lastInstallmentAmount?: number
  fixedInstallmentAmount?: number
  firstInstallmentAmount?: number
  effectiveAnnualRate?: number
}

/**
 * Generar cronograma según el tipo de amortización
 *
 * Esta es la función principal que se usa en toda la aplicación
 */
export function generateLoanSchedule(
  terms: UnifiedLoanTerms
): UnifiedInstallmentData[] {
  const {
    principalAmount,
    amortizationType,
    interestType,
    interestRate,
    fixedInterestAmount,
    termMonths,
    paymentFrequency,
    firstDueDate,
  } = terms

  switch (amortizationType) {
    case 'AMERICAN': {
      const americanTerms: AmericanLoanTerms = {
        principalAmount,
        interestType,
        interestRate,
        fixedInterestAmount,
        termMonths,
        paymentFrequency,
        firstDueDate,
      }
      return generateAmericanSchedule(americanTerms)
    }

    case 'FRENCH': {
      // Para francés, necesitamos tasa mensual en formato decimal
      let monthlyRate = interestRate / 100 // Convertir porcentaje a decimal
      if (interestType === 'PERCENTAGE_ANNUAL') {
        monthlyRate = interestRate / 12 / 100
      }

      const frenchTerms: FrenchLoanTerms = {
        principalAmount,
        interestRate: monthlyRate,
        termMonths,
        paymentFrequency,
        firstDueDate,
      }
      return generateFrenchSchedule(frenchTerms)
    }

    case 'GERMAN': {
      // Para alemán, también necesitamos tasa mensual en formato decimal
      let monthlyRate = interestRate / 100 // Convertir porcentaje a decimal
      if (interestType === 'PERCENTAGE_ANNUAL') {
        monthlyRate = interestRate / 12 / 100
      }

      const germanTerms: GermanLoanTerms = {
        principalAmount,
        interestRate: monthlyRate,
        termMonths,
        paymentFrequency,
        firstDueDate,
      }
      return generateGermanSchedule(germanTerms)
    }

    case 'SIMPLE': {
      // Préstamo simple: Todo en una cuota
      const totalInterest =
        interestType === 'FIXED_AMOUNT'
          ? fixedInterestAmount || 0
          : interestType === 'PERCENTAGE_ANNUAL'
            ? principalAmount * (interestRate / 100) * (termMonths / 12)
            : principalAmount * (interestRate / 100) * termMonths

      return [
        {
          installmentNumber: 1,
          dueDate: firstDueDate,
          principalAmount,
          interestAmount: Number(totalInterest.toFixed(2)),
          totalAmount: Number((principalAmount + totalInterest).toFixed(2)),
          pendingAmount: Number((principalAmount + totalInterest).toFixed(2)),
          remainingPrincipal: 0,
          isLastInstallment: true,
        },
      ]
    }

    case 'CUSTOM':
    default: {
      // Usar el sistema actual (custom)
      return generateInstallmentSchedule({
        principalAmount,
        interestType,
        interestRate,
        fixedInterestAmount,
        termMonths,
        paymentFrequency,
        firstDueDate,
      })
    }
  }
}

/**
 * Calcular resumen completo del préstamo
 */
export function calculateLoanSummary(
  terms: UnifiedLoanTerms
): { installments: UnifiedInstallmentData[]; summary: LoanSummary } {
  const {
    principalAmount,
    amortizationType,
    interestType,
    interestRate,
    fixedInterestAmount,
    termMonths,
    paymentFrequency,
    firstDueDate,
  } = terms

  switch (amortizationType) {
    case 'AMERICAN': {
      const americanTerms: AmericanLoanTerms = {
        principalAmount,
        interestType,
        interestRate,
        fixedInterestAmount,
        termMonths,
        paymentFrequency,
        firstDueDate,
      }
      return calculateAmericanSummary(americanTerms)
    }

    case 'FRENCH': {
      let monthlyRate = interestRate / 100
      if (interestType === 'PERCENTAGE_ANNUAL') {
        monthlyRate = interestRate / 12 / 100
      }

      const frenchTerms: FrenchLoanTerms = {
        principalAmount,
        interestRate: monthlyRate,
        termMonths,
        paymentFrequency,
        firstDueDate,
      }
      return calculateFrenchSummary(frenchTerms)
    }

    case 'GERMAN': {
      let monthlyRate = interestRate / 100
      if (interestType === 'PERCENTAGE_ANNUAL') {
        monthlyRate = interestRate / 12 / 100
      }

      const germanTerms: GermanLoanTerms = {
        principalAmount,
        interestRate: monthlyRate,
        termMonths,
        paymentFrequency,
        firstDueDate,
      }
      return calculateGermanSummary(germanTerms)
    }

    default: {
      const installments = generateLoanSchedule(terms)
      const totalInterest = installments.reduce(
        (sum, inst) => sum + inst.interestAmount,
        0
      )

      return {
        installments,
        summary: {
          principalAmount,
          totalInterest: Number(totalInterest.toFixed(2)),
          totalToPay: Number((principalAmount + totalInterest).toFixed(2)),
          numberOfInstallments: installments.length,
          averageInstallmentAmount: Number(
            ((principalAmount + totalInterest) / installments.length).toFixed(2)
          ),
        },
      }
    }
  }
}

/**
 * Validar términos del préstamo según tipo de amortización
 */
export function validateLoanTerms(
  terms: UnifiedLoanTerms
): { valid: boolean; errors: string[] } {
  const baseErrors: string[] = []

  // Validaciones básicas
  if (!terms.principalAmount || terms.principalAmount <= 0) {
    baseErrors.push('El monto principal debe ser mayor a 0')
  }

  if (!terms.termMonths || terms.termMonths <= 0) {
    baseErrors.push('El plazo debe ser mayor a 0 meses')
  }

  if (!terms.firstDueDate) {
    baseErrors.push('Debe especificar la fecha de primera cuota')
  }

  if (baseErrors.length > 0) {
    return { valid: false, errors: baseErrors }
  }

  // Validaciones específicas por tipo
  switch (terms.amortizationType) {
    case 'AMERICAN': {
      const americanTerms: AmericanLoanTerms = {
        principalAmount: terms.principalAmount,
        interestType: terms.interestType,
        interestRate: terms.interestRate,
        fixedInterestAmount: terms.fixedInterestAmount,
        termMonths: terms.termMonths,
        paymentFrequency: terms.paymentFrequency,
        firstDueDate: terms.firstDueDate,
      }
      return validateAmericanLoanTerms(americanTerms)
    }

    case 'FRENCH': {
      let monthlyRate = terms.interestRate / 100
      if (terms.interestType === 'PERCENTAGE_ANNUAL') {
        monthlyRate = terms.interestRate / 12 / 100
      }

      const frenchTerms: FrenchLoanTerms = {
        principalAmount: terms.principalAmount,
        interestRate: monthlyRate,
        termMonths: terms.termMonths,
        paymentFrequency: terms.paymentFrequency,
        firstDueDate: terms.firstDueDate,
      }
      return validateFrenchLoanTerms(frenchTerms)
    }

    case 'GERMAN': {
      let monthlyRate = terms.interestRate / 100
      if (terms.interestType === 'PERCENTAGE_ANNUAL') {
        monthlyRate = terms.interestRate / 12 / 100
      }

      const germanTerms: GermanLoanTerms = {
        principalAmount: terms.principalAmount,
        interestRate: monthlyRate,
        termMonths: terms.termMonths,
        paymentFrequency: terms.paymentFrequency,
        firstDueDate: terms.firstDueDate,
      }
      return validateGermanLoanTerms(germanTerms)
    }

    default:
      return { valid: true, errors: [] }
  }
}

/**
 * Comparar diferentes tipos de amortización
 *
 * Útil para mostrar al usuario la diferencia entre tipos
 */
export function compareAmortizationTypes(
  terms: Omit<UnifiedLoanTerms, 'amortizationType'>
) {
  const types: AmortizationType[] = ['AMERICAN', 'FRENCH', 'GERMAN', 'SIMPLE']

  const comparisons = types.map((type) => {
    const loanTerms: UnifiedLoanTerms = {
      ...terms,
      amortizationType: type,
    }

    const { summary } = calculateLoanSummary(loanTerms)

    return {
      type,
      ...summary,
    }
  })

  return comparisons
}

/**
 * Obtener descripción del tipo de amortización
 */
export function getAmortizationTypeDescription(type: AmortizationType): {
  name: string
  description: string
  pros: string[]
  cons: string[]
  bestFor: string
} {
  const descriptions = {
    AMERICAN: {
      name: 'Préstamo Americano',
      description: 'Solo pagas intereses durante el plazo. Capital al final.',
      pros: ['Cuotas muy bajas', 'Mayor liquidez durante el plazo'],
      cons: ['Última cuota muy grande', 'Mayor interés total'],
      bestFor: 'Clientes que necesitan liquidez mensual',
    },
    FRENCH: {
      name: 'Préstamo Francés',
      description: 'Cuotas fijas todo el tiempo.',
      pros: ['Cuotas predecibles', 'Fácil de presupuestar'],
      cons: ['Más interés total que alemán'],
      bestFor: 'Clientes que quieren estabilidad',
    },
    GERMAN: {
      name: 'Préstamo Alemán',
      description: 'Cuotas decrecientes con capital fijo.',
      pros: ['Menos interés total', 'Deuda baja rápido'],
      cons: ['Cuotas iniciales altas'],
      bestFor: 'Clientes con alta capacidad de pago inicial',
    },
    SIMPLE: {
      name: 'Préstamo Simple',
      description: 'Todo en una sola cuota al final.',
      pros: ['Sin pagos mensuales', 'Muy simple'],
      cons: ['Requiere gran liquidez final'],
      bestFor: 'Préstamos muy cortos o con garantía fuerte',
    },
    CUSTOM: {
      name: 'Personalizado',
      description: 'Configuración manual del cronograma.',
      pros: ['Máxima flexibilidad'],
      cons: ['Requiere configuración manual'],
      bestFor: 'Casos especiales',
    },
  }

  return descriptions[type]
}
