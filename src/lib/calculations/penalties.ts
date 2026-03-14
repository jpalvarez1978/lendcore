import { differenceInDays } from 'date-fns'

/**
 * Calcular días de atraso
 */
export function calculateDaysOverdue(dueDate: Date, currentDate: Date = new Date()): number {
  const days = differenceInDays(currentDate, dueDate)
  return days > 0 ? days : 0
}

/**
 * Calcular penalidad por mora
 * @param principal - Principal de la cuota vencida
 * @param daysOverdue - Días de atraso
 * @param dailyPenaltyRate - Tasa diaria de penalidad (ej: 0.001 = 0.1% diario)
 */
export function calculateLatePenalty(
  principal: number,
  daysOverdue: number,
  dailyPenaltyRate: number = 0.001
): number {
  if (daysOverdue <= 0) return 0
  return principal * dailyPenaltyRate * daysOverdue
}

/**
 * Calcular penalidad con tope máximo
 */
export function calculateCappedPenalty(
  principal: number,
  daysOverdue: number,
  dailyPenaltyRate: number = 0.001,
  maxPenaltyRate: number = 0.25 // 25% máximo
): number {
  const penalty = calculateLatePenalty(principal, daysOverdue, dailyPenaltyRate)
  const maxPenalty = principal * maxPenaltyRate
  return Math.min(penalty, maxPenalty)
}

/**
 * Calcular interés moratorio (diferente al interés corriente)
 */
export function calculateDefaultInterest(
  outstandingBalance: number,
  daysOverdue: number,
  defaultRate: number = 0.002 // 0.2% diario por mora
): number {
  if (daysOverdue <= 0) return 0
  return outstandingBalance * defaultRate * daysOverdue
}

/**
 * Categorizar nivel de mora
 */
export function getMoraCategory(daysOverdue: number): {
  level: 'CURRENT' | 'LIGHT' | 'MODERATE' | 'SEVERE' | 'CRITICAL'
  description: string
  color: string
} {
  if (daysOverdue === 0) {
    return { level: 'CURRENT', description: 'Al día', color: 'green' }
  } else if (daysOverdue <= 7) {
    return { level: 'LIGHT', description: '1-7 días', color: 'yellow' }
  } else if (daysOverdue <= 30) {
    return { level: 'MODERATE', description: '8-30 días', color: 'orange' }
  } else if (daysOverdue <= 90) {
    return { level: 'SEVERE', description: '31-90 días', color: 'red' }
  } else {
    return { level: 'CRITICAL', description: '+90 días', color: 'darkred' }
  }
}
