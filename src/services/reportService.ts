import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'
import type { LoanStatus } from '@prisma/client'
import { getOverdueInstallmentWhere } from '@/lib/utils/installmentStatus'
import { decryptSafe } from '@/lib/security/encryption'
import { normalizeInterestRateForInput } from '@/lib/utils/interestRate'

export interface PortfolioReportData {
  totalLoans: number
  totalPrincipalDisbursed: number
  totalOutstanding: number
  totalPaidPrincipal: number
  totalInterestEarned: number
  totalPenaltiesEarned: number
  activeLoans: number
  paidOffLoans: number
  defaultedLoans: number
  averageLoanAmount: number
  averageInterestRate: number
}

export interface AgingReportBucket {
  range: string
  count: number
  totalAmount: number
  percentage: number
}

export interface CollectionReportData {
  totalOverdue: number
  totalOverdueAmount: number
  byCollector: Array<{
    collectorId: string
    collectorName: string
    assignedCases: number
    collectedAmount: number
    successRate: number
  }>
  byAging: AgingReportBucket[]
}

export interface AnalystPerformanceData {
  analystId: string
  analystName: string
  loansProcessed: number
  totalDisbursed: number
  averageProcessingTime: number
  approvalRate: number
  defaultRate: number
}

export interface LoanProfitabilityReportItem {
  loanId: string
  loanNumber: string
  clientId: string
  clientName: string
  clientTaxId: string
  status: LoanStatus
  disbursementDate: Date
  originalTermMonths: number
  termMonths: number
  originalInterestRate: number
  currentInterestRate: number
  principalAmount: number
  interestProjected: number
  interestCollected: number
  penaltiesCollected: number
  totalRevenueCollected: number
  expectedRevenue: number
  monthlyProjectedRevenue: number
  monthlyCollectedRevenue: number
  extensions: Array<{
    extendedAt: Date
    previousInterestRate: number
    newInterestRate: number
    additionalMonths: number
  }>
}

function extractCollectedComponents(installment: {
  paidAmount?: unknown
  penaltyAmount?: unknown
  interestAmount?: unknown
  principalAmount?: unknown
}) {
  let remainingPaid = Number(installment.paidAmount || 0)

  const penaltyCollected = Math.min(remainingPaid, Number(installment.penaltyAmount || 0))
  remainingPaid -= penaltyCollected

  const interestCollected = Math.min(remainingPaid, Number(installment.interestAmount || 0))
  remainingPaid -= interestCollected

  const principalCollected = Math.min(remainingPaid, Number(installment.principalAmount || 0))

  return {
    penaltyCollected,
    interestCollected,
    principalCollected,
  }
}

function parseInterestRateFromAuditValue(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const interestRate = record.interestRate

  return typeof interestRate === 'number'
    ? interestRate
    : typeof interestRate === 'string'
      ? Number(interestRate)
      : null
}

function parseTermMonthsFromAuditValue(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const termMonths = record.termMonths

  return typeof termMonths === 'number'
    ? termMonths
    : typeof termMonths === 'string'
      ? Number(termMonths)
      : null
}

function parseExtensionAudit(audit: {
  createdAt: Date
  newValue: unknown
  oldValue: unknown
}) {
  if (!audit.newValue || typeof audit.newValue !== 'object') {
    return null
  }

  const newValue = audit.newValue as Record<string, unknown>
  if (newValue.action !== 'LOAN_EXTENSION') {
    return null
  }

  const oldValue = audit.oldValue && typeof audit.oldValue === 'object'
    ? (audit.oldValue as Record<string, unknown>)
    : {}

  const additionalMonths =
    typeof newValue.additionalMonths === 'number'
      ? newValue.additionalMonths
      : typeof newValue.additionalMonths === 'string'
        ? Number(newValue.additionalMonths)
        : 0

  const previousInterestRate =
    typeof oldValue.interestRate === 'number'
      ? oldValue.interestRate
      : typeof oldValue.interestRate === 'string'
        ? Number(oldValue.interestRate)
        : 0

  const newInterestRate =
    typeof newValue.interestRate === 'number'
      ? newValue.interestRate
      : typeof newValue.interestRate === 'string'
        ? Number(newValue.interestRate)
        : previousInterestRate

  return {
    extendedAt: audit.createdAt,
    previousInterestRate,
    newInterestRate,
    additionalMonths,
  }
}

export class ReportService {
  /**
   * Generar reporte de cartera completo
   */
  static async getPortfolioReport(startDate?: Date, endDate?: Date): Promise<PortfolioReportData> {
    const where = startDate && endDate
      ? {
          disbursementDate: {
            gte: startDate,
            lte: endDate,
          },
        }
      : {}

    const loans = await prisma.loan.findMany({
      where,
      include: {
        payments: true,
        installments: true,
      },
    })

    const totalLoans = loans.length
    const totalPrincipalDisbursed = loans.reduce(
      (sum, loan) => sum + Number(loan.principalAmount),
      0
    )
    const totalOutstanding = loans.reduce(
      (sum, loan) => sum + Number(loan.outstandingPrincipal),
      0
    )
    const totalPaidPrincipal = totalPrincipalDisbursed - totalOutstanding

    // Calcular intereses y penalidades cobradas
    const totalInterestEarned = loans.reduce((sum, loan) => {
      return (
        sum +
        loan.installments.reduce((iSum, inst) => {
          const collected = extractCollectedComponents(inst)
          return iSum + collected.interestCollected
        }, 0)
      )
    }, 0)

    const totalPenaltiesEarned = loans.reduce((sum, loan) => {
      return (
        sum +
        loan.installments.reduce((iSum, inst) => {
          const collected = extractCollectedComponents(inst)
          return iSum + collected.penaltyCollected
        }, 0)
      )
    }, 0)

    const activeLoans = loans.filter(l => l.status === 'ACTIVE').length
    const paidOffLoans = loans.filter(l => l.status === 'PAID').length
    const defaultedLoans = loans.filter(l => l.status === 'DEFAULTED').length

    const averageLoanAmount = totalLoans > 0 ? totalPrincipalDisbursed / totalLoans : 0
    const averageInterestRate =
      totalLoans > 0
        ? loans.reduce(
            (sum, loan) =>
              sum +
              normalizeInterestRateForInput(
                Number(loan.interestRate),
                loan.interestType
              ),
            0
          ) / totalLoans
        : 0

    return {
      totalLoans,
      totalPrincipalDisbursed,
      totalOutstanding,
      totalPaidPrincipal,
      totalInterestEarned,
      totalPenaltiesEarned,
      activeLoans,
      paidOffLoans,
      defaultedLoans,
      averageLoanAmount,
      averageInterestRate,
    }
  }

  /**
   * Generar reporte de cartera vencida (aging)
   */
  static async getAgingReport(): Promise<AgingReportBucket[]> {
    const currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    const overdueInstallments = await prisma.installment.findMany({
      where: getOverdueInstallmentWhere(currentDate),
      include: {
        loan: true,
      },
    })

    // Categorizar por días de vencimiento
    const buckets = {
      '1-7 días': { count: 0, totalAmount: 0 },
      '8-30 días': { count: 0, totalAmount: 0 },
      '31-60 días': { count: 0, totalAmount: 0 },
      '61-90 días': { count: 0, totalAmount: 0 },
      '+90 días': { count: 0, totalAmount: 0 },
    }

    overdueInstallments.forEach(installment => {
      const daysOverdue = Math.floor(
        (currentDate.getTime() - installment.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      const amount = Number(installment.pendingAmount || 0)

      if (daysOverdue <= 7) {
        buckets['1-7 días'].count++
        buckets['1-7 días'].totalAmount += amount
      } else if (daysOverdue <= 30) {
        buckets['8-30 días'].count++
        buckets['8-30 días'].totalAmount += amount
      } else if (daysOverdue <= 60) {
        buckets['31-60 días'].count++
        buckets['31-60 días'].totalAmount += amount
      } else if (daysOverdue <= 90) {
        buckets['61-90 días'].count++
        buckets['61-90 días'].totalAmount += amount
      } else {
        buckets['+90 días'].count++
        buckets['+90 días'].totalAmount += amount
      }
    })

    const totalAmount = Object.values(buckets).reduce((sum, b) => sum + b.totalAmount, 0)

    return Object.entries(buckets).map(([range, data]) => ({
      range,
      count: data.count,
      totalAmount: data.totalAmount,
      percentage: totalAmount > 0 ? (data.totalAmount / totalAmount) * 100 : 0,
    }))
  }

  /**
   * Generar reporte de cobranza
   */
  static async getCollectionReport(): Promise<CollectionReportData> {
    const currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    const overdueInstallments = await prisma.installment.findMany({
      where: getOverdueInstallmentWhere(currentDate),
    })

    const totalOverdue = overdueInstallments.length
    const totalOverdueAmount = overdueInstallments.reduce(
      (sum, inst) => sum + Number(inst.pendingAmount || 0),
      0
    )

    // Obtener datos por cobrador (usuarios con rol COLLECTION)
    const collectors = await prisma.user.findMany({
      where: { role: 'COLLECTION' },
      include: {
        assignedCollectionActions: true,
      },
    })

    const byCollector = await Promise.all(
      collectors.map(async collector => {
        const assignedCases = collector.assignedCollectionActions.filter(action =>
          ['PENDING', 'IN_PROGRESS'].includes(action.status)
        ).length

        // Calcular monto cobrado por este cobrador
        const collectedPayments = await prisma.payment.findMany({
          where: {
            processedById: collector.id,
            paidAt: {
              gte: startOfMonth(currentDate),
            },
          },
        })

        const collectedAmount = collectedPayments.reduce(
          (sum, p) => sum + Number(p.amount),
          0
        )

        const totalManagedCases = collector.assignedCollectionActions.length
        const successRate =
          totalManagedCases > 0
            ? (collector.assignedCollectionActions.filter(a => a.status === 'COMPLETED').length /
                totalManagedCases) *
              100
            : 0

        return {
          collectorId: collector.id,
          collectorName: collector.name,
          assignedCases,
          collectedAmount,
          successRate,
        }
      })
    )

    const byAging = await this.getAgingReport()

    return {
      totalOverdue,
      totalOverdueAmount,
      byCollector,
      byAging,
    }
  }

  /**
   * Generar reporte de desempeño de analistas
   */
  static async getAnalystPerformance(
    startDate?: Date,
    endDate?: Date
  ): Promise<AnalystPerformanceData[]> {
    const dateFilter = startDate && endDate
      ? {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }
      : {}

    const analysts = await prisma.user.findMany({
      where: { role: 'ANALYST' },
    })

    return await Promise.all(
      analysts.map(async analyst => {
        // Préstamos procesados
        const loansProcessed = await prisma.loan.count({
          where: {
            ...dateFilter,
            createdBy: analyst.id,
          },
        })

        const loans = await prisma.loan.findMany({
          where: {
            ...dateFilter,
            createdBy: analyst.id,
          },
        })

        const applicationsProcessed = await prisma.creditApplication.findMany({
          where: {
            ...dateFilter,
            approvedBy: analyst.id,
          },
        })

        const totalDisbursed = loans.reduce(
          (sum, loan) => sum + Number(loan.principalAmount),
          0
        )

        const averageProcessingTime =
          applicationsProcessed.length > 0
            ? applicationsProcessed.reduce((sum, app) => {
                const processingTime =
                  app.reviewedAt && app.createdAt
                    ? (app.reviewedAt.getTime() - app.createdAt.getTime()) /
                      (1000 * 60 * 60 * 24)
                    : 0
                return sum + processingTime
              }, 0) / applicationsProcessed.length
            : 0

        // Tasa de aprobación
        const totalApplications = applicationsProcessed.length
        const approvedApplications = applicationsProcessed.filter(
          app => app.status === 'APPROVED'
        ).length
        const approvalRate =
          totalApplications > 0 ? (approvedApplications / totalApplications) * 100 : 0

        // Tasa de mora
        const defaultedLoans = loans.filter(l => l.status === 'DEFAULTED').length
        const defaultRate = loansProcessed > 0 ? (defaultedLoans / loansProcessed) * 100 : 0

        return {
          analystId: analyst.id,
          analystName: analyst.name,
          loansProcessed,
          totalDisbursed,
          averageProcessingTime,
          approvalRate,
          defaultRate,
        }
      })
    )
  }

  /**
   * Generar métricas mensuales para dashboard
   */
  static async getMonthlyMetrics() {
    const currentMonth = new Date()
    const startDate = startOfMonth(currentMonth)
    const endDate = endOfMonth(currentMonth)
    const previousMonth = subMonths(currentMonth, 1)
    const previousStartDate = startOfMonth(previousMonth)
    const previousEndDate = endOfMonth(previousMonth)

    const [currentPortfolio, previousPortfolio] = await Promise.all([
      this.getPortfolioReport(startDate, endDate),
      this.getPortfolioReport(previousStartDate, previousEndDate),
    ])

    return {
      current: currentPortfolio,
      previous: previousPortfolio,
      growth: {
        loans:
          previousPortfolio.totalLoans > 0
            ? ((currentPortfolio.totalLoans - previousPortfolio.totalLoans) /
                previousPortfolio.totalLoans) *
              100
            : 0,
        disbursed:
          previousPortfolio.totalPrincipalDisbursed > 0
            ? ((currentPortfolio.totalPrincipalDisbursed -
                previousPortfolio.totalPrincipalDisbursed) /
                previousPortfolio.totalPrincipalDisbursed) *
              100
            : 0,
      },
    }
  }

  /**
   * Rentabilidad por préstamo
   */
  static async getLoanProfitabilityReport(startDate?: Date, endDate?: Date) {
    const where =
      startDate && endDate
        ? {
            disbursementDate: {
              gte: startDate,
              lte: endDate,
            },
          }
        : {}

    const loans = await prisma.loan.findMany({
      where,
      include: {
        client: {
          include: {
            individualProfile: true,
            businessProfile: true,
          },
        },
        installments: true,
      },
      orderBy: { disbursementDate: 'desc' },
    })

    const loanIds = loans.map(loan => loan.id)
    const audits = await prisma.auditLog.findMany({
      where: {
        entityType: 'loans',
        entityId: { in: loanIds },
      },
      orderBy: { createdAt: 'asc' },
    })

    return loans.map<LoanProfitabilityReportItem>(loan => {
      const loanAudits = audits.filter(audit => audit.entityId === loan.id)
      const creationAudit = loanAudits.find(audit => audit.action === 'CREATE')
      const extensions = loanAudits
        .map(parseExtensionAudit)
        .filter((extension): extension is NonNullable<typeof extension> => Boolean(extension))

      const clientName =
        loan.client.type === 'INDIVIDUAL'
          ? `${loan.client.individualProfile?.firstName || ''} ${loan.client.individualProfile?.lastName || ''}`.trim()
          : loan.client.businessProfile?.businessName || 'Cliente'

      const clientTaxId =
        loan.client.type === 'INDIVIDUAL'
          ? decryptSafe(loan.client.individualProfile?.taxId)
          : decryptSafe(loan.client.businessProfile?.taxId)

      const collectedTotals = loan.installments.reduce(
        (summary, installment) => {
          const collected = extractCollectedComponents(installment)

          summary.interest += collected.interestCollected
          summary.penalty += collected.penaltyCollected

          return summary
        },
        { interest: 0, penalty: 0 }
      )

      const interestProjected =
        Number(loan.totalInterest || 0) ||
        loan.installments.reduce((sum, installment) => sum + Number(installment.interestAmount || 0), 0)

      const interestCollected = collectedTotals.interest
      const penaltiesCollected = collectedTotals.penalty

      const totalRevenueCollected = interestCollected + penaltiesCollected
      const expectedRevenue = interestProjected + penaltiesCollected
      const originalInterestRate =
        parseInterestRateFromAuditValue(creationAudit?.newValue) ?? Number(loan.interestRate)
      const originalTermMonths =
        parseTermMonthsFromAuditValue(creationAudit?.newValue) ?? loan.termMonths

      return {
        loanId: loan.id,
        loanNumber: loan.loanNumber,
        clientId: loan.clientId,
        clientName,
        clientTaxId,
        status: loan.status,
        disbursementDate: loan.disbursementDate,
        originalTermMonths,
        termMonths: loan.termMonths,
        originalInterestRate,
        currentInterestRate: Number(loan.interestRate),
        principalAmount: Number(loan.principalAmount || 0),
        interestProjected,
        interestCollected,
        penaltiesCollected,
        totalRevenueCollected,
        expectedRevenue,
        monthlyProjectedRevenue: loan.termMonths > 0 ? expectedRevenue / loan.termMonths : 0,
        monthlyCollectedRevenue: loan.termMonths > 0 ? totalRevenueCollected / loan.termMonths : 0,
        extensions,
      }
    })
  }
}
