/**
 * Configuración de timeouts para transacciones Prisma
 *
 * Previene bloqueos de base de datos por transacciones largas
 * y mejora la estabilidad del sistema.
 */

/**
 * Configuración estándar para transacciones
 *
 * - maxWait: Tiempo máximo que una transacción esperará para adquirir un lock
 * - timeout: Tiempo máximo de ejecución de la transacción
 */
export const TRANSACTION_CONFIG = {
  /**
   * Para operaciones críticas de dinero (pagos, desembolsos)
   * - Timeout más alto para asegurar completitud
   * - MaxWait conservador para evitar bloqueos
   */
  CRITICAL: {
    maxWait: 5000, // 5 segundos máximo esperando lock
    timeout: 15000, // 15 segundos máximo de ejecución
  },

  /**
   * Para operaciones normales (crear préstamos, clientes)
   * - Balance entre velocidad y confiabilidad
   */
  STANDARD: {
    maxWait: 3000, // 3 segundos esperando lock
    timeout: 10000, // 10 segundos de ejecución
  },

  /**
   * Para operaciones rápidas (actualizar estado, registros simples)
   * - Timeout corto para operaciones que deberían ser instantáneas
   */
  FAST: {
    maxWait: 2000, // 2 segundos esperando lock
    timeout: 5000, // 5 segundos de ejecución
  },
} as const

/**
 * Tipo para configuración de transacción
 */
export type TransactionConfig = {
  maxWait: number
  timeout: number
}
