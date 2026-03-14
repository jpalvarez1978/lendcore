/**
 * Collector CRUD Service - Gestión de Cobradores (sin credenciales)
 */

import { prisma } from '@/lib/prisma'

export interface CreateCollectorInput {
  name: string
  email: string
  phone?: string
}

export interface UpdateCollectorInput {
  name?: string
  email?: string
  phone?: string
  isActive?: boolean
}

export class CollectorCRUDService {
  /**
   * Crear nuevo cobrador
   */
  static async createCollector(data: CreateCollectorInput) {
    // Verificar que no exista otro cobrador con el mismo email
    const existing = await prisma.collector.findFirst({
      where: { email: data.email },
    })

    if (existing) {
      throw new Error('Ya existe un cobrador con ese email')
    }

    const collector = await prisma.collector.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        isActive: true,
      },
    })

    return collector
  }

  /**
   * Obtener todos los cobradores
   */
  static async getAllCollectors(includeInactive = false) {
    const collectors = await prisma.collector.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        _count: {
          select: {
            assignedLoans: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return collectors
  }

  /**
   * Obtener cobrador por ID
   */
  static async getCollectorById(id: string) {
    const collector = await prisma.collector.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            assignedLoans: true,
          },
        },
      },
    })

    if (!collector) {
      throw new Error('Cobrador no encontrado')
    }

    return collector
  }

  /**
   * Actualizar cobrador
   */
  static async updateCollector(id: string, data: UpdateCollectorInput) {
    // Si se está actualizando el email, verificar que no esté en uso
    if (data.email) {
      const existing = await prisma.collector.findFirst({
        where: {
          email: data.email,
          id: { not: id },
        },
      })

      if (existing) {
        throw new Error('Ya existe otro cobrador con ese email')
      }
    }

    const updated = await prisma.collector.update({
      where: { id },
      data,
    })

    return updated
  }

  /**
   * Desactivar cobrador
   */
  static async deactivateCollector(id: string) {
    // Verificar si tiene préstamos asignados
    const loansCount = await prisma.loan.count({
      where: {
        collectorId: id,
        status: {
          in: ['ACTIVE', 'DEFAULTED'],
        },
      },
    })

    if (loansCount > 0) {
      throw new Error(
        `No se puede desactivar el cobrador porque tiene ${loansCount} préstamo(s) activo(s) asignado(s)`
      )
    }

    const updated = await prisma.collector.update({
      where: { id },
      data: { isActive: false },
    })

    return updated
  }

  /**
   * Activar cobrador
   */
  static async activateCollector(id: string) {
    const updated = await prisma.collector.update({
      where: { id },
      data: { isActive: true },
    })

    return updated
  }

  /**
   * Eliminar cobrador (solo si no tiene préstamos)
   */
  static async deleteCollector(id: string) {
    // Verificar si tiene préstamos asignados (activos o históricos)
    const loansCount = await prisma.loan.count({
      where: { collectorId: id },
    })

    if (loansCount > 0) {
      throw new Error(
        `No se puede eliminar el cobrador porque tiene ${loansCount} préstamo(s) asignado(s) (activos o históricos)`
      )
    }

    await prisma.collector.delete({
      where: { id },
    })

    return { success: true }
  }
}
