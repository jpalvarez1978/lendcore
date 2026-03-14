import { prisma } from '@/lib/prisma'
import { Prisma, type AuditAction } from '@prisma/client'

export interface AuditFilters {
  userId?: string
  action?: AuditAction
  entityType?: string
  entityId?: string
  startDate?: Date
  endDate?: Date
  search?: string
}

export class AuditService {
  /**
   * Obtener registros de auditoría con filtros
   */
  static async getLogs(filters: AuditFilters = {}, limit: number = 100, offset: number = 0) {
    const where: Prisma.AuditLogWhereInput = {}

    if (filters.userId) where.userId = filters.userId
    if (filters.action) where.action = filters.action
    if (filters.entityType) where.entityType = filters.entityType
    if (filters.entityId) where.entityId = filters.entityId

    if (filters.startDate || filters.endDate) {
      where.createdAt = {}
      if (filters.startDate) where.createdAt.gte = filters.startDate
      if (filters.endDate) where.createdAt.lte = filters.endDate
    }

    if (filters.search) {
      where.OR = [
        { entityId: { contains: filters.search } },
        { entityType: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ])

    return {
      logs,
      total,
      hasMore: offset + logs.length < total,
    }
  }

  /**
   * Obtener log específico por ID
   */
  static async getById(id: string) {
    return await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })
  }

  /**
   * Obtener historial de un registro específico
   */
  static async getEntityHistory(entityType: string, entityId: string) {
    return await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Obtener actividad de un usuario
   */
  static async getUserActivity(userId: string, limit: number = 50) {
    return await prisma.auditLog.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  /**
   * Obtener estadísticas de auditoría
   */
  static async getStats(startDate?: Date, endDate?: Date) {
    const where: Prisma.AuditLogWhereInput = {}

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = startDate
      if (endDate) where.createdAt.lte = endDate
    }

    const [totalLogs, actionCounts, entityTypeCounts, userCounts] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
      }),
      prisma.auditLog.groupBy({
        by: ['entityType'],
        where,
        _count: true,
      }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        where,
        _count: true,
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
        take: 10,
      }),
    ])

    // Obtener nombres de usuarios más activos
    const topUserIds = userCounts.map(u => u.userId)
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: topUserIds,
        },
      },
      select: {
        id: true,
        name: true,
        role: true,
      },
    })

    const topUsers = userCounts.map(uc => {
      const user = users.find(u => u.id === uc.userId)
      return {
        userId: uc.userId,
        userName: user?.name || 'Usuario Desconocido',
        userRole: user?.role || 'UNKNOWN',
        count: uc._count,
      }
    })

    return {
      totalLogs,
      byAction: actionCounts.map(ac => ({
        action: ac.action,
        count: ac._count,
      })),
      byEntityType: entityTypeCounts.map(etc => ({
        entityType: etc.entityType,
        count: etc._count,
      })),
      topUsers,
    }
  }

  /**
   * Crear registro de auditoría manual
   */
  static async createLog(
    userId: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
    oldValue?: Prisma.InputJsonValue | null,
    newValue?: Prisma.InputJsonValue | null
  ) {
    return await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        oldValue: oldValue || null,
        newValue: newValue || null,
      },
    })
  }

  /**
   * Exportar logs a CSV
   */
  static async exportToCSV(filters: AuditFilters = {}) {
    const { logs } = await this.getLogs(filters, 10000, 0)

    const headers = ['Fecha', 'Usuario', 'Acción', 'Tipo', 'ID Entidad', 'IP']
    const rows = logs.map(log => [
      log.createdAt.toISOString(),
      log.user.name,
      log.action,
      log.entityType,
      log.entityId,
      log.ipAddress || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    return {
      csvContent,
      recordCount: logs.length,
    }
  }
}
