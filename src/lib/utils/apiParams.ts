/**
 * Utilidades para validación segura de parámetros de API
 * Previene ataques DoS por parámetros maliciosos
 */

/**
 * Valida y limita un parámetro numérico dentro de un rango seguro
 *
 * @param value - Valor del parámetro (string | null)
 * @param defaultValue - Valor por defecto si el parámetro es inválido
 * @param min - Valor mínimo permitido
 * @param max - Valor máximo permitido
 * @returns Número validado dentro del rango
 *
 * @example
 * ```typescript
 * const page = clampIntegerParam(searchParams.get('page'), 1, 1, 1000)
 * const pageSize = clampIntegerParam(searchParams.get('pageSize'), 50, 1, 100)
 * ```
 */
export function clampIntegerParam(
  value: string | null,
  defaultValue: number,
  min: number,
  max: number
): number {
  // Parse to integer
  const parsed = parseInt(value || '', 10)

  // Return default if invalid
  if (isNaN(parsed) || !isFinite(parsed)) {
    return defaultValue
  }

  // Clamp to range [min, max]
  return Math.max(min, Math.min(max, parsed))
}

/**
 * Valida un parámetro de fecha
 *
 * @param value - Valor del parámetro (string | null)
 * @param defaultValue - Valor por defecto si el parámetro es inválido
 * @returns Date validado
 *
 * @example
 * ```typescript
 * const startDate = validateDateParam(searchParams.get('startDate'), new Date())
 * ```
 */
export function validateDateParam(
  value: string | null,
  defaultValue: Date
): Date {
  if (!value) return defaultValue

  const parsed = new Date(value)

  // Check if valid date
  if (isNaN(parsed.getTime())) {
    return defaultValue
  }

  // Check if reasonable (not before 2000, not after 2100)
  const year = parsed.getFullYear()
  if (year < 2000 || year > 2100) {
    return defaultValue
  }

  return parsed
}

/**
 * Valida un parámetro enum
 *
 * @param value - Valor del parámetro
 * @param allowedValues - Valores permitidos
 * @param defaultValue - Valor por defecto
 * @returns Valor validado
 *
 * @example
 * ```typescript
 * const status = validateEnumParam(
 *   searchParams.get('status'),
 *   ['ACTIVE', 'PAID', 'DEFAULTED'],
 *   'ACTIVE'
 * )
 * ```
 */
export function validateEnumParam<T extends string>(
  value: string | null,
  allowedValues: readonly T[],
  defaultValue: T
): T {
  if (!value) return defaultValue

  if (allowedValues.includes(value as T)) {
    return value as T
  }

  return defaultValue
}

/**
 * Valida un parámetro booleano
 *
 * @param value - Valor del parámetro
 * @param defaultValue - Valor por defecto
 * @returns Boolean validado
 *
 * @example
 * ```typescript
 * const includeArchived = validateBooleanParam(searchParams.get('archived'), false)
 * ```
 */
export function validateBooleanParam(
  value: string | null,
  defaultValue: boolean
): boolean {
  if (!value) return defaultValue

  const lower = value.toLowerCase()

  if (lower === 'true' || lower === '1' || lower === 'yes') {
    return true
  }

  if (lower === 'false' || lower === '0' || lower === 'no') {
    return false
  }

  return defaultValue
}

/**
 * Constantes de paginación seguras
 */
export const PAGINATION_LIMITS = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 50,
  MIN_PAGE: 1,
  MAX_PAGE: 10000,
  MIN_PAGE_SIZE: 1,
  MAX_PAGE_SIZE: 100,
} as const
