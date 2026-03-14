import { prisma } from '@/lib/prisma'
import { differenceInDays } from 'date-fns'
import { decryptSafe } from '@/lib/security/encryption'
import { getOverdueInstallmentWhere } from '@/lib/utils/installmentStatus'
import {
  CollectionActionType,
  CollectionResult,
  Prisma,
} from '@prisma/client'

/**
 * Servicio especializado para Dashboard de Cobranza
 *
 * Prioriza gestiones por:
 * - Días de atraso (peso: 40%)
 * - Monto vencido (peso: 30%)
 * - Intentos fallidos (peso: 20%)
 * - Promesas rotas (peso: 10%)
 */

export interface CollectionPriority {
  clientId: string
  clientName: string
  loanId: string
  loanNumber: string
  phone: string
  daysOverdue: number
  overdueAmount: number
  lastContactDate?: Date
  lastContactResult?: string
  failedAttempts: number
  brokenPromises: number
  priorityScore: number
  priorityLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  suggestedAction: string
}

export interface CollectionMetrics {
  totalOverdue: number
  totalOverdueAmount: number
  criticalCases: number // >90 días
  highPriorityCases: number // 31-90 días
  mediumPriorityCases: number // 8-30 días
  lowPriorityCases: number // 1-7 días
  promisesDueToday: number
  promisesDueTomorrow: number
  assignedToMe: number
  contactabilityRate: number
  promiseComplianceRate: number
}

export class CollectionDashboardService {
  private static buildCollectionActionAuditSnapshot(
    action: {
      id: string
      clientId: string
      loanId: string | null
      actionType: CollectionActionType
      status: string
      result: CollectionResult | null
      description: string
      notes: string | null
      assignedTo: string | null
      completedBy: string | null
      actionDate: Date
      completedAt: Date | null
      createdAt: Date
      updatedAt: Date
    }
  ): Prisma.InputJsonObject {
    return {
      id: action.id,
      clientId: action.clientId,
      loanId: action.loanId,
      actionType: action.actionType,
      status: action.status,
      result: action.result,
      description: action.description,
      notes: action.notes,
      assignedTo: action.assignedTo,
      completedBy: action.completedBy,
      actionDate: action.actionDate.toISOString(),
      completedAt: action.completedAt?.toISOString() ?? null,
      createdAt: action.createdAt.toISOString(),
      updatedAt: action.updatedAt.toISOString(),
    }
  }

  /**
   * Obtener métricas del dashboard de cobranza
   */
  static async getMetrics(userId?: string): Promise<CollectionMetrics> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const overdueInstallmentWhere = getOverdueInstallmentWhere(today)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Obtener cuotas vencidas
    const overdueInstallments = await prisma.installment.findMany({
      where: overdueInstallmentWhere,
      include: {
        loan: {
          include: {
            client: true,
          },
        },
      },
    })

    const totalOverdue = overdueInstallments.length
    const totalOverdueAmount = overdueInstallments.reduce(
      (sum, inst) => sum + Number(inst.pendingAmount),
      0
    )

    // Categorizar por días de atraso
    let criticalCases = 0
    let highPriorityCases = 0
    let mediumPriorityCases = 0
    let lowPriorityCases = 0

    overdueInstallments.forEach(inst => {
      const daysOverdue = differenceInDays(new Date(), inst.dueDate)
      if (daysOverdue > 90) criticalCases++
      else if (daysOverdue > 30) highPriorityCases++
      else if (daysOverdue > 7) mediumPriorityCases++
      else lowPriorityCases++
    })

    // Promesas de pago
    const [promisesDueToday, promisesDueTomorrow] = await Promise.all([
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
    ])

    // Gestiones asignadas
    const assignedToMe = userId
      ? await prisma.collectionAction.count({
          where: {
            assignedTo: userId,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
        })
      : 0

    // Tasa de contactabilidad (últimos 30 días)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentActions = await prisma.collectionAction.findMany({
      where: {
        actionDate: { gte: thirtyDaysAgo },
        actionType: { in: ['CALL', 'VISIT'] },
      },
    })

    const contactedActions = recentActions.filter(
      a =>
        a.result &&
        !['NO_ANSWER', 'PHONE_OFF', 'WRONG_NUMBER'].includes(a.result)
    ).length

    const contactabilityRate =
      recentActions.length > 0 ? (contactedActions / recentActions.length) * 100 : 0

    // Tasa de cumplimiento de promesas
    const recentPromises = await prisma.paymentPromise.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ['KEPT', 'BROKEN'] },
      },
    })

    const keptPromises = recentPromises.filter(p => p.status === 'KEPT').length
    const promiseComplianceRate =
      recentPromises.length > 0 ? (keptPromises / recentPromises.length) * 100 : 0

    return {
      totalOverdue,
      totalOverdueAmount,
      criticalCases,
      highPriorityCases,
      mediumPriorityCases,
      lowPriorityCases,
      promisesDueToday,
      promisesDueTomorrow,
      assignedToMe,
      contactabilityRate,
      promiseComplianceRate,
    }
  }

  /**
   * Obtener lista priorizada de casos para cobrar
   */
  static async getPrioritizedCases(userId?: string, limit: number = 50): Promise<CollectionPriority[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const overdueInstallmentWhere = getOverdueInstallmentWhere(today)

    // Obtener préstamos con mora
    const loansInArrears = await prisma.loan.findMany({
      where: {
        status: { in: ['ACTIVE', 'DEFAULTED'] },
        installments: {
          some: overdueInstallmentWhere,
        },
      },
      include: {
        client: {
          include: {
            individualProfile: true,
            businessProfile: true,
          },
        },
        installments: {
          where: overdueInstallmentWhere,
          orderBy: {
            dueDate: 'asc',
          },
        },
        payments: {
          orderBy: {
            paidAt: 'desc',
          },
          take: 1,
        },
      },
    })

    const cases: CollectionPriority[] = []

    for (const loan of loansInArrears) {
      const oldestOverdueInstallment = loan.installments[0]
      if (!oldestOverdueInstallment) continue

      const daysOverdue = differenceInDays(today, oldestOverdueInstallment.dueDate)
      const overdueAmount = loan.installments.reduce(
        (sum, inst) => sum + Number(inst.pendingAmount),
        0
      )

      // Obtener gestiones previas
      const collectionActions = await prisma.collectionAction.findMany({
        where: {
          loanId: loan.id,
        },
        orderBy: {
          actionDate: 'desc',
        },
      })

      const lastContact = collectionActions[0]
      const failedAttempts = collectionActions.filter(
        a =>
          a.result &&
          ['NO_ANSWER', 'PHONE_OFF', 'WRONG_NUMBER', 'HOSTILE'].includes(a.result)
      ).length

      // Promesas rotas del préstamo
      const brokenPromises = await prisma.paymentPromise.count({
        where: {
          loanId: loan.id,
          status: 'BROKEN',
        },
      })

      // Calcular score de prioridad (0-100)
      const daysScore = Math.min((daysOverdue / 90) * 40, 40) // Max 40 puntos
      const amountScore = Math.min((overdueAmount / 5000) * 30, 30) // Max 30 puntos
      const attemptsScore = Math.min(failedAttempts * 4, 20) // Max 20 puntos
      const promisesScore = Math.min(brokenPromises * 5, 10) // Max 10 puntos

      const priorityScore = Math.round(daysScore + amountScore + attemptsScore + promisesScore)

      // Determinar nivel de prioridad
      let priorityLevel: CollectionPriority['priorityLevel']
      if (priorityScore >= 80 || daysOverdue > 90) priorityLevel = 'CRITICAL'
      else if (priorityScore >= 60 || daysOverdue > 30) priorityLevel = 'HIGH'
      else if (priorityScore >= 40 || daysOverdue > 7) priorityLevel = 'MEDIUM'
      else priorityLevel = 'LOW'

      // Sugerir acción
      let suggestedAction = 'Llamada telefónica'
      if (failedAttempts >= 3) suggestedAction = 'Visita domiciliaria'
      if (daysOverdue > 90) suggestedAction = 'Notificación legal'
      if (brokenPromises >= 2) suggestedAction = 'Reestructuración'

      const clientName =
        loan.client.type === 'INDIVIDUAL'
          ? `${loan.client.individualProfile?.firstName} ${loan.client.individualProfile?.lastName}`
          : loan.client.businessProfile?.businessName || 'Cliente'

      cases.push({
        clientId: loan.client.id,
        clientName,
        loanId: loan.id,
        loanNumber: loan.loanNumber,
        phone: decryptSafe(loan.client.phone),
        daysOverdue,
        overdueAmount,
        lastContactDate: lastContact?.actionDate,
        lastContactResult: lastContact?.result || undefined,
        failedAttempts,
        brokenPromises,
        priorityScore,
        priorityLevel,
        suggestedAction,
      })
    }

    // Ordenar por score descendente
    cases.sort((a, b) => b.priorityScore - a.priorityScore)

    return cases.slice(0, limit)
  }

  /**
   * Obtener promesas que vencen hoy
   */
  static async getPromisesDueToday() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return await prisma.paymentPromise.findMany({
      where: {
        status: 'PENDING',
        promiseDate: { gte: today, lt: tomorrow },
      },
      include: {
        client: {
          include: {
            individualProfile: true,
            businessProfile: true,
          },
        },
      },
      orderBy: {
        promisedAmount: 'desc',
      },
    })
  }

  /**
   * Obtener mis gestiones pendientes
   */
  static async getMyPendingActions(userId: string) {
    return await prisma.collectionAction.findMany({
      where: {
        assignedTo: userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      include: {
        client: {
          include: {
            individualProfile: true,
            businessProfile: true,
          },
        },
      },
      orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'asc' }],
    })
  }

  /**
   * Quick action: Registrar gestión rápida
   */
  static async quickCollectionAction(
    clientId: string,
    loanId: string | null | undefined,
    actionType: CollectionActionType,
    result: CollectionResult,
    notes: string,
    userId: string
  ) {
    const action = await prisma.collectionAction.create({
      data: {
        clientId,
        loanId: loanId || null,
        actionType,
        status: 'COMPLETED',
        result,
        description: `Gestión rápida: ${actionType}`,
        notes,
        assignedTo: userId,
        completedBy: userId,
        actionDate: new Date(),
        completedAt: new Date(),
      },
    })

    // Auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'COLLECTION_ACTION',
        entityType: 'collection_actions',
        entityId: action.id,
        newValue: this.buildCollectionActionAuditSnapshot(action),
      },
    })

    return action
  }
}
