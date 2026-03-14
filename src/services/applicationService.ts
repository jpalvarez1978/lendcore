import { prisma } from '@/lib/prisma'
import { ApplicationStatus, PaymentFrequency, Prisma } from '@prisma/client'

export interface CreateApplicationData {
  clientId: string
  requestedAmount: number
  purpose?: string | null
  termMonths: number
  proposedRate: number
  paymentFrequency: PaymentFrequency
}

export class ApplicationService {
  /**
   * Obtener todas las solicitudes con filtros
   */
  static async getAll(filters?: {
    status?: ApplicationStatus
    clientId?: string
  }) {
    const where: Prisma.CreditApplicationWhereInput = {}

    if (filters?.status) where.status = filters.status
    if (filters?.clientId) where.clientId = filters.clientId

    return await prisma.creditApplication.findMany({
      where,
      include: {
        client: {
          include: {
            individualProfile: true,
            businessProfile: true,
          },
        },
        approver: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Obtener solicitud por ID
   */
  static async getById(id: string) {
    return await prisma.creditApplication.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            individualProfile: true,
            businessProfile: true,
            loans: true,
          },
        },
        approver: true,
      },
    })
  }

  /**
   * Crear nueva solicitud
   */
  static async create(data: CreateApplicationData, userId: string) {
    // Verificar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
    })

    if (!client) {
      throw new Error('Cliente no encontrado')
    }

    // Verificar que el monto no exceda el cupo disponible
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

    if (data.requestedAmount > availableCredit) {
      throw new Error(
        `Monto solicitado excede el cupo disponible (${availableCredit.toFixed(2)}€)`
      )
    }

    const application = await prisma.creditApplication.create({
      data: {
        clientId: data.clientId,
        requestedAmount: data.requestedAmount,
        purpose: data.purpose,
        termMonths: data.termMonths,
        proposedRate: data.proposedRate,
        paymentFrequency: data.paymentFrequency,
        status: 'DRAFT',
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

    // Auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entityType: 'credit_applications',
        entityId: application.id,
        newValue: {
          clientId: application.clientId,
          requestedAmount: Number(application.requestedAmount),
          termMonths: application.termMonths,
          proposedRate: Number(application.proposedRate),
          paymentFrequency: application.paymentFrequency,
          status: application.status,
        },
      },
    })

    return application
  }

  /**
   * Enviar solicitud a revisión
   */
  static async submit(id: string, userId: string) {
    const application = await this.getById(id)
    if (!application) throw new Error('Solicitud no encontrada')

    if (application.status !== 'DRAFT') {
      throw new Error('Solo se pueden enviar solicitudes en borrador')
    }

    const updated = await prisma.creditApplication.update({
      where: { id },
      data: {
        status: 'UNDER_REVIEW',
        submittedAt: new Date(),
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_STATUS',
        entityType: 'credit_applications',
        entityId: id,
        newValue: { status: 'UNDER_REVIEW' },
      },
    })

    return updated
  }

  /**
   * Aprobar solicitud
   */
  static async approve(id: string, userId: string, notes?: string) {
    const application = await this.getById(id)
    if (!application) throw new Error('Solicitud no encontrada')

    if (application.status !== 'UNDER_REVIEW') {
      throw new Error('Solo se pueden aprobar solicitudes en revisión')
    }

    const updated = await prisma.creditApplication.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        approvedBy: userId,
        approvalNotes: notes,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'APPROVE',
        entityType: 'credit_applications',
        entityId: id,
        newValue: { status: 'APPROVED', approvalNotes: notes },
      },
    })

    return updated
  }

  /**
   * Rechazar solicitud
   */
  static async reject(id: string, userId: string, reason: string) {
    const application = await this.getById(id)
    if (!application) throw new Error('Solicitud no encontrada')

    if (application.status !== 'UNDER_REVIEW') {
      throw new Error('Solo se pueden rechazar solicitudes en revisión')
    }

    const updated = await prisma.creditApplication.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        approvedBy: userId,
        rejectionReason: reason,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'REJECT',
        entityType: 'credit_applications',
        entityId: id,
        newValue: { status: 'REJECTED', rejectionReason: reason },
      },
    })

    return updated
  }

  /**
   * Marcar como desembolsada (cuando se crea el préstamo)
   */
  static async markAsDisbursed(id: string, userId: string, loanId?: string, loanNumber?: string) {
    const application = await this.getById(id)
    if (!application) throw new Error('Solicitud no encontrada')

    const updated = await prisma.creditApplication.update({
      where: { id },
      data: { status: 'DISBURSED' },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DISBURSE',
        entityType: 'credit_applications',
        entityId: id,
        oldValue: { status: application.status },
        newValue: {
          status: 'DISBURSED',
          loanId: loanId || null,
          loanNumber: loanNumber || null,
        },
      },
    })

    return updated
  }
}
