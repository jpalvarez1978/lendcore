import { prisma } from '@/lib/prisma'
import { TRANSACTION_CONFIG } from '@/lib/db/transactionConfig'

export interface CreditLimitChangeData {
  clientId: string
  newLimit: number
  reason?: string
  newRate?: number | null
  notes?: string
}

export class CreditLimitService {
  /**
   * Obtener historial de cambios de cupo de un cliente
   */
  static async getByClientId(clientId: string) {
    return await prisma.creditLimitChange.findMany({
      where: { clientId },
      include: {
        client: true,
        approver: true,
      },
      orderBy: { approvedAt: 'desc' },
    })
  }

  /**
   * Crear nueva ampliación/modificación de cupo
   */
  static async create(data: CreditLimitChangeData, userId: string) {
    // Obtener cliente actual
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
    })

    if (!client) {
      throw new Error('Cliente no encontrado')
    }

    const previousLimit = Number(client.creditLimit)

    if (data.newLimit === previousLimit) {
      throw new Error('El nuevo cupo debe ser diferente al actual')
    }

    // Crear registro de cambio y actualizar cliente en transacción
    const change = await prisma.$transaction(async tx => {
      const newChange = await tx.creditLimitChange.create({
        data: {
          clientId: data.clientId,
          previousLimit,
          newLimit: data.newLimit,
          reason: data.reason,
          previousRate: null,
          newRate: data.newRate,
          notes: data.notes,
          approvedBy: userId,
          approvedAt: new Date(),
        },
      })

      // Actualizar cupo del cliente
      await tx.client.update({
        where: { id: data.clientId },
        data: {
          creditLimit: data.newLimit,
        },
      })

      return newChange
    }, TRANSACTION_CONFIG.STANDARD)

    // Auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREDIT_LIMIT_CHANGE',
        entityType: 'clients',
        entityId: data.clientId,
        oldValue: { creditLimit: previousLimit },
        newValue: { creditLimit: data.newLimit, reason: data.reason },
      },
    })

    return change
  }

  /**
   * Obtener estadísticas de cambios de cupo
   */
  static async getStats(clientId: string) {
    const changes = await this.getByClientId(clientId)

    return {
      totalChanges: changes.length,
      increases: changes.filter(c => Number(c.newLimit) > Number(c.previousLimit)).length,
      decreases: changes.filter(c => Number(c.newLimit) < Number(c.previousLimit)).length,
      currentLimit: changes[0] ? Number(changes[0].newLimit) : 0,
      initialLimit: changes[changes.length - 1]
        ? Number(changes[changes.length - 1].previousLimit)
        : 0,
    }
  }
}
