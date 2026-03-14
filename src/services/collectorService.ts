/**
 * Collector Service - Gestión de Cobradores y KPIs
 *
 * Funcionalidades:
 * - Asignar/desasignar préstamos a cobradores
 * - Calcular KPIs de rendimiento
 * - Obtener rankings y estadísticas
 */

import { prisma } from '@/lib/prisma'
import { Prisma, UserRole } from '@prisma/client'

export interface CollectorKPIs {
  collectorId: string
  collectorName: string
  collectorEmail: string

  // Casos
  totalAssignedLoans: number
  activeLoans: number
  paidLoans: number
  defaultedLoans: number

  // Montos
  totalAssignedAmount: number
  totalCollected: number
  totalPending: number

  // Rendimiento
  successRate: number // % de préstamos pagados
  collectionRate: number // % del monto cobrado vs asignado
  averageDaysToCollect: number

  // Detalle temporal
  collectedThisMonth: number
  collectedLastMonth: number
}

export interface CollectorLoan {
  loanId: string
  loanNumber: string
  clientName: string
  clientTaxId: string
  principalAmount: number
  outstandingPrincipal: number
  totalPaid: number
  status: string
  disbursementDate: Date
  daysOverdue: number
  assignedAt: Date
}

export class CollectorService {
  /**
   * Asignar préstamo a cobrador
   */
  static async assignLoanToCollector(loanId: string, collectorId: string) {
    // Verificar que el usuario sea cobrador o admin
    const collector = await prisma.collector.findUnique({
      where: { id: collectorId },
    })

    if (!collector) {
      throw new Error('Cobrador no encontrado')
    }

    if (!collector.isActive) {
      throw new Error('El cobrador no está activo')
    }

    // Verificar que el préstamo existe
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
    })

    if (!loan) {
      throw new Error('Préstamo no encontrado')
    }

    // Asignar
    const updated = await prisma.loan.update({
      where: { id: loanId },
      data: {
        collectorId: collectorId,
        updatedAt: new Date(),
      },
      include: {
        client: {
          include: {
            individualProfile: true,
            businessProfile: true,
          },
        },
        collector: true,
      },
    })

    return updated
  }

  /**
   * Desasignar préstamo de cobrador
   */
  static async unassignLoanFromCollector(loanId: string) {
    const updated = await prisma.loan.update({
      where: { id: loanId },
      data: {
        collectorId: null,
        updatedAt: new Date(),
      },
    })

    return updated
  }

  /**
   * Asignar múltiples préstamos a un cobrador
   */
  static async assignMultipleLoans(loanIds: string[], collectorId: string) {
    const results = await Promise.all(
      loanIds.map(loanId => this.assignLoanToCollector(loanId, collectorId))
    )
    return results
  }

  /**
    return collectors
  }

  /**
   * Obtener préstamos asignados a un cobrador
   */
  static async getCollectorLoans(
    collectorId: string,
    status?: 'ACTIVE' | 'PAID' | 'DEFAULTED'
  ): Promise<CollectorLoan[]> {
    const where: Prisma.LoanWhereInput = {
      collectorId: collectorId,
    }

    if (status) {
      where.status = status
    }

    const loans = await prisma.loan.findMany({
      where,
      include: {
        client: {
          include: {
            individualProfile: true,
            businessProfile: true,
          },
        },
        installments: {
          where: {
            status: {
              in: ['PENDING', 'OVERDUE', 'PARTIAL'],
            },
          },
          orderBy: {
            dueDate: 'asc',
          },
          take: 1,
        },
      },
      orderBy: {
        disbursementDate: 'desc',
      },
    })

    return loans.map(loan => {
      const clientName =
        loan.client.type === 'INDIVIDUAL'
          ? `${loan.client.individualProfile?.firstName} ${loan.client.individualProfile?.lastName}`
          : loan.client.businessProfile?.businessName || 'Sin nombre'

      const clientTaxId =
        loan.client.type === 'INDIVIDUAL'
          ? loan.client.individualProfile?.taxId || ''
          : loan.client.businessProfile?.taxId || ''

      // Calcular días de mora
      const oldestInstallment = loan.installments[0]
      const daysOverdue = oldestInstallment
        ? Math.max(
            0,
            Math.floor(
              (new Date().getTime() - new Date(oldestInstallment.dueDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
        : 0

      return {
        loanId: loan.id,
        loanNumber: loan.loanNumber,
        clientName,
        clientTaxId,
        principalAmount: Number(loan.principalAmount),
        outstandingPrincipal: Number(loan.outstandingPrincipal),
        totalPaid: Number(loan.totalPaid),
        status: loan.status,
        disbursementDate: loan.disbursementDate,
        daysOverdue,
        assignedAt: loan.updatedAt, // Asumimos que updatedAt es cuando se asignó
      }
    })
  }

  /**
   * Obtener KPIs de un cobrador
   */
  static async getCollectorKPIs(
    collectorId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CollectorKPIs> {
    const collector = await prisma.collector.findUnique({
      where: { id: collectorId },
    })

    if (!collector) {
      throw new Error('Cobrador no encontrado')
    }

    // Obtener préstamos asignados
    const loans = await prisma.loan.findMany({
      where: {
        collectorId: collectorId,
      },
      include: {
        payments: {
          where: startDate && endDate
            ? {
                paidAt: {
                  gte: startDate,
                  lte: endDate,
                },
              }
            : undefined,
        },
      },
    })

    // Calcular métricas
    const totalAssignedLoans = loans.length
    const activeLoans = loans.filter(l => l.status === 'ACTIVE').length
    const paidLoans = loans.filter(l => l.status === 'PAID').length
    const defaultedLoans = loans.filter(l => l.status === 'DEFAULTED').length

    const totalAssignedAmount = loans.reduce(
      (sum, l) => sum + Number(l.principalAmount),
      0
    )

    const totalCollected = loans.reduce((sum, l) => sum + Number(l.totalPaid), 0)

    const totalPending = loans.reduce(
      (sum, l) => sum + Number(l.outstandingPrincipal),
      0
    )

    const successRate = totalAssignedLoans > 0 ? (paidLoans / totalAssignedLoans) * 100 : 0

    const collectionRate =
      totalAssignedAmount > 0 ? (totalCollected / totalAssignedAmount) * 100 : 0

    // Calcular días promedio de cobro (solo préstamos pagados)
    const paidLoansData = loans.filter(l => l.status === 'PAID')
    const averageDaysToCollect =
      paidLoansData.length > 0
        ? paidLoansData.reduce((sum, loan) => {
            const days = Math.floor(
              (loan.updatedAt.getTime() - loan.disbursementDate.getTime()) /
                (1000 * 60 * 60 * 24)
            )
            return sum + days
          }, 0) / paidLoansData.length
        : 0

    // Monto cobrado este mes
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    const paymentsThisMonth = await prisma.payment.findMany({
      where: {
        loan: {
          collectorId: collectorId,
        },
        paidAt: {
          gte: startOfMonth,
        },
      },
    })

    const paymentsLastMonth = await prisma.payment.findMany({
      where: {
        loan: {
          collectorId: collectorId,
        },
        paidAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    })

    const collectedThisMonth = paymentsThisMonth.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    )

    const collectedLastMonth = paymentsLastMonth.reduce(
      (sum, p) => sum + Number(p.amount),
      0
    )

    return {
      collectorId: collector.id,
      collectorName: collector.name,
      collectorEmail: collector.email,
      totalAssignedLoans,
      activeLoans,
      paidLoans,
      defaultedLoans,
      totalAssignedAmount,
      totalCollected,
      totalPending,
      successRate,
      collectionRate,
      averageDaysToCollect,
      collectedThisMonth,
      collectedLastMonth,
    }
  }

  /**
   * Obtener ranking de todos los cobradores
   */
  static async getCollectorPerformance(startDate?: Date, endDate?: Date) {
    const collectors = await prisma.collector.findMany({ where: { isActive: true } })

    const performance = await Promise.all(
      collectors.map(async collector => {
        const kpis = await this.getCollectorKPIs(collector.id, startDate, endDate)
        return {
          ...collector,
          kpis,
        }
      })
    )

    // Ordenar por tasa de éxito descendente
    return performance.sort((a, b) => b.kpis.successRate - a.kpis.successRate)
  }

  /**
   * Obtener préstamos sin asignar (disponibles para asignación)
   */
  static async getUnassignedLoans(includeAllStatuses = false) {
    const where: Prisma.LoanWhereInput = {
      collectorId: null,
    }

    if (!includeAllStatuses) {
      where.status = {
        in: ['ACTIVE', 'DEFAULTED'],
      }
    }

    const loans = await prisma.loan.findMany({
      where,
      include: {
        client: {
          include: {
            individualProfile: true,
            businessProfile: true,
          },
        },
        installments: {
          where: {
            status: {
              in: ['PENDING', 'OVERDUE', 'PARTIAL'],
            },
          },
          orderBy: {
            dueDate: 'asc',
          },
        },
      },
      orderBy: {
        disbursementDate: 'desc',
      },
    })

    return loans.map(loan => {
      const clientName =
        loan.client.type === 'INDIVIDUAL'
          ? `${loan.client.individualProfile?.firstName} ${loan.client.individualProfile?.lastName}`
          : loan.client.businessProfile?.businessName || 'Sin nombre'

      const overdueInstallments = loan.installments.filter(i => i.status === 'OVERDUE').length

      return {
        id: loan.id,
        loanNumber: loan.loanNumber,
        clientName,
        principalAmount: Number(loan.principalAmount),
        outstandingPrincipal: Number(loan.outstandingPrincipal),
        status: loan.status,
        disbursementDate: loan.disbursementDate,
        overdueInstallments,
      }
    })
  }
}
