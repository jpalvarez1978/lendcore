import { InterestType } from '@prisma/client'

function isPercentageInterestType(interestType: InterestType) {
  return (
    interestType === 'PERCENTAGE_MONTHLY' || interestType === 'PERCENTAGE_ANNUAL'
  )
}

/**
 * Convierte cualquier entrada de tasa a formato persistible en BD.
 * La UI trabaja en porcentaje humano (ej: 12 = 12%), pero Prisma almacena decimal
 * fraccional (ej: 0.12 = 12%).
 */
export function normalizeInterestRateForStorage(
  interestRate: number,
  interestType: InterestType
) {
  if (!isPercentageInterestType(interestType)) {
    return interestRate
  }

  return interestRate > 1 ? interestRate / 100 : interestRate
}

/**
 * Convierte cualquier valor persistido o legacy a porcentaje legible para UI/cálculo.
 * Acepta tanto 0.12 como 12 y devuelve 12.
 */
export function normalizeInterestRateForInput(
  interestRate: number,
  interestType: InterestType
) {
  if (!isPercentageInterestType(interestType)) {
    return interestRate
  }

  return interestRate <= 1 ? interestRate * 100 : interestRate
}
