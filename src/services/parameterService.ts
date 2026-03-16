import { prisma } from '@/lib/prisma'
import type { ParameterCategory, ParameterType } from '@prisma/client'
import { TRANSACTION_CONFIG } from '@/lib/db/transactionConfig'

/**
 * Servicio de gestión de parámetros configurables del sistema
 *
 * IMPORTANTE: Este servicio permite configurar parámetros financieros y de negocio
 * sin necesidad de modificar código. Todos los cambios quedan auditados.
 */

interface ParameterDefinition {
  key: string
  category: ParameterCategory
  type: ParameterType
  defaultValue: string
  description: string
  unit?: string
  minValue?: string
  maxValue?: string
  isEditable?: boolean
}

// Parámetros por defecto del sistema
const DEFAULT_PARAMETERS: ParameterDefinition[] = [
  // FINANCIERO
  {
    key: 'default_penalty_rate_daily',
    category: 'FINANCIAL',
    type: 'DECIMAL',
    defaultValue: '0.001',
    description: 'Tasa de penalidad diaria por mora (0.001 = 0.1% diario)',
    unit: 'decimal',
    minValue: '0',
    maxValue: '0.01',
  },
  {
    key: 'max_penalty_rate',
    category: 'FINANCIAL',
    type: 'DECIMAL',
    defaultValue: '0.25',
    description: 'Tope máximo de penalidad sobre el capital (0.25 = 25%)',
    unit: 'decimal',
    minValue: '0',
    maxValue: '1',
  },
  {
    key: 'default_interest_rate_monthly',
    category: 'FINANCIAL',
    type: 'DECIMAL',
    defaultValue: '0.025',
    description: 'Tasa de interés mensual por defecto (2.5%)',
    unit: 'decimal',
    minValue: '0',
    maxValue: '0.15',
  },
  {
    key: 'min_loan_amount',
    category: 'FINANCIAL',
    type: 'DECIMAL',
    defaultValue: '500',
    description: 'Monto mínimo de préstamo',
    unit: 'EUR',
    minValue: '0',
  },
  {
    key: 'max_loan_amount',
    category: 'FINANCIAL',
    type: 'DECIMAL',
    defaultValue: '50000',
    description: 'Monto máximo de préstamo',
    unit: 'EUR',
  },

  // RIESGO
  {
    key: 'risk_low_score_min',
    category: 'RISK',
    type: 'INTEGER',
    defaultValue: '80',
    description: 'Puntuación mínima para riesgo BAJO',
    unit: 'score',
    minValue: '0',
    maxValue: '100',
  },
  {
    key: 'risk_medium_score_min',
    category: 'RISK',
    type: 'INTEGER',
    defaultValue: '50',
    description: 'Puntuación mínima para riesgo MEDIO',
    unit: 'score',
    minValue: '0',
    maxValue: '100',
  },
  {
    key: 'risk_high_score_min',
    category: 'RISK',
    type: 'INTEGER',
    defaultValue: '30',
    description: 'Puntuación mínima para riesgo ALTO',
    unit: 'score',
    minValue: '0',
    maxValue: '100',
  },
  {
    key: 'max_active_loans_per_client',
    category: 'RISK',
    type: 'INTEGER',
    defaultValue: '3',
    description: 'Número máximo de préstamos activos por cliente',
    unit: 'loans',
    minValue: '1',
    maxValue: '10',
  },

  // COBRANZA
  {
    key: 'days_before_overdue_alert',
    category: 'COLLECTION',
    type: 'INTEGER',
    defaultValue: '3',
    description: 'Días antes del vencimiento para enviar alerta',
    unit: 'days',
    minValue: '0',
    maxValue: '30',
  },
  {
    key: 'days_to_first_collection_action',
    category: 'COLLECTION',
    type: 'INTEGER',
    defaultValue: '1',
    description: 'Días después de vencimiento para iniciar cobranza',
    unit: 'days',
    minValue: '0',
    maxValue: '30',
  },
  {
    key: 'days_to_legal_action',
    category: 'COLLECTION',
    type: 'INTEGER',
    defaultValue: '90',
    description: 'Días de mora para considerar acción legal',
    unit: 'days',
    minValue: '30',
    maxValue: '365',
  },
  {
    key: 'max_promise_extensions',
    category: 'COLLECTION',
    type: 'INTEGER',
    defaultValue: '3',
    description: 'Número máximo de promesas de pago por préstamo',
    unit: 'promises',
    minValue: '1',
    maxValue: '10',
  },

  // NEGOCIO
  {
    key: 'require_approval_above_amount',
    category: 'BUSINESS',
    type: 'DECIMAL',
    defaultValue: '10000',
    description: 'Monto que requiere aprobación de gerencia',
    unit: 'EUR',
    minValue: '0',
  },
  {
    key: 'auto_approve_returning_clients',
    category: 'BUSINESS',
    type: 'BOOLEAN',
    defaultValue: 'true',
    description: 'Auto-aprobar clientes con buen historial',
    unit: 'boolean',
  },
  {
    key: 'min_payment_rate_for_approval',
    category: 'BUSINESS',
    type: 'DECIMAL',
    defaultValue: '0.90',
    description: 'Tasa mínima de cumplimiento para auto-aprobación (90%)',
    unit: 'decimal',
    minValue: '0',
    maxValue: '1',
  },
]

export class ParameterService {
  /**
   * Inicializar parámetros del sistema
   */
  static async initializeDefaults() {
    const existing = await prisma.systemParameter.findMany()
    const existingKeys = new Set(existing.map(p => p.key))

    const toCreate = DEFAULT_PARAMETERS.filter(p => !existingKeys.has(p.key))

    if (toCreate.length > 0) {
      await prisma.systemParameter.createMany({
        data: toCreate.map(p => ({
          key: p.key,
          category: p.category,
          type: p.type,
          value: p.defaultValue,
          description: p.description,
          unit: p.unit,
          minValue: p.minValue,
          maxValue: p.maxValue,
          isEditable: p.isEditable ?? true,
        })),
      })
    }

    return toCreate.length
  }

  /**
   * Obtener parámetro completo por key
   */
  static async getByKey(key: string) {
    return await prisma.systemParameter.findUnique({
      where: { key },
    })
  }

  /**
   * Obtener valor de un parámetro (con tipo correcto)
   */
  static async get<T = unknown>(key: string): Promise<T | null> {
    const param = await prisma.systemParameter.findUnique({
      where: { key, isActive: true },
    })

    if (!param) return null

    return this.deserializeValue(param.value, param.type) as T
  }

  /**
   * Obtener valor de un parámetro con fallback
   */
  static async getOrDefault<T>(key: string, defaultValue: T): Promise<T> {
    const value = await this.get<T>(key)
    return value !== null ? value : defaultValue
  }

  /**
   * Actualizar parámetro con auditoría
   */
  static async update(
    key: string,
    newValue: string | number | boolean,
    userId: string,
    reason?: string
  ) {
    const param = await prisma.systemParameter.findUnique({ where: { key } })

    if (!param) {
      throw new Error(`Parámetro ${key} no encontrado`)
    }

    if (!param.isEditable) {
      throw new Error(`El parámetro ${key} no es editable`)
    }

    // Validar límites
    const serializedValue = String(newValue)
    if (param.type === 'DECIMAL' || param.type === 'INTEGER') {
      const numValue = Number(newValue)
      if (param.minValue && numValue < Number(param.minValue)) {
        throw new Error(`Valor mínimo permitido: ${param.minValue}`)
      }
      if (param.maxValue && numValue > Number(param.maxValue)) {
        throw new Error(`Valor máximo permitido: ${param.maxValue}`)
      }
    }

    // Actualizar con auditoría
    await prisma.$transaction(async tx => {
      await tx.systemParameter.update({
        where: { key },
        data: {
          value: serializedValue,
          lastModifiedBy: userId,
          lastModifiedAt: new Date(),
        },
      })

      await tx.parameterChangeLog.create({
        data: {
          parameterKey: key,
          previousValue: param.value,
          newValue: serializedValue,
          changedBy: userId,
          reason,
        },
      })

      await tx.auditLog.create({
        data: {
          userId,
          action: 'PARAMETER_CHANGED',
          entityType: 'system_parameters',
          entityId: key,
          oldValue: { value: param.value },
          newValue: { value: serializedValue },
        },
      })
    }, TRANSACTION_CONFIG.FAST)

    return this.getByKey(key)
  }

  /**
   * Listar todos los parámetros
   */
  static async listAll() {
    return await prisma.systemParameter.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })
  }

  /**
   * Listar parámetros por categoría
   */
  static async listByCategory(category?: ParameterCategory) {
    return await prisma.systemParameter.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    })
  }

  /**
   * Obtener historial de cambios de un parámetro
   */
  static async getHistory(key: string) {
    return await prisma.parameterChangeLog.findMany({
      where: { parameterKey: key },
      orderBy: { changedAt: 'desc' },
    })
  }

  /**
   * Deserializar valor según tipo
   */
  private static deserializeValue(value: string, type: ParameterType): unknown {
    switch (type) {
      case 'DECIMAL':
        return parseFloat(value)
      case 'INTEGER':
        return parseInt(value, 10)
      case 'BOOLEAN':
        return value === 'true'
      case 'JSON':
        return JSON.parse(value)
      case 'STRING':
      default:
        return value
    }
  }

  /**
   * Obtener parámetros financieros críticos (cache en memoria)
   */
  static async getFinancialParams() {
    return {
      defaultPenaltyRateDaily: await this.getOrDefault('default_penalty_rate_daily', 0.001),
      maxPenaltyRate: await this.getOrDefault('max_penalty_rate', 0.25),
      defaultInterestRateMonthly: await this.getOrDefault('default_interest_rate_monthly', 0.025),
      minLoanAmount: await this.getOrDefault('min_loan_amount', 500),
      maxLoanAmount: await this.getOrDefault('max_loan_amount', 50000),
    }
  }

  /**
   * Obtener parámetros de cobranza
   */
  static async getCollectionParams() {
    return {
      daysBeforeOverdueAlert: await this.getOrDefault('days_before_overdue_alert', 3),
      daysToFirstAction: await this.getOrDefault('days_to_first_collection_action', 1),
      daysToLegalAction: await this.getOrDefault('days_to_legal_action', 90),
      maxPromiseExtensions: await this.getOrDefault('max_promise_extensions', 3),
    }
  }
}
