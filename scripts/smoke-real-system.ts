import { addDays, addMonths, subMonths } from 'date-fns'
import {
  ClientType,
  CollectionActionType,
  CollectionResult,
  PaymentMethod,
  PaymentFrequency,
  PrismaClient,
  RiskLevel,
} from '@prisma/client'
import { ClientService } from '../src/services/clientService'
import { ApplicationService } from '../src/services/applicationService'
import { LoanService } from '../src/services/loanService'
import { PaymentService } from '../src/services/paymentService'
import { PromiseService } from '../src/services/promiseService'
import { CollectionDashboardService } from '../src/services/collectionDashboardService'
import { ReportService } from '../src/services/reportService'

const prisma = new PrismaClient()

type TestStatus = 'PASS' | 'FAIL'

interface TestResult {
  area: string
  check: string
  status: TestStatus
  detail: string
}

interface SmokeArtifacts {
  clientIds: string[]
  applicationIds: string[]
  loanIds: string[]
  paymentIds: string[]
  promiseIds: string[]
  collectionActionIds: string[]
}

const results: TestResult[] = []
const artifacts: SmokeArtifacts = {
  clientIds: [],
  applicationIds: [],
  loanIds: [],
  paymentIds: [],
  promiseIds: [],
  collectionActionIds: [],
}

function record(area: string, check: string, status: TestStatus, detail: string) {
  results.push({ area, check, status, detail })
}

function assertCondition(condition: unknown, area: string, check: string, detail: string) {
  if (!condition) {
    record(area, check, 'FAIL', detail)
    throw new Error(`${area} :: ${check} -> ${detail}`)
  }

  record(area, check, 'PASS', detail)
}

async function cleanupArtifacts() {
  const entityIds = [
    ...artifacts.clientIds,
    ...artifacts.applicationIds,
    ...artifacts.loanIds,
    ...artifacts.paymentIds,
    ...artifacts.promiseIds,
    ...artifacts.collectionActionIds,
  ]

  if (entityIds.length > 0) {
    await prisma.auditLog.deleteMany({
      where: {
        entityId: {
          in: entityIds,
        },
      },
    })
  }

  if (artifacts.collectionActionIds.length > 0) {
    await prisma.collectionAction.deleteMany({
      where: { id: { in: artifacts.collectionActionIds } },
    })
  }

  if (artifacts.promiseIds.length > 0) {
    await prisma.paymentPromise.deleteMany({
      where: { id: { in: artifacts.promiseIds } },
    })
  }

  if (artifacts.paymentIds.length > 0 || artifacts.loanIds.length > 0) {
    await prisma.payment.deleteMany({
      where: {
        OR: [
          artifacts.paymentIds.length > 0 ? { id: { in: artifacts.paymentIds } } : undefined,
          artifacts.loanIds.length > 0 ? { loanId: { in: artifacts.loanIds } } : undefined,
        ].filter(Boolean) as Array<Record<string, unknown>>,
      },
    })
  }

  if (artifacts.loanIds.length > 0) {
    await prisma.loan.deleteMany({
      where: { id: { in: artifacts.loanIds } },
    })
  }

  if (artifacts.applicationIds.length > 0) {
    await prisma.creditApplication.deleteMany({
      where: { id: { in: artifacts.applicationIds } },
    })
  }

  if (artifacts.clientIds.length > 0) {
    await prisma.client.deleteMany({
      where: { id: { in: artifacts.clientIds } },
    })
  }
}

async function main() {
  const keepData = process.env.KEEP_SMOKE_DATA === '1'
  const stamp = `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`
  const dniBase = stamp.replace(/\D/g, '').slice(-8).padStart(8, '0')
  const cifBase = stamp.replace(/\D/g, '').slice(-7).padStart(7, '0')

  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN', status: 'ACTIVE' },
  })
  const collector = await prisma.user.findFirst({
    where: { role: 'COLLECTION', status: 'ACTIVE' },
  })

  assertCondition(Boolean(admin), 'Seguridad', 'Usuario admin disponible', 'Existe un admin activo para ejecutar la batería')
  assertCondition(Boolean(collector), 'Seguridad', 'Usuario cobrador disponible', 'Existe un cobrador activo para probar cobranza')

  const individualClient = await ClientService.create(
    {
      type: ClientType.INDIVIDUAL,
      status: 'ACTIVE',
      email: `smoke.individual.${stamp.toLowerCase()}@example.com`,
      phone: `+34610${dniBase.slice(-6)}`,
      address: `Calle Smoke ${stamp}`,
      city: 'Bilbao',
      postalCode: '48001',
      creditLimit: 30000,
      riskLevel: RiskLevel.LOW,
      internalScore: 82,
      individualProfile: {
        firstName: 'SMOKE',
        lastName: `INDIVIDUAL ${stamp}`,
        taxId: `${dniBase}Z`,
        occupation: 'Consultor',
        income: 4200,
      },
    },
    admin!.id
  )
  artifacts.clientIds.push(individualClient.id)
  record('Clientes', 'Crear cliente individual', 'PASS', `Cliente ${individualClient.id} creado`)

  const businessClient = await ClientService.create(
    {
      type: ClientType.BUSINESS,
      status: 'ACTIVE',
      email: `smoke.business.${stamp.toLowerCase()}@example.com`,
      phone: `+34910${cifBase.slice(-6)}`,
      address: `Avenida Empresa ${stamp}`,
      city: 'Madrid',
      postalCode: '28001',
      creditLimit: 50000,
      riskLevel: RiskLevel.MEDIUM,
      internalScore: 75,
      businessProfile: {
        businessName: `SMOKE BUSINESS ${stamp}`,
        taxId: `B${cifBase}`,
        legalRepName: 'Laura Smoke',
        legalRepTaxId: `${String(Number(dniBase) + 1).padStart(8, '0')}X`,
        industry: 'Construcción',
        annualRevenue: 250000,
        employeeCount: 12,
      },
    },
    admin!.id
  )
  artifacts.clientIds.push(businessClient.id)
  record('Clientes', 'Crear cliente empresa', 'PASS', `Cliente ${businessClient.id} creado`)

  const hydratedIndividualClient = await ClientService.getById(individualClient.id)
  assertCondition(
    hydratedIndividualClient?.individualProfile?.taxId === `${dniBase}Z`,
    'Clientes',
    'Desencriptación de DNI individual',
    `DNI visible correcto: ${hydratedIndividualClient?.individualProfile?.taxId}`
  )

  const searchByTaxId = await ClientService.getAll({
    search: dniBase.slice(-5),
    pageSize: 20,
  })
  assertCondition(
    searchByTaxId.data.some(client => client.id === individualClient.id),
    'Clientes',
    'Búsqueda parcial por DNI/CIF',
    `La búsqueda parcial encontró ${searchByTaxId.pagination.total} cliente(s)`
  )

  const searchByBusinessName = await ClientService.getAll({
    search: stamp,
    pageSize: 20,
  })
  assertCondition(
    searchByBusinessName.data.some(client => client.id === businessClient.id),
    'Clientes',
    'Búsqueda parcial por nombre de empresa',
    `La búsqueda por nombre devolvió ${searchByBusinessName.pagination.total} cliente(s)`
  )

  const approvedApplication = await ApplicationService.create(
    {
      clientId: individualClient.id,
      requestedAmount: 9500,
      purpose: `Capital de trabajo realista ${stamp}`,
      termMonths: 6,
      proposedRate: 0.02,
      paymentFrequency: PaymentFrequency.MONTHLY,
    },
    admin!.id
  )
  artifacts.applicationIds.push(approvedApplication.id)
  assertCondition(
    approvedApplication.status === 'DRAFT',
    'Solicitudes',
    'Crear solicitud aprobable',
    `Solicitud creada en estado ${approvedApplication.status}`
  )

  const submittedApplication = await ApplicationService.submit(approvedApplication.id, admin!.id)
  assertCondition(
    submittedApplication.status === 'UNDER_REVIEW',
    'Solicitudes',
    'Enviar solicitud a revisión',
    `Solicitud ahora en estado ${submittedApplication.status}`
  )

  const finalApprovedApplication = await ApplicationService.approve(
    approvedApplication.id,
    admin!.id,
    'Expediente completo y capacidad de pago validada en smoke test'
  )
  assertCondition(
    finalApprovedApplication.status === 'APPROVED',
    'Solicitudes',
    'Aprobar solicitud',
    `Solicitud aprobada con notas`
  )

  const rejectedApplication = await ApplicationService.create(
    {
      clientId: businessClient.id,
      requestedAmount: 12000,
      purpose: `Solicitud rechazada de control ${stamp}`,
      termMonths: 12,
      proposedRate: 0.018,
      paymentFrequency: PaymentFrequency.MONTHLY,
    },
    admin!.id
  )
  artifacts.applicationIds.push(rejectedApplication.id)

  await ApplicationService.submit(rejectedApplication.id, admin!.id)
  const finalRejectedApplication = await ApplicationService.reject(
    rejectedApplication.id,
    admin!.id,
    'Documentación financiera incompleta para análisis'
  )
  assertCondition(
    finalRejectedApplication.status === 'REJECTED',
    'Solicitudes',
    'Rechazar solicitud',
    `Solicitud rechazada con motivo registrado`
  )

  const approvedLoan = await LoanService.create(
    {
      applicationId: approvedApplication.id,
      clientId: individualClient.id,
      principalAmount: 9500,
      amortizationType: 'AMERICAN',
      interestType: 'PERCENTAGE_MONTHLY',
      interestRate: 2,
      termMonths: 6,
      paymentFrequency: PaymentFrequency.MONTHLY,
      disbursementDate: new Date(),
      firstDueDate: addMonths(new Date(), 1),
      allowSaturdayPayments: true,
      allowSundayPayments: true,
      hasGuarantor: false,
      sendEmailOnCreate: false,
    },
    admin!.id
  )
  artifacts.loanIds.push(approvedLoan.id)
  assertCondition(
    Boolean(approvedLoan.loanNumber),
    'Préstamos',
    'Originar préstamo desde solicitud aprobada',
    `Préstamo ${approvedLoan.loanNumber} creado`
  )

  const disbursedApplication = await ApplicationService.getById(approvedApplication.id)
  assertCondition(
    disbursedApplication?.status === 'DISBURSED',
    'Solicitudes',
    'Cerrar flujo al desembolsar',
    `Solicitud quedó en ${disbursedApplication?.status}`
  )

  const overdueLoan = await LoanService.create(
    {
      clientId: businessClient.id,
      principalAmount: 12000,
      amortizationType: 'FRENCH',
      interestType: 'PERCENTAGE_MONTHLY',
      interestRate: 1.5,
      termMonths: 4,
      paymentFrequency: PaymentFrequency.MONTHLY,
      disbursementDate: subMonths(new Date(), 5),
      firstDueDate: subMonths(new Date(), 4),
      allowSaturdayPayments: true,
      allowSundayPayments: true,
      hasGuarantor: false,
      sendEmailOnCreate: false,
      notes: `Préstamo vencido de control ${stamp}`,
    },
    admin!.id
  )
  artifacts.loanIds.push(overdueLoan.id)
  assertCondition(
    overdueLoan.status === 'ACTIVE',
    'Préstamos',
    'Crear préstamo vencido de control',
    `Préstamo ${overdueLoan.loanNumber} creado para aging/cobranza`
  )

  const automaticPayment = await PaymentService.create(
    {
      loanId: approvedLoan.id,
      amount: 190,
      paymentMethod: PaymentMethod.CASH,
      reference: `SMOKE-CASH-${stamp}`,
      notes: `Pago automático smoke ${stamp}`,
    },
    admin!.id
  )
  artifacts.paymentIds.push(automaticPayment.id)
  assertCondition(
    Boolean(automaticPayment.id),
    'Pagos',
    'Registrar pago automático',
    `Pago ${automaticPayment.id} creado`
  )

  const overdueLoanHydrated = await LoanService.getById(overdueLoan.id)
  const targetInstallment = overdueLoanHydrated?.installments.find(inst => Number(inst.pendingAmount) > 0)
  assertCondition(
    Boolean(targetInstallment),
    'Pagos',
    'Identificar cuota vencida para pago dirigido',
    `Cuota ${targetInstallment?.installmentNumber || 'N/A'} detectada`
  )

  const directedPayment = await PaymentService.create(
    {
      loanId: overdueLoan.id,
      installmentId: targetInstallment!.id,
      amount: 150,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      reference: `SMOKE-BANK-${stamp}`,
      notes: `Pago dirigido smoke ${stamp}`,
    },
    admin!.id
  )
  artifacts.paymentIds.push(directedPayment.id)
  assertCondition(
    Boolean(directedPayment.id),
    'Pagos',
    'Registrar pago dirigido a cuota',
    `Pago ${directedPayment.id} creado`
  )

  const hydratedDirectedPayment = await PaymentService.getById(directedPayment.id)
  assertCondition(
    Boolean(hydratedDirectedPayment?.allocations?.length),
    'Pagos',
    'Generar asignaciones de pago',
    `Asignaciones creadas: ${hydratedDirectedPayment?.allocations.length || 0}`
  )

  const quickAction = await CollectionDashboardService.quickCollectionAction(
    businessClient.id,
    overdueLoan.id,
    CollectionActionType.CALL,
    CollectionResult.PROMISE_MADE,
    `Gestión de cobranza smoke ${stamp}`,
    collector!.id
  )
  artifacts.collectionActionIds.push(quickAction.id)
  assertCondition(
    quickAction.status === 'COMPLETED',
    'Cobranza',
    'Registrar gestión rápida',
    `Gestión ${quickAction.id} completada`
  )

  const paymentPromise = await PromiseService.create(
    {
      clientId: businessClient.id,
      loanId: overdueLoan.id,
      promiseDate: addDays(new Date(), 1),
      promisedAmount: 300,
      notes: `Promesa smoke ${stamp}`,
    },
    collector!.id
  )
  artifacts.promiseIds.push(paymentPromise.id)
  assertCondition(
    paymentPromise.status === 'PENDING',
    'Cobranza',
    'Crear promesa de pago',
    `Promesa ${paymentPromise.id} en estado ${paymentPromise.status}`
  )

  const collectionMetrics = await CollectionDashboardService.getMetrics(collector!.id)
  assertCondition(
    collectionMetrics.totalOverdue > 0,
    'Cobranza',
    'Detectar mora en métricas',
    `Casos vencidos detectados: ${collectionMetrics.totalOverdue}`
  )
  assertCondition(
    collectionMetrics.promisesDueTomorrow > 0,
    'Cobranza',
    'Detectar promesas próximas',
    `Promesas para mañana: ${collectionMetrics.promisesDueTomorrow}`
  )

  const prioritizedCases = await CollectionDashboardService.getPrioritizedCases(collector!.id, 20)
  assertCondition(
    prioritizedCases.some(item => item.loanId === overdueLoan.id),
    'Cobranza',
    'Priorizar préstamo vencido',
    `Se encontró ${overdueLoan.loanNumber} en la cola de gestión`
  )

  const portfolioReport = await ReportService.getPortfolioReport()
  assertCondition(
    portfolioReport.totalLoans >= 2,
    'Reportes',
    'Generar reporte de cartera',
    `Total préstamos en reporte: ${portfolioReport.totalLoans}`
  )

  const agingReport = await ReportService.getAgingReport()
  assertCondition(
    agingReport.some(bucket => bucket.count > 0),
    'Reportes',
    'Generar aging report con mora',
    `Buckets con casos: ${agingReport.filter(bucket => bucket.count > 0).length}`
  )

  const collectionReport = await ReportService.getCollectionReport()
  assertCondition(
    collectionReport.totalOverdue > 0,
    'Reportes',
    'Generar reporte de cobranza',
    `Mora total: ${collectionReport.totalOverdue}`
  )

  const profitabilityReport = await ReportService.getLoanProfitabilityReport()
  assertCondition(
    profitabilityReport.some(item => item.loanId === approvedLoan.id),
    'Reportes',
    'Incluir préstamo originado en rentabilidad',
    `Préstamo ${approvedLoan.loanNumber} presente en rentabilidad`
  )

  const applicationAuditTrail = await prisma.auditLog.findMany({
    where: {
      entityType: 'credit_applications',
      entityId: approvedApplication.id,
    },
    orderBy: { createdAt: 'asc' },
    select: { action: true },
  })

  assertCondition(
    JSON.stringify(applicationAuditTrail.map(item => item.action)) ===
      JSON.stringify(['CREATE', 'UPDATE_STATUS', 'APPROVE', 'DISBURSE']),
    'Auditoría',
    'Trazabilidad completa de solicitud',
    `Secuencia: ${applicationAuditTrail.map(item => item.action).join(' -> ')}`
  )

  if (!keepData) {
    await cleanupArtifacts()
    record('Cleanup', 'Eliminar datos de prueba', 'PASS', 'Los artefactos smoke fueron eliminados')
  } else {
    record('Cleanup', 'Conservar datos de prueba', 'PASS', 'KEEP_SMOKE_DATA=1, los datos se mantienen')
  }
}

main()
  .catch(async error => {
    record('Sistema', 'Ejecución general del smoke test', 'FAIL', error instanceof Error ? error.message : 'Error desconocido')
    if (process.env.KEEP_SMOKE_DATA !== '1') {
      try {
        await cleanupArtifacts()
      } catch (cleanupError) {
        record(
          'Cleanup',
          'Eliminar datos de prueba tras fallo',
          'FAIL',
          cleanupError instanceof Error ? cleanupError.message : 'No se pudo limpiar la base'
        )
      }
    }
  })
  .finally(async () => {
    const passCount = results.filter(result => result.status === 'PASS').length
    const failCount = results.filter(result => result.status === 'FAIL').length

    console.log('\nSMOKE TEST REPORT')
    console.log('=================')
    for (const result of results) {
      console.log(`[${result.status}] ${result.area} :: ${result.check} -> ${result.detail}`)
    }
    console.log('-----------------')
    console.log(`PASS: ${passCount}`)
    console.log(`FAIL: ${failCount}`)

    await prisma.$disconnect()

    if (failCount > 0) {
      process.exit(1)
    }
  })
