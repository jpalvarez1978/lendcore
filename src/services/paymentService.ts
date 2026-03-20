import { prisma } from '@/lib/prisma'
import { PaymentMethod, type Payment, type Prisma } from '@prisma/client'
import {
  allocatePayment,
  calculateLoanBalance,
  getInstallmentComponentBalances,
  type AllocationResult,
} from '@/lib/calculations/allocation'
import {
  getOpenInstallmentStatuses,
  resolveOpenInstallmentStatus,
} from '@/lib/utils/installmentStatus'
import { TRANSACTION_CONFIG } from '@/lib/db/transactionConfig'
import { LoanService } from './loanService'
import { getNowInSpain } from '@/lib/utils/timezone'

export interface CreatePaymentData {
  loanId: string
  amount: number
  paymentMethod: PaymentMethod
  reference?: string | null
  paidAt?: Date
  notes?: string | null
  installmentId?: string | null // Si se especifica, pago directo a esta cuota
}

type LoanWithPaymentContext = NonNullable<Awaited<ReturnType<typeof LoanService.getById>>>
type LoanInstallment = LoanWithPaymentContext['installments'][number]

export class PaymentService {
  private static roundCurrency(value: number) {
    const rounded = Number(value.toFixed(2))
    return Object.is(rounded, -0) ? 0 : rounded
  }

  private static buildAllocationRecords(summary: {
    PENALTY: number
    INTEREST: number
    PRINCIPAL: number
  }) {
    return (Object.entries(summary) as Array<[keyof typeof summary, number]>)
      .filter(([, amount]) => amount > 0)
      .map(([type, amount]) => ({
        type,
        amount: this.roundCurrency(amount),
      }))
  }

  private static buildPaymentAuditSnapshot(
    payment: Payment,
    allocations: AllocationResult[],
    installmentId?: string | null
  ): Prisma.InputJsonObject {
    return {
      id: payment.id,
      loanId: payment.loanId,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      reference: payment.reference,
      paidAt: payment.paidAt.toISOString(),
      processedById: payment.processedById,
      notes: payment.notes,
      installmentId: installmentId ?? null,
      allocations: allocations.map(allocation => ({
        type: allocation.type,
        amount: this.roundCurrency(allocation.amount),
      })),
    }
  }

  private static applyPaymentToInstallment(
    installment: LoanInstallment,
    amount: number,
    paidAt: Date
  ) {
    const balances = getInstallmentComponentBalances(installment)
    let remainingAmount = this.roundCurrency(amount)

    const penaltyPayment = this.roundCurrency(Math.min(remainingAmount, balances.pendingPenalty))
    remainingAmount = this.roundCurrency(remainingAmount - penaltyPayment)

    const interestPayment = this.roundCurrency(Math.min(remainingAmount, balances.pendingInterest))
    remainingAmount = this.roundCurrency(remainingAmount - interestPayment)

    const principalPayment = this.roundCurrency(
      Math.min(remainingAmount, balances.pendingPrincipal)
    )

    const appliedAmount = this.roundCurrency(
      penaltyPayment + interestPayment + principalPayment
    )
    const newPaidAmount = this.roundCurrency(Number(installment.paidAmount || 0) + appliedAmount)
    const newPendingAmount = this.roundCurrency(
      Math.max(
        0,
        balances.pendingPenalty +
          balances.pendingInterest +
          balances.pendingPrincipal -
          appliedAmount
      )
    )

    const newStatus = resolveOpenInstallmentStatus({
      dueDate: installment.dueDate,
      pendingAmount: newPendingAmount,
      paidAmount: newPaidAmount,
    })

    return {
      appliedAmount,
      penaltyPayment,
      interestPayment,
      principalPayment,
      data: {
        paidPenalty: this.roundCurrency(balances.paidPenalty + penaltyPayment),
        paidInterest: this.roundCurrency(balances.paidInterest + interestPayment),
        paidPrincipal: this.roundCurrency(balances.paidPrincipal + principalPayment),
        paidAmount: newPaidAmount,
        pendingAmount: newPendingAmount,
        status: newStatus,
        paidAt: newStatus === 'PAID' ? paidAt : installment.paidAt,
      },
    }
  }

  /**
   * Registrar nuevo pago con asignación automática o por cuota específica
   */
  static async create(data: CreatePaymentData, userId: string) {
    // Obtener préstamo completo con cuotas
    const loan = await LoanService.getById(data.loanId)
    if (!loan) {
      throw new Error('Préstamo no encontrado')
    }

    if (loan.status !== 'ACTIVE' && loan.status !== 'DEFAULTED') {
      throw new Error('Solo se pueden registrar pagos en préstamos activos o en mora')
    }

    if (!Number.isFinite(data.amount) || data.amount <= 0) {
      throw new Error('El monto del pago debe ser mayor que 0')
    }

    // B12: Validar monto máximo razonable
    if (data.amount > 10_000_000) {
      throw new Error('El monto del pago no puede exceder 10.000.000€')
    }

    const paymentDate = data.paidAt || getNowInSpain()

    // MODO 1: Pago a cuota específica
    if (data.installmentId) {
      return this.createInstallmentPayment(
        { ...data, paidAt: paymentDate },
        loan,
        userId
      )
    }

    // MODO 2: Pago automático (distribución automática)
    // Calcular balance actual del préstamo
    const balance = calculateLoanBalance(loan)

    // Validar que haya cuotas pendientes
    const openInstallmentStatuses = getOpenInstallmentStatuses()
    const hasPendingInstallments = loan.installments.some(
      inst => openInstallmentStatuses.includes(inst.status) && Number(inst.pendingAmount || 0) > 0
    )

    if (!hasPendingInstallments) {
      throw new Error('Este préstamo no tiene cuotas pendientes. Todas las cuotas han sido pagadas.')
    }

    if (balance.totalOutstanding <= 0) {
      throw new Error('Este préstamo no tiene saldo pendiente. Todas las cuotas han sido pagadas.')
    }

    if (data.amount > balance.totalOutstanding) {
      throw new Error(
        `El monto del pago (${data.amount}€) excede el total adeudado (${balance.totalOutstanding.toFixed(2)}€)`
      )
    }

    const previewAllocations = allocatePayment(data.amount, balance)

    // Crear pago y asignaciones en una transacción
    const payment = await prisma.$transaction(async tx => {
      const newPayment = await tx.payment.create({
        data: {
          loanId: data.loanId,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          reference: data.reference,
          paidAt: paymentDate,
          processedById: userId,
          notes: data.notes,
        },
      })

      const allocationSummary = {
        PENALTY: 0,
        INTEREST: 0,
        PRINCIPAL: 0,
      }

      let remainingAmount = this.roundCurrency(data.amount)
      const pendingInstallments = loan.installments
        .filter(
          inst =>
            openInstallmentStatuses.includes(inst.status) &&
            Number(inst.pendingAmount || 0) > 0
        )
        .sort((a, b) => {
          const dueDateDiff = a.dueDate.getTime() - b.dueDate.getTime()
          if (dueDateDiff !== 0) return dueDateDiff
          return a.installmentNumber - b.installmentNumber
        })

      for (const installment of pendingInstallments) {
        if (remainingAmount <= 0) break

        const installmentPayment = this.applyPaymentToInstallment(
          installment,
          remainingAmount,
          paymentDate
        )

        if (installmentPayment.appliedAmount <= 0) {
          continue
        }

        remainingAmount = this.roundCurrency(remainingAmount - installmentPayment.appliedAmount)
        allocationSummary.PENALTY = this.roundCurrency(
          allocationSummary.PENALTY + installmentPayment.penaltyPayment
        )
        allocationSummary.INTEREST = this.roundCurrency(
          allocationSummary.INTEREST + installmentPayment.interestPayment
        )
        allocationSummary.PRINCIPAL = this.roundCurrency(
          allocationSummary.PRINCIPAL + installmentPayment.principalPayment
        )

        await tx.installment.update({
          where: { id: installment.id },
          data: installmentPayment.data,
        })
      }

      if (remainingAmount > 0) {
        throw new Error('No se pudo asignar completamente el pago al cronograma del préstamo')
      }

      const allocations = this.buildAllocationRecords(allocationSummary)

      if (allocations.length > 0) {
        await tx.paymentAllocation.createMany({
          data: allocations.map(alloc => ({
            paymentId: newPayment.id,
            type: alloc.type,
            amount: alloc.amount,
          })),
        })
      }

      return newPayment
    }, TRANSACTION_CONFIG.CRITICAL)

    // Recalcular totales y auditar DENTRO de una transacción para garantizar consistencia (B3, B14)
    await prisma.$transaction(async tx => {
      // Recalcular totales del préstamo
      const loan2 = await tx.loan.findUnique({
        where: { id: data.loanId },
        include: { installments: true },
      })
      if (loan2) {
        const totals = loan2.installments.reduce(
          (summary, installment) => {
            summary.totalPaid += Number(installment.paidAmount || 0)
            summary.outstandingPrincipal += Number(installment.pendingAmount || 0)
            return summary
          },
          { totalPaid: 0, outstandingPrincipal: 0 }
        )

        const allInstallmentsPaid = loan2.installments.every(inst => inst.status === 'PAID')

        await tx.loan.update({
          where: { id: data.loanId },
          data: {
            outstandingPrincipal: Number(Math.max(0, totals.outstandingPrincipal).toFixed(2)),
            totalPaid: Number(totals.totalPaid.toFixed(2)),
            status: allInstallmentsPaid ? 'PAID' : loan2.status,
          },
        })
      }

      // Auditoría dentro de la misma transacción
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          entityType: 'payments',
          entityId: payment.id,
          newValue: this.buildPaymentAuditSnapshot(payment, previewAllocations),
        },
      })
    })

    return payment
  }

  /**
   * Registrar pago directo a una cuota específica
   */
  private static async createInstallmentPayment(
    data: CreatePaymentData,
    loan: LoanWithPaymentContext,
    userId: string
  ) {
    // Buscar la cuota específica
    const installment = loan.installments.find(inst => inst.id === data.installmentId)

    if (!installment) {
      throw new Error('Cuota no encontrada')
    }

    if (installment.status === 'PAID') {
      throw new Error('Esta cuota ya está pagada')
    }

    const installmentBalance = getInstallmentComponentBalances(installment)
    const pendingAmount = this.roundCurrency(
      installmentBalance.pendingPenalty +
        installmentBalance.pendingInterest +
        installmentBalance.pendingPrincipal
    )

    if (pendingAmount <= 0) {
      throw new Error('Esta cuota no tiene saldo pendiente')
    }

    if (data.amount > pendingAmount) {
      throw new Error(
        `El monto del pago (${data.amount}€) excede el monto pendiente de la cuota (${pendingAmount.toFixed(2)}€)`
      )
    }

    const paymentDate = data.paidAt || getNowInSpain()
    const installmentPayment = this.applyPaymentToInstallment(
      installment,
      data.amount,
      paymentDate
    )
    const allocations = this.buildAllocationRecords({
      PENALTY: installmentPayment.penaltyPayment,
      INTEREST: installmentPayment.interestPayment,
      PRINCIPAL: installmentPayment.principalPayment,
    })

    // Crear pago en transacción
    const payment = await prisma.$transaction(async tx => {
      const newPayment = await tx.payment.create({
        data: {
          loanId: data.loanId,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          reference: data.reference,
          paidAt: paymentDate,
          processedById: userId,
          notes: data.notes,
        },
      })

      if (allocations.length > 0) {
        await tx.paymentAllocation.createMany({
          data: allocations.map(alloc => ({
            paymentId: newPayment.id,
            type: alloc.type,
            amount: alloc.amount,
          })),
        })
      }

      await tx.installment.update({
        where: { id: installment.id },
        data: installmentPayment.data,
      })

      return newPayment
    }, TRANSACTION_CONFIG.CRITICAL)

    // Recalcular totales y auditar DENTRO de una transacción (B3, B14)
    await prisma.$transaction(async tx => {
      const loan2 = await tx.loan.findUnique({
        where: { id: data.loanId },
        include: { installments: true },
      })
      if (loan2) {
        const totals = loan2.installments.reduce(
          (summary, inst) => {
            summary.totalPaid += Number(inst.paidAmount || 0)
            summary.outstandingPrincipal += Number(inst.pendingAmount || 0)
            return summary
          },
          { totalPaid: 0, outstandingPrincipal: 0 }
        )

        const allPaid = loan2.installments.every(inst => inst.status === 'PAID')

        await tx.loan.update({
          where: { id: data.loanId },
          data: {
            outstandingPrincipal: Number(Math.max(0, totals.outstandingPrincipal).toFixed(2)),
            totalPaid: Number(totals.totalPaid.toFixed(2)),
            status: allPaid ? 'PAID' : loan2.status,
          },
        })
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          entityType: 'payments',
          entityId: payment.id,
          newValue: {
            ...this.buildPaymentAuditSnapshot(payment, allocations, data.installmentId),
          },
        },
      })
    })

    return payment
  }

  /**
   * Obtener todos los pagos de un préstamo
   */
  static async getByLoanId(loanId: string, page: number = 1, pageSize: number = 50) {
    const skip = (page - 1) * pageSize

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: { loanId },
        include: {
          allocations: true,
        },
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.payment.count({ where: { loanId } }),
    ])

    return {
      payments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  /**
   * Obtener detalles de un pago
   */
  static async getById(id: string) {
    return await prisma.payment.findUnique({
      where: { id },
      include: {
        allocations: true,
        loan: {
          include: {
            client: {
              include: {
                individualProfile: true,
                businessProfile: true,
              },
            },
          },
        },
      },
    })
  }

  /**
   * Calcular preview de asignación sin guardar
   */
  static async previewPaymentAllocation(loanId: string, amount: number) {
    const loan = await LoanService.getById(loanId)
    if (!loan) {
      throw new Error('Préstamo no encontrado')
    }

    const balance = calculateLoanBalance(loan)
    const allocations = allocatePayment(amount, balance)

    return {
      balance,
      allocations,
      remainingBalance: this.roundCurrency(balance.totalOutstanding - amount),
    }
  }
}
