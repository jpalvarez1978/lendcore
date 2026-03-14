import type { AllocationType } from '@prisma/client'

export interface AllocationResult {
  type: AllocationType
  amount: number
}

export interface LoanBalance {
  outstandingPrincipal: number
  outstandingInterest: number
  outstandingPenalty: number
  totalOutstanding: number
}

export interface InstallmentComponentBalances {
  paidPrincipal: number
  paidInterest: number
  paidPenalty: number
  pendingPrincipal: number
  pendingInterest: number
  pendingPenalty: number
}

type NumericLike = number | string | { toString(): string }

export interface InstallmentLike {
  principalAmount?: NumericLike | null
  interestAmount?: NumericLike | null
  penaltyAmount?: NumericLike | null
  paidAmount?: NumericLike | null
  paidPrincipal?: NumericLike | null
  paidInterest?: NumericLike | null
  paidPenalty?: NumericLike | null
}

interface LoanWithInstallmentsLike {
  installments?: InstallmentLike[]
}

function roundCurrency(value: number) {
  const rounded = Number(value.toFixed(2))
  return Object.is(rounded, -0) ? 0 : rounded
}

export function getInstallmentComponentBalances(
  installment: InstallmentLike
): InstallmentComponentBalances {
  const principalAmount = Number(installment.principalAmount || 0)
  const interestAmount = Number(installment.interestAmount || 0)
  const penaltyAmount = Number(installment.penaltyAmount || 0)
  const paidAmount = Number(installment.paidAmount || 0)

  let paidPrincipal = Number(installment.paidPrincipal || 0)
  let paidInterest = Number(installment.paidInterest || 0)
  let paidPenalty = Number(installment.paidPenalty || 0)

  let untrackedPaidAmount = roundCurrency(
    Math.max(0, paidAmount - paidPrincipal - paidInterest - paidPenalty)
  )

  const inferComponentPayment = (pendingAmount: number) => {
    if (untrackedPaidAmount <= 0 || pendingAmount <= 0) return 0

    const appliedAmount = roundCurrency(Math.min(untrackedPaidAmount, pendingAmount))
    untrackedPaidAmount = roundCurrency(untrackedPaidAmount - appliedAmount)
    return appliedAmount
  }

  paidPenalty = roundCurrency(
    paidPenalty + inferComponentPayment(Math.max(0, penaltyAmount - paidPenalty))
  )
  paidInterest = roundCurrency(
    paidInterest + inferComponentPayment(Math.max(0, interestAmount - paidInterest))
  )
  paidPrincipal = roundCurrency(
    paidPrincipal + inferComponentPayment(Math.max(0, principalAmount - paidPrincipal))
  )

  return {
    paidPrincipal,
    paidInterest,
    paidPenalty,
    pendingPrincipal: roundCurrency(Math.max(0, principalAmount - paidPrincipal)),
    pendingInterest: roundCurrency(Math.max(0, interestAmount - paidInterest)),
    pendingPenalty: roundCurrency(Math.max(0, penaltyAmount - paidPenalty)),
  }
}

/**
 * Calcular el balance pendiente de un préstamo
 */
export function calculateLoanBalance(loan: LoanWithInstallmentsLike): LoanBalance {
  let outstandingPrincipal = 0
  let outstandingInterest = 0
  let outstandingPenalty = 0

  if (loan.installments) {
    loan.installments.forEach(installment => {
      const balances = getInstallmentComponentBalances(installment)
      outstandingPrincipal += balances.pendingPrincipal
      outstandingInterest += balances.pendingInterest
      outstandingPenalty += balances.pendingPenalty
    })
  }

  outstandingPrincipal = roundCurrency(outstandingPrincipal)
  outstandingInterest = roundCurrency(outstandingInterest)
  outstandingPenalty = roundCurrency(outstandingPenalty)

  return {
    outstandingPrincipal,
    outstandingInterest,
    outstandingPenalty,
    totalOutstanding: roundCurrency(
      outstandingPrincipal + outstandingInterest + outstandingPenalty
    ),
  }
}

/**
 * Algoritmo de asignación automática de pagos
 * Prioridad: 1) Mora/Penalidades, 2) Interés, 3) Principal
 */
export function allocatePayment(
  paymentAmount: number,
  balance: LoanBalance
): AllocationResult[] {
  const allocations: AllocationResult[] = []
  let remainingAmount = paymentAmount

  // 1. Asignar primero a PENALIDADES/MORA
  if (balance.outstandingPenalty > 0 && remainingAmount > 0) {
    const penaltyPayment = Math.min(remainingAmount, balance.outstandingPenalty)
    allocations.push({
      type: 'PENALTY',
      amount: penaltyPayment,
    })
    remainingAmount -= penaltyPayment
  }

  // 2. Asignar a INTERÉS
  if (balance.outstandingInterest > 0 && remainingAmount > 0) {
    const interestPayment = Math.min(remainingAmount, balance.outstandingInterest)
    allocations.push({
      type: 'INTEREST',
      amount: interestPayment,
    })
    remainingAmount -= interestPayment
  }

  // 3. Asignar a PRINCIPAL
  if (balance.outstandingPrincipal > 0 && remainingAmount > 0) {
    const principalPayment = Math.min(remainingAmount, balance.outstandingPrincipal)
    allocations.push({
      type: 'PRINCIPAL',
      amount: principalPayment,
    })
    remainingAmount -= principalPayment
  }

  return allocations
}

/**
 * Calcular el nuevo balance después de un pago
 */
export function calculateNewBalance(
  currentBalance: LoanBalance,
  allocations: AllocationResult[]
): LoanBalance {
  const newBalance = { ...currentBalance }

  allocations.forEach(allocation => {
    switch (allocation.type) {
      case 'PENALTY':
        newBalance.outstandingPenalty -= allocation.amount
        break
      case 'INTEREST':
        newBalance.outstandingInterest -= allocation.amount
        break
      case 'PRINCIPAL':
        newBalance.outstandingPrincipal -= allocation.amount
        break
    }
  })

  newBalance.totalOutstanding =
    roundCurrency(
      newBalance.outstandingPrincipal +
        newBalance.outstandingInterest +
        newBalance.outstandingPenalty
    )

  return newBalance
}
