import type { InstallmentStatus, Prisma } from '@prisma/client'
import { addDays, endOfDay, startOfDay } from 'date-fns'

const OPEN_INSTALLMENT_STATUSES: InstallmentStatus[] = ['PENDING', 'PARTIAL', 'OVERDUE']

export function getOpenInstallmentStatuses(): InstallmentStatus[] {
  return [...OPEN_INSTALLMENT_STATUSES]
}

export function getOverdueCutoffDate(referenceDate: Date = new Date()) {
  return startOfDay(referenceDate)
}

export function isInstallmentOverdue(dueDate: Date, referenceDate: Date = new Date()) {
  return dueDate.getTime() < getOverdueCutoffDate(referenceDate).getTime()
}

export function resolveOpenInstallmentStatus({
  dueDate,
  pendingAmount,
  paidAmount,
  referenceDate = new Date(),
}: {
  dueDate: Date
  pendingAmount: number
  paidAmount: number
  referenceDate?: Date
}): InstallmentStatus {
  if (pendingAmount <= 0) {
    return 'PAID'
  }

  if (isInstallmentOverdue(dueDate, referenceDate)) {
    return 'OVERDUE'
  }

  if (paidAmount > 0) {
    return 'PARTIAL'
  }

  return 'PENDING'
}

export function getOverdueInstallmentWhere(
  referenceDate: Date = new Date()
): Prisma.InstallmentWhereInput {
  return {
    dueDate: { lt: getOverdueCutoffDate(referenceDate) },
    pendingAmount: { gt: 0 },
    status: { in: getOpenInstallmentStatuses() },
  }
}

export function getUpcomingInstallmentWhere({
  referenceDate = new Date(),
  daysAhead = 7,
}: {
  referenceDate?: Date
  daysAhead?: number
} = {}): Prisma.InstallmentWhereInput {
  const startDate = startOfDay(referenceDate)

  return {
    dueDate: {
      gte: startDate,
      lte: endOfDay(addDays(startDate, daysAhead)),
    },
    pendingAmount: { gt: 0 },
    status: { in: ['PENDING', 'PARTIAL'] },
  }
}
