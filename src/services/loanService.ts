import { prisma } from '@/lib/prisma'
import {
  LoanStatus,
  InterestType,
  PaymentFrequency,
  AmortizationType,
  Prisma,
} from '@prisma/client'
import { addMonths, addWeeks } from 'date-fns'
import { calculateLoanSummary } from '@/lib/calculations/amortization'
import { getInstallmentComponentBalances } from '@/lib/calculations/allocation'
import { TRANSACTION_CONFIG } from '@/lib/db/transactionConfig'
import {
  normalizeInterestRateForInput,
  normalizeInterestRateForStorage,
} from '@/lib/utils/interestRate'

/** Avanza una fecha según la frecuencia del préstamo */
function addPeriod(date: Date, frequency: PaymentFrequency, periods: number): Date {
  switch (frequency) {
    case 'WEEKLY':    return addWeeks(date, periods)
    case 'BIWEEKLY':  return addWeeks(date, periods * 2)
    case 'QUARTERLY': return addMonths(date, periods * 3)
    default:          return addMonths(date, periods) // MONTHLY
  }
}

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
   * Obtener todos los préstamos con filtros - OPTIMIZADO
   */
  static async getAll(filters?: {
    status?: LoanStatus
    clientId?: string
    page?: number
    pageSize?: number
  }) {
    const where: Prisma.LoanWhereInput = {}

    if (filters?.status) where.status = filters.status
    if (filters?.clientId) where.clientId = filters.clientId

    const page = filters?.page || 1
    const pageSize = filters?.pageSize || 20 // Reducido de 50 a 20 para carga más rápida
    const skip = (page - 1) * pageSize

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        select: {
          id: true,
          loanNumber: true,
          status: true,
          principalAmount: true,
          totalInterest: true,
          interestRate: true,
          interestType: true,
          termMonths: true,
          disbursementDate: true,
          outstandingPrincipal: true, // Ya calculado en DB
          client: {
            select: {
              type: true,
              individualProfile: {
                select: {
                  firstName: true,
                  lastName: true,
                  taxId: true,
                },
              },
              businessProfile: {
                select: {
                  businessName: true,
                  taxId: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.loan.count({ where }),
    ])

    // Usar outstandingPrincipal que ya está calculado en la DB
    const loansWithPending = loans.map(loan => ({
      ...loan,
      totalPending: Number(loan.outstandingPrincipal),
    }))

    return {
      data: loansWithPending,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
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
          take: 50, // B8: Limitar pagos para evitar N+1 en préstamos con muchos pagos
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

    // Generar número de préstamo (antes de la transacción para evitar conflictos)
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
    // La validación de cupo se hace DENTRO de la transacción para evitar race conditions
    const loan = await prisma.$transaction(async tx => {
      // Verificar cliente existe y obtener cupo (dentro de la transacción)
      const client = await tx.client.findUnique({
        where: { id: data.clientId },
      })

      if (!client) {
        throw new Error('Cliente no encontrado')
      }

      // Verificar cupo disponible (dentro de la transacción para evitar race condition)
      const totalExposure = await tx.loan.aggregate({
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
    }, TRANSACTION_CONFIG.CRITICAL)

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
   * Transiciones de estado válidas (B6 — State machine)
   */
  private static readonly VALID_TRANSITIONS: Record<LoanStatus, LoanStatus[]> = {
    ACTIVE: ['PAID', 'DEFAULTED', 'CANCELLED', 'RESTRUCTURED'],
    DEFAULTED: ['ACTIVE', 'PAID', 'CANCELLED', 'RESTRUCTURED'],
    PAID: [],                                      // Estado final
    CANCELLED: [],                                 // Estado final
    RESTRUCTURED: ['ACTIVE'],                      // Puede volver a activo
  }

  /**
   * Actualizar estado del préstamo con validación de transiciones
   */
  static async updateStatus(id: string, status: LoanStatus, userId: string) {
    const loan = await this.getById(id)
    if (!loan) throw new Error('Préstamo no encontrado')

    // Validar transición de estado (B6)
    const allowedTransitions = this.VALID_TRANSITIONS[loan.status as LoanStatus] || []
    if (!allowedTransitions.includes(status)) {
      throw new Error(
        `Transición de estado no permitida: ${loan.status} → ${status}`
      )
    }

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

  // ---------------------------------------------------------------------------
  // Edición de préstamo activo — solo ADMIN
  //
  // Campos editables:
  //   · interestRate      — nueva tasa (% humano, ej: 10)
  //   · newFirstPendingDate — nueva fecha para la primera cuota PENDIENTE
  //   · pendingMonths     — nuevo número de cuotas PENDIENTES (aumentar o reducir)
  //   · notes / clientInstructions — metadata sin recalculo
  //
  // Las cuotas PAID / PARTIAL / OVERDUE nunca se tocan.
  // loan.firstDueDate no se modifica (campo histórico).
  // Todo el recálculo financiero ocurre en una transacción CRITICAL con AuditLog.
  // ---------------------------------------------------------------------------
  static async updateLoan(
    id: string,
    data: {
      interestRate?:        number       // % humano (ej: 10 = 10%)
      newFirstPendingDate?: Date | string // fecha ISO o Date para la 1ª cuota PENDING
      pendingMonths?:       number       // cuántas cuotas PENDING deben quedar
      notes?:               string | null
      clientInstructions?:  string | null
    },
    userId: string
  ) {
    const loan = await this.getById(id)
    if (!loan) throw new Error('Préstamo no encontrado')
    if (loan.status !== 'ACTIVE') throw new Error('Solo se pueden editar préstamos activos')

    const oldInterestRate  = Number(loan.interestRate)
    const oldTotalInterest = Number(loan.totalInterest)
    const oldFinalDueDate  = loan.finalDueDate
    const oldTermMonths    = loan.termMonths

    const hasFinancialChange =
      data.interestRate        !== undefined ||
      data.newFirstPendingDate !== undefined ||
      data.pendingMonths       !== undefined

    // ── Metadata-only: notas e instrucciones ──────────────────────────────────
    if (!hasFinancialChange) {
      await prisma.loan.update({
        where: { id },
        data: {
          ...(data.notes !== undefined             && { notes: data.notes }),
          ...(data.clientInstructions !== undefined && { clientInstructions: data.clientInstructions }),
        },
      })
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          entityType: 'loans',
          entityId: id,
          oldValue: { notes: loan.notes, clientInstructions: loan.clientInstructions } as Prisma.InputJsonObject,
          newValue: { notes: data.notes ?? loan.notes, clientInstructions: data.clientInstructions ?? loan.clientInstructions } as Prisma.InputJsonObject,
        },
      })
      return await this.getById(id)
    }

    // ── Recálculo financiero ──────────────────────────────────────────────────
    const pendingInstallments = loan.installments
      .filter(inst => inst.status === 'PENDING')
      .sort((a, b) => a.installmentNumber - b.installmentNumber)

    if (pendingInstallments.length === 0) {
      throw new Error(
        'No hay cuotas PENDIENTE para recalcular. Las cuotas vencidas o parcialmente pagadas deben gestionarse manualmente.'
      )
    }

    const paidInstallments = loan.installments.filter(
      inst => inst.status === 'PAID'
    )

    // ── Parámetros resultantes del recálculo ──────────────────────────────────

    // Tasa: usar la nueva si se proporcionó, si no mantener la actual
    const newStoredRate = data.interestRate !== undefined
      ? normalizeInterestRateForStorage(data.interestRate, loan.interestType)
      : Number(loan.interestRate)
    const calcRate = normalizeInterestRateForInput(newStoredRate, loan.interestType)

    // Fecha inicial de las nuevas cuotas PENDING
    const firstPendingDueDate = data.newFirstPendingDate
      ? new Date(data.newFirstPendingDate)
      : pendingInstallments[0].dueDate

    // Número de cuotas PENDING resultantes
    const newPendingCount = data.pendingMonths !== undefined
      ? data.pendingMonths
      : pendingInstallments.length

    if (newPendingCount < 1) {
      throw new Error('Debe quedar al menos 1 cuota pendiente para poder completar el préstamo.')
    }

    const maxReducible = pendingInstallments.length
    // Permitir aumentar sin límite estricto; reducir hasta 1
    if (newPendingCount < 1 || newPendingCount > 120) {
      throw new Error('El número de cuotas pendientes debe estar entre 1 y 120.')
    }

    // Validar que la nueva fecha no sea anterior a la última cuota pagada
    if (paidInstallments.length > 0 && data.newFirstPendingDate) {
      const lastPaidDate = paidInstallments
        .sort((a, b) => a.installmentNumber - b.installmentNumber)
        .at(-1)!.dueDate
      if (firstPendingDueDate <= lastPaidDate) {
        throw new Error(
          'La nueva fecha del primer pago pendiente debe ser posterior a la última cuota ya pagada.'
        )
      }
    }

    // ── Generar nuevo cronograma PENDING con calculateLoanSummary ─────────────
    // (usa el mismo engine que la creación original para garantizar consistencia)
    const { installments: newSchedule, summary } = calculateLoanSummary({
      principalAmount:  Number(loan.outstandingPrincipal),
      amortizationType: loan.amortizationType,
      interestType:     loan.interestType,
      interestRate:     calcRate,
      termMonths:       newPendingCount,
      paymentFrequency: loan.paymentFrequency,
      firstDueDate:     firstPendingDueDate,
    })

    // Totales actualizados
    const nonPendingInterest = loan.installments
      .filter(inst => inst.status !== 'PENDING')
      .reduce((sum, inst) => sum + Number(inst.interestAmount), 0)
    const newTotalInterest = Number((nonPendingInterest + summary.totalInterest).toFixed(2))
    const newFinalDueDate  = newSchedule[newSchedule.length - 1].dueDate
    const newTermMonths    = paidInstallments.length + newPendingCount
    const firstPendingNum  = pendingInstallments[0].installmentNumber

    // ── Transacción atómica CRITICAL ─────────────────────────────────────────
    await prisma.$transaction(async tx => {
      // 1. Borrar SOLO cuotas PENDING (no tienen payment allocations — 100% seguro)
      await tx.installment.deleteMany({
        where: { loanId: id, status: 'PENDING' },
      })

      // 2. Insertar nuevo cronograma comenzando desde el mismo número de cuota
      await tx.installment.createMany({
        data: newSchedule.map((inst, idx) => ({
          loanId:            id,
          installmentNumber: firstPendingNum + idx,
          dueDate:           inst.dueDate,
          principalAmount:   inst.principalAmount,
          interestAmount:    inst.interestAmount,
          totalAmount:       inst.totalAmount,
          paidAmount:        0,
          pendingAmount:     inst.totalAmount,
          status:            'PENDING' as const,
        })),
      })

      // 3. Actualizar cabecera del préstamo
      await tx.loan.update({
        where: { id },
        data: {
          interestRate:  newStoredRate,
          totalInterest: newTotalInterest,
          finalDueDate:  newFinalDueDate,
          termMonths:    newTermMonths,
          ...(data.notes !== undefined             && { notes: data.notes }),
          ...(data.clientInstructions !== undefined && { clientInstructions: data.clientInstructions }),
        },
      })

      // 4. AuditLog dentro de la transacción — consistencia garantizada
      const oldVal: Record<string, unknown> = {
        totalInterest: oldTotalInterest,
        finalDueDate:  oldFinalDueDate?.toISOString(),
        termMonths:    oldTermMonths,
      }
      const newVal: Record<string, unknown> = {
        totalInterest:             newTotalInterest,
        finalDueDate:              newFinalDueDate.toISOString(),
        termMonths:                newTermMonths,
        pendingInstallmentsCount:  newSchedule.length,
        recalculatedFrom:          `Cuota #${firstPendingNum}`,
      }

      if (data.interestRate !== undefined) {
        oldVal.interestRate = oldInterestRate
        newVal.interestRate = newStoredRate
        newVal.interestRateHuman = `${data.interestRate}%`
      }
      if (data.newFirstPendingDate !== undefined) {
        oldVal.firstPendingDate = pendingInstallments[0].dueDate.toISOString()
        newVal.firstPendingDate = firstPendingDueDate.toISOString()
      }
      if (data.pendingMonths !== undefined) {
        oldVal.pendingInstallments = maxReducible
        newVal.pendingInstallments = newPendingCount
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          entityType: 'loans',
          entityId: id,
          oldValue: oldVal as Prisma.InputJsonObject,
          newValue: newVal as Prisma.InputJsonObject,
        },
      })
    }, TRANSACTION_CONFIG.CRITICAL)

    return await this.getById(id)
  }
}
