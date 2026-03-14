import { prisma } from '@/lib/prisma'
import {
  LoanStatus,
  InterestType,
  PaymentFrequency,
  AmortizationType,
  Prisma,
} from '@prisma/client'
import { calculateLoanSummary } from '@/lib/calculations/amortization'
import { getInstallmentComponentBalances } from '@/lib/calculations/allocation'
import {
  normalizeInterestRateForInput,
  normalizeInterestRateForStorage,
} from '@/lib/utils/interestRate'

export interface CreateLoanData {
  clientId: string
  principalAmount: number

  // NUEVO: Tipo de amortización
  amortizationType?: AmortizationType

  interestType: InterestType
  interestRate: number
  fixedInterestAmount?: number | null
  termMonths: number
  paymentFrequency: PaymentFrequency
  disbursementDate: Date
  firstDueDate: Date

  // NUEVO: Configuración de días de pago
  allowSaturdayPayments?: boolean
  allowSundayPayments?: boolean

  // NUEVO: Garantes
  hasGuarantor?: boolean
  guarantorName?: string | null
  guarantorTaxId?: string | null
  guarantorPhone?: string | null
  guarantorAddress?: string | null

  collateralType?: string | null
  collateralValue?: number | null
  collateralNotes?: string | null

  // NUEVO: Notas y observaciones
  notes?: string | null
  clientInstructions?: string | null

  // NUEVO: Generación de documentos
  sendEmailOnCreate?: boolean
  generateContract?: boolean

  applicationId?: string // Si viene de una solicitud
}

export class LoanService {
  private static buildLoanAuditSnapshot(
    loan: {
      id: string
      loanNumber: string
      clientId: string
      principalAmount: number | Prisma.Decimal
      amortizationType: AmortizationType
      interestType: InterestType
      interestRate: number | Prisma.Decimal
      fixedInterestAmount: number | Prisma.Decimal | null
      termMonths: number
      paymentFrequency: PaymentFrequency
      disbursementDate: Date
      firstDueDate: Date
      finalDueDate: Date
      status: LoanStatus
      totalInterest: number | Prisma.Decimal
    },
    installments?: Array<{
      installmentNumber: number
      dueDate: Date
      principalAmount: number
      interestAmount: number
      totalAmount: number
      pendingAmount: number
    }>
  ): Prisma.InputJsonObject {
    return {
      id: loan.id,
      loanNumber: loan.loanNumber,
      clientId: loan.clientId,
      principalAmount: Number(loan.principalAmount),
      amortizationType: loan.amortizationType,
      interestType: loan.interestType,
      interestRate: Number(loan.interestRate),
      fixedInterestAmount: loan.fixedInterestAmount ? Number(loan.fixedInterestAmount) : null,
      termMonths: loan.termMonths,
      paymentFrequency: loan.paymentFrequency,
      disbursementDate: loan.disbursementDate.toISOString(),
      firstDueDate: loan.firstDueDate.toISOString(),
      finalDueDate: loan.finalDueDate.toISOString(),
      status: loan.status,
      totalInterest: Number(loan.totalInterest),
      installments:
        installments?.map(installment => ({
          installmentNumber: installment.installmentNumber,
          dueDate: installment.dueDate.toISOString(),
          principalAmount: installment.principalAmount,
          interestAmount: installment.interestAmount,
          totalAmount: installment.totalAmount,
          pendingAmount: installment.pendingAmount,
        })) ?? [],
    }
  }

  /**
   * Generar número único de préstamo
   */
  static async generateLoanNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const count = await prisma.loan.count({
      where: {
        loanNumber: {
          startsWith: `PRE-${year}-`,
        },
      },
    })
    const nextNumber = (count + 1).toString().padStart(3, '0')
    return `PRE-${year}-${nextNumber}`
  }

  /**
   * Obtener todos los préstamos con filtros
   */
  static async getAll(filters?: {
    status?: LoanStatus
    clientId?: string
  }) {
    const where: Prisma.LoanWhereInput = {}

    if (filters?.status) where.status = filters.status
    if (filters?.clientId) where.clientId = filters.clientId

    const loans = await prisma.loan.findMany({
      where,
      include: {
        client: {
          include: {
            individualProfile: true,
            businessProfile: true,
          },
        },
        creator: true,
        installments: {
          select: {
            pendingAmount: true,
          },
        },
        _count: {
          select: {
            installments: true,
            payments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Agregar campo calculado para el total pendiente
    return loans.map(loan => ({
      ...loan,
      totalPending: loan.installments.reduce(
        (sum, inst) => sum + Number(inst.pendingAmount),
        0
      ),
    }))
  }

  /**
   * Obtener préstamo por ID con detalles completos
   */
  static async getById(id: string) {
    return await prisma.loan.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            individualProfile: true,
            businessProfile: true,
          },
        },
        creator: true,
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
        payments: {
          include: {
            allocations: true,
          },
          orderBy: { paidAt: 'desc' },
        },
      },
    })
  }

  /**
   * Crear nuevo préstamo con cronograma automático
   */
  static async create(data: CreateLoanData, userId: string) {
    const sourceApplication = data.applicationId
      ? await prisma.creditApplication.findUnique({
          where: { id: data.applicationId },
        })
      : null

    if (data.applicationId && !sourceApplication) {
      throw new Error('Solicitud de crédito no encontrada')
    }

    if (sourceApplication && sourceApplication.status !== 'APPROVED') {
      throw new Error('Solo se pueden desembolsar solicitudes aprobadas')
    }

    if (sourceApplication && sourceApplication.clientId !== data.clientId) {
      throw new Error('La solicitud no corresponde al cliente seleccionado')
    }

    // Verificar cliente existe
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
    })

    if (!client) {
      throw new Error('Cliente no encontrado')
    }

    // Verificar cupo disponible
    const totalExposure = await prisma.loan.aggregate({
      where: {
        clientId: data.clientId,
        status: 'ACTIVE',
      },
      _sum: {
        outstandingPrincipal: true,
      },
    })

    const exposure = Number(totalExposure._sum.outstandingPrincipal || 0)
    const availableCredit = Number(client.creditLimit) - exposure

    if (data.principalAmount > availableCredit) {
      throw new Error(
        `Monto solicitado excede el cupo disponible (${availableCredit.toFixed(2)}€)`
      )
    }

    // Generar número de préstamo
    const loanNumber = await this.generateLoanNumber()

    // NUEVO: Generar cronograma según tipo de amortización
    const amortizationType = data.amortizationType || 'AMERICAN' // Default: Americano (99% de casos)
    const storedInterestRate = normalizeInterestRateForStorage(
      data.interestRate,
      data.interestType
    )
    const calculationInterestRate = normalizeInterestRateForInput(
      storedInterestRate,
      data.interestType
    )

    const { installments, summary } = calculateLoanSummary({
      principalAmount: data.principalAmount,
      amortizationType,
      interestType: data.interestType,
      interestRate: calculationInterestRate,
      fixedInterestAmount: data.fixedInterestAmount || undefined,
      termMonths: data.termMonths,
      paymentFrequency: data.paymentFrequency,
      firstDueDate: data.firstDueDate,
    })

    const totalInterest = summary.totalInterest
    const finalDueDate = installments[installments.length - 1].dueDate

    // Crear préstamo con cuotas en una transacción
    const loan = await prisma.$transaction(async tx => {
      const newLoan = await tx.loan.create({
        data: {
          loanNumber,
          clientId: data.clientId,
          principalAmount: data.principalAmount,
          outstandingPrincipal: data.principalAmount,

          // NUEVO: Tipo de amortización
          amortizationType,

          interestType: data.interestType,
          interestRate: storedInterestRate,
          fixedInterestAmount: data.fixedInterestAmount,
          termMonths: data.termMonths,
          paymentFrequency: data.paymentFrequency,

          // NUEVO: Días de pago
          allowSaturdayPayments: data.allowSaturdayPayments ?? true,
          allowSundayPayments: data.allowSundayPayments ?? true,

          disbursementDate: data.disbursementDate,
          firstDueDate: data.firstDueDate,
          finalDueDate,
          status: 'ACTIVE',
          totalInterest,
          totalPaid: 0,
          totalPenalty: 0,

          // NUEVO: Garantes
          hasGuarantor: data.hasGuarantor ?? false,
          guarantorName: data.guarantorName,
          guarantorTaxId: data.guarantorTaxId,
          guarantorPhone: data.guarantorPhone,
          guarantorAddress: data.guarantorAddress,

          collateralType: data.collateralType,
          collateralValue: data.collateralValue,
          collateralNotes: data.collateralNotes,

          // NUEVO: Notas
          notes: data.notes,
          clientInstructions: data.clientInstructions,

          // NUEVO: Documentos
          sendEmailOnCreate: data.sendEmailOnCreate ?? true,
          contractGenerated: false, // Se genera después

          createdBy: userId,
        },
      })

      // Crear todas las cuotas
      await tx.installment.createMany({
        data: installments.map(inst => ({
          loanId: newLoan.id,
          installmentNumber: inst.installmentNumber,
          dueDate: inst.dueDate,
          principalAmount: inst.principalAmount,
          interestAmount: inst.interestAmount,
          totalAmount: inst.totalAmount,
          paidAmount: 0,
          pendingAmount: inst.pendingAmount,
          status: 'PENDING',
        })),
      })

      // Si viene de una solicitud aprobada, marcarla como desembolsada y auditar el cierre del flujo
      if (data.applicationId && sourceApplication) {
        await tx.creditApplication.update({
          where: { id: sourceApplication.id },
          data: { status: 'DISBURSED' },
        })

        await tx.auditLog.create({
          data: {
            userId,
            action: 'DISBURSE',
            entityType: 'credit_applications',
            entityId: sourceApplication.id,
            oldValue: { status: sourceApplication.status },
            newValue: {
              status: 'DISBURSED',
              loanId: newLoan.id,
              loanNumber: newLoan.loanNumber,
            },
          },
        })
      }

      return newLoan
    })

    // Auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entityType: 'loans',
        entityId: loan.id,
        newValue: {
          ...this.buildLoanAuditSnapshot(loan, installments),
          sourceApplicationId: data.applicationId || null,
        },
      },
    })

    return loan
  }

  /**
   * Actualizar estado del préstamo
   */
  static async updateStatus(id: string, status: LoanStatus, userId: string) {
    const loan = await this.getById(id)
    if (!loan) throw new Error('Préstamo no encontrado')

    const updated = await prisma.loan.update({
      where: { id },
      data: { status },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_STATUS',
        entityType: 'loans',
        entityId: id,
        oldValue: { status: loan.status },
        newValue: { status },
      },
    })

    return updated
  }

  /**
   * Recalcular totales del préstamo
   */
  static async recalculateTotals(loanId: string) {
    const loan = await this.getById(loanId)
    if (!loan) throw new Error('Préstamo no encontrado')

    const totals = loan.installments.reduce(
      (summary, installment) => {
        const balances = getInstallmentComponentBalances(installment)

        summary.totalPaid += Number(installment.paidAmount || 0)
        summary.outstandingPrincipal += balances.pendingPrincipal
        summary.totalPenalty += balances.pendingPenalty

        return summary
      },
      {
        totalPaid: 0,
        outstandingPrincipal: 0,
        totalPenalty: 0,
      }
    )

    // Verificar si todas las cuotas están pagadas
    const allInstallmentsPaid = loan.installments.every(inst => inst.status === 'PAID')

    // Determinar nuevo estado
    let newStatus = loan.status
    if (allInstallmentsPaid) {
      newStatus = 'PAID'
    } else if (loan.status === 'PAID') {
      // Si estaba completado pero se agregaron nuevas cuotas (prórroga), volver a ACTIVE
      newStatus = 'ACTIVE'
    }

    // Actualizar préstamo
    await prisma.loan.update({
      where: { id: loanId },
      data: {
        outstandingPrincipal: Number(Math.max(0, totals.outstandingPrincipal).toFixed(2)),
        totalPaid: Number(totals.totalPaid.toFixed(2)),
        totalPenalty: Number(Math.max(0, totals.totalPenalty).toFixed(2)),
        status: newStatus,
      },
    })
  }
}
