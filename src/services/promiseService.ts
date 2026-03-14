import { prisma } from '@/lib/prisma'
import { ParameterService } from './parameterService'
import type { PaymentPromise, Prisma, PromiseStatus } from '@prisma/client'
import { differenceInDays } from 'date-fns'

export interface CreatePromiseData {
  clientId: string
  loanId?: string
  promiseDate: Date
  promisedAmount: number
  notes?: string
  collectionActionId?: string  // Vinculado a una gestión de cobranza
}

export class PromiseService {
  private static buildPromiseAuditSnapshot(promise: PaymentPromise): Prisma.InputJsonObject {
    return {
      id: promise.id,
      clientId: promise.clientId,
      loanId: promise.loanId,
      promiseDate: promise.promiseDate.toISOString(),
      promisedAmount: Number(promise.promisedAmount),
      status: promise.status,
      actualPaidDate: promise.actualPaidDate ? promise.actualPaidDate.toISOString() : null,
      actualPaidAmount: promise.actualPaidAmount ? Number(promise.actualPaidAmount) : null,
      notes: promise.notes,
      createdAt: promise.createdAt.toISOString(),
      updatedAt: promise.updatedAt.toISOString(),
    }
  }

  /**
   * Crear promesa de pago
   */
  static async create(data: CreatePromiseData, userId: string) {
    // Verificar si el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      include: {
        paymentPromises: {
          where: {
            status: 'PENDING',
            loanId: data.loanId || undefined,
          },
        },
      },
    })

    if (!client) {
      throw new Error('Cliente no encontrado')
    }

    // Verificar límite de promesas según parámetros
    const maxPromises = await ParameterService.getOrDefault<number>('max_promise_extensions', 3)

    const pendingPromises = client.paymentPromises.length
    if (pendingPromises >= maxPromises) {
      throw new Error(
        `El cliente ya tiene ${pendingPromises} promesas pendientes. Máximo permitido: ${maxPromises}`
      )
    }

    // Si hay un préstamo específico, verificar que existe y está activo
    if (data.loanId) {
      const loan = await prisma.loan.findUnique({
        where: { id: data.loanId },
      })

      if (!loan) {
        throw new Error('Préstamo no encontrado')
      }

      if (loan.status !== 'ACTIVE' && loan.status !== 'DEFAULTED') {
        throw new Error('El préstamo no está activo')
      }
    }

    // Crear la promesa
    const promise = await prisma.paymentPromise.create({
      data: {
        clientId: data.clientId,
        loanId: data.loanId,
        promiseDate: data.promiseDate,
        promisedAmount: data.promisedAmount,
        status: 'PENDING',
        notes: data.notes,
      },
    })

    // Auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PROMISE_CREATED',
        entityType: 'payment_promises',
        entityId: promise.id,
        newValue: this.buildPromiseAuditSnapshot(promise),
      },
    })

    return promise
  }

  /**
   * Verificar cumplimiento de promesas vencidas
   */
  static async checkOverduePromises() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const overduePromises = await prisma.paymentPromise.findMany({
      where: {
        status: 'PENDING',
        promiseDate: {
          lt: today,
        },
      },
      include: {
        client: {
          include: {
            individualProfile: true,
            businessProfile: true,
          },
        },
      },
    })

    const results = []

    for (const promise of overduePromises) {
      // Verificar si se recibió pago en la fecha prometida o después
      const paymentReceived = promise.loanId
        ? await prisma.payment.findFirst({
            where: {
              loanId: promise.loanId,
              paidAt: {
                gte: promise.promiseDate,
              },
              amount: {
                gte: promise.promisedAmount,
              },
            },
            orderBy: {
              paidAt: 'asc',
            },
          })
        : null

      if (paymentReceived) {
        // Promesa cumplida
        await this.markAsKept(promise.id, paymentReceived.id)
        results.push({
          promiseId: promise.id,
          status: 'KEPT',
          paymentId: paymentReceived.id,
        })
      } else {
        // Verificar si pasó el tiempo de gracia (ej: 2 días)
        const daysOverdue = differenceInDays(today, promise.promiseDate)
        if (daysOverdue >= 2) {
          await this.markAsBroken(promise.id, 'No se recibió pago en la fecha prometida')
          results.push({
            promiseId: promise.id,
            status: 'BROKEN',
            daysOverdue,
          })

          // Crear acción de cobranza automática
          await prisma.collectionAction.create({
            data: {
              clientId: promise.clientId,
              loanId: promise.loanId,
              actionType: 'PROMISE_FOLLOWUP',
              description: `Seguimiento por promesa incumplida del ${promise.promiseDate.toLocaleDateString('es-ES')}`,
              notes: `Promesa de ${promise.promisedAmount} EUR no cumplida`,
              status: 'PENDING',
            },
          })
        }
      }
    }

    return results
  }

  /**
   * Marcar promesa como cumplida
   */
  static async markAsKept(promiseId: string, paymentId?: string) {
    const promise = await prisma.paymentPromise.findUnique({
      where: { id: promiseId },
    })

    if (!promise) {
      throw new Error('Promesa no encontrada')
    }

    const payment = paymentId
      ? await prisma.payment.findUnique({ where: { id: paymentId } })
      : null

    const updated = await prisma.paymentPromise.update({
      where: { id: promiseId },
      data: {
        status: 'KEPT',
        actualPaidDate: payment?.paidAt || new Date(),
        actualPaidAmount: payment?.amount,
      },
    })

    return updated
  }

  /**
   * Marcar promesa como rota
   */
  static async markAsBroken(promiseId: string, reason: string) {
    const promise = await prisma.paymentPromise.findUnique({
      where: { id: promiseId },
    })

    if (!promise) {
      throw new Error('Promesa no encontrada')
    }

    const updated = await prisma.paymentPromise.update({
      where: { id: promiseId },
      data: {
        status: 'BROKEN',
        notes: promise.notes
          ? `${promise.notes}\n\nRoto: ${reason}`
          : `Roto: ${reason}`,
      },
    })

    // Auditoría de promesa rota (crítico para seguimiento)
    await prisma.auditLog.create({
      data: {
        action: 'PROMISE_BROKEN',
        entityType: 'payment_promises',
        entityId: promiseId,
        oldValue: this.buildPromiseAuditSnapshot(promise),
        newValue: { status: 'BROKEN', reason },
      },
    })

    return updated
  }

  /**
   * Renegociar promesa
   */
  static async renegotiate(
    promiseId: string,
    newDate: Date,
    newAmount?: number,
    userId?: string
  ) {
    const promise = await prisma.paymentPromise.findUnique({
      where: { id: promiseId },
      include: {
        client: {
          include: {
            paymentPromises: {
              where: { status: 'RENEGOTIATED' },
            },
          },
        },
      },
    })

    if (!promise) {
      throw new Error('Promesa no encontrada')
    }

    if (promise.status !== 'PENDING') {
      throw new Error('Solo se pueden renegociar promesas pendientes')
    }

    // Marcar la promesa original como renegociada
    await prisma.paymentPromise.update({
      where: { id: promiseId },
      data: {
        status: 'RENEGOTIATED',
        notes: promise.notes
          ? `${promise.notes}\n\nRenegociada el ${new Date().toLocaleDateString('es-ES')}`
          : `Renegociada el ${new Date().toLocaleDateString('es-ES')}`,
      },
    })

    // Crear nueva promesa
    const newPromise = await prisma.paymentPromise.create({
      data: {
        clientId: promise.clientId,
        loanId: promise.loanId,
        promiseDate: newDate,
        promisedAmount: newAmount || promise.promisedAmount,
        status: 'PENDING',
        notes: `Renegociada desde promesa ${promiseId}`,
      },
    })

    // Auditoría
    if (userId) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'PROMISE_CREATED',
          entityType: 'payment_promises',
          entityId: newPromise.id,
          oldValue: this.buildPromiseAuditSnapshot(promise),
          newValue: this.buildPromiseAuditSnapshot(newPromise),
        },
      })
    }

    return newPromise
  }

  /**
   * Obtener promesas de un cliente
   */
  static async getByClient(clientId: string, status?: PromiseStatus) {
    return await prisma.paymentPromise.findMany({
      where: {
        clientId,
        status: status || undefined,
      },
      orderBy: { promiseDate: 'desc' },
    })
  }

  /**
   * Obtener promesas de un préstamo
   */
  static async getByLoan(loanId: string) {
    return await prisma.paymentPromise.findMany({
      where: { loanId },
      orderBy: { promiseDate: 'desc' },
    })
  }

  /**
   * Estadísticas de cumplimiento de promesas
   */
  static async getComplianceStats(clientId?: string, startDate?: Date, endDate?: Date) {
    const where: Prisma.PaymentPromiseWhereInput = {}

    if (clientId) where.clientId = clientId

    if (startDate || endDate) {
      where.promiseDate = {}
      if (startDate) where.promiseDate.gte = startDate
      if (endDate) where.promiseDate.lte = endDate
    }

    const promises = await prisma.paymentPromise.findMany({ where })

    const total = promises.length
    const kept = promises.filter(p => p.status === 'KEPT').length
    const broken = promises.filter(p => p.status === 'BROKEN').length
    const pending = promises.filter(p => p.status === 'PENDING').length
    const renegotiated = promises.filter(p => p.status === 'RENEGOTIATED').length

    const complianceRate = total > 0 ? (kept / total) * 100 : 0

    return {
      total,
      kept,
      broken,
      pending,
      renegotiated,
      complianceRate,
    }
  }

  /**
   * Dashboard de promesas activas
   */
  static async getActiveDashboard() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const next7Days = new Date(today)
    next7Days.setDate(next7Days.getDate() + 7)

    const [overdueCount, todayCount, tomorrowCount, next7DaysCount] = await Promise.all([
      prisma.paymentPromise.count({
        where: {
          status: 'PENDING',
          promiseDate: { lt: today },
        },
      }),
      prisma.paymentPromise.count({
        where: {
          status: 'PENDING',
          promiseDate: { gte: today, lt: tomorrow },
        },
      }),
      prisma.paymentPromise.count({
        where: {
          status: 'PENDING',
          promiseDate: { gte: tomorrow, lt: new Date(tomorrow.getTime() + 86400000) },
        },
      }),
      prisma.paymentPromise.count({
        where: {
          status: 'PENDING',
          promiseDate: { gte: today, lt: next7Days },
        },
      }),
    ])

    return {
      overdue: overdueCount,
      today: todayCount,
      tomorrow: tomorrowCount,
      next7Days: next7DaysCount,
    }
  }
}
