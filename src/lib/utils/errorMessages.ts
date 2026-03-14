import { ZodError } from 'zod'

/**
 * Mensajes de error específicos y útiles
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getErrorMessage(error: unknown, fallback: string = 'Error inesperado'): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  return fallback
}

export function isZodValidationError(error: unknown): error is ZodError {
  return error instanceof ZodError
}

/**
 * Errores de validación
 */
export const ValidationErrors = {
  REQUIRED_FIELD: (field: string) => `El campo ${field} es requerido`,

  INVALID_EMAIL: (email: string) =>
    `El email "${email}" no es válido. Formato esperado: usuario@dominio.com`,

  INVALID_DNI: (dni: string) =>
    `El DNI "${dni}" no es válido. Debe tener formato: 12345678A`,

  INVALID_NIE: (nie: string) =>
    `El NIE "${nie}" no es válido. Debe tener formato: X1234567A`,

  INVALID_CIF: (cif: string) =>
    `El CIF "${cif}" no es válido. Debe tener formato: B12345678`,

  INVALID_PHONE: (phone: string) =>
    `El teléfono "${phone}" no es válido. Debe tener al menos 9 dígitos`,

  INVALID_POSTAL_CODE: (code: string) =>
    `El código postal "${code}" no es válido. Debe tener 5 dígitos`,

  MIN_AMOUNT: (amount: number, min: number) =>
    `El monto ${amount}€ es inferior al mínimo permitido de ${min}€`,

  MAX_AMOUNT: (amount: number, max: number) =>
    `El monto ${amount}€ supera el máximo permitido de ${max}€`,

  AMOUNT_RANGE: (min: number, max: number) =>
    `El monto debe estar entre ${min}€ y ${max}€`,

  MIN_LENGTH: (field: string, min: number) =>
    `${field} debe tener al menos ${min} caracteres`,

  MAX_LENGTH: (field: string, max: number) =>
    `${field} no puede tener más de ${max} caracteres`,
}

/**
 * Errores de duplicados
 */
export const DuplicateErrors = {
  EXISTING_DNI: (dni: string, clientName?: string) =>
    clientName
      ? `El DNI ${dni} ya está registrado para el cliente "${clientName}"`
      : `El DNI ${dni} ya existe en el sistema`,

  EXISTING_CIF: (cif: string, businessName?: string) =>
    businessName
      ? `El CIF ${cif} ya está registrado para "${businessName}"`
      : `El CIF ${cif} ya existe en el sistema`,

  EXISTING_EMAIL: (email: string) =>
    `El email ${email} ya está registrado en el sistema`,

  EXISTING_LOAN: (loanNumber: string) =>
    `El préstamo #${loanNumber} ya existe`,
}

/**
 * Errores de negocio
 */
export const BusinessErrors = {
  INSUFFICIENT_CREDIT: (available: number, requested: number) =>
    `Cupo insuficiente. Disponible: ${available}€, Solicitado: ${requested}€`,

  CREDIT_LIMIT_EXCEEDED: (limit: number, requested: number) =>
    `El monto solicitado (${requested}€) supera el límite de crédito (${limit}€)`,

  LOAN_NOT_ACTIVE: (loanNumber: string) =>
    `El préstamo #${loanNumber} no está activo`,

  PAYMENT_EXCEEDS_BALANCE: (payment: number, balance: number) =>
    `El pago de ${payment}€ supera el saldo pendiente de ${balance}€`,

  INVALID_PAYMENT_DATE: (date: string, reason: string) =>
    `La fecha de pago ${date} no es válida: ${reason}`,

  PROMISE_ALREADY_EXISTS: (date: string) =>
    `Ya existe una promesa de pago para la fecha ${date}`,

  MAX_PROMISES_REACHED: (max: number) =>
    `Se alcanzó el límite máximo de ${max} promesas de pago`,

  CLIENT_BLOCKED: (reason: string) =>
    `El cliente está bloqueado: ${reason}`,

  LOAN_ALREADY_PAID: (loanNumber: string) =>
    `El préstamo #${loanNumber} ya fue pagado en su totalidad`,
}

/**
 * Errores de autenticación
 */
export const AuthErrors = {
  INVALID_CREDENTIALS: 'Email o contraseña incorrectos',

  ACCOUNT_LOCKED: (until: string) =>
    `Cuenta bloqueada hasta ${until} por múltiples intentos fallidos`,

  SESSION_EXPIRED: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente',

  INSUFFICIENT_PERMISSIONS: (required: string) =>
    `No tienes permisos suficientes. Se requiere: ${required}`,

  INACTIVE_USER: 'Tu cuenta está inactiva. Contacta al administrador',
}

/**
 * Formatear error de Prisma a mensaje legible
 */
export function formatPrismaError(error: unknown): string {
  if (!isRecord(error)) {
    return 'Error en la base de datos'
  }

  const code = typeof error.code === 'string' ? error.code : undefined
  if (code === 'P2002') {
    const meta = isRecord(error.meta) ? error.meta : undefined
    const target = Array.isArray(meta?.target) ? meta?.target : undefined
    const field = typeof target?.[0] === 'string' ? target[0] : 'campo'
    return `Ya existe un registro con este ${field}`
  }

  if (code === 'P2025') {
    return 'El registro que intentas modificar no existe'
  }

  if (code === 'P2003') {
    return 'No se puede eliminar este registro porque está siendo usado en otro lugar'
  }

  return 'Error en la base de datos'
}

/**
 * Formatear error de Zod a mensaje legible
 */
export function formatZodError(error: unknown): string {
  if (error instanceof ZodError && error.issues[0]) {
    const firstError = error.issues[0]
    const field = firstError.path.join('.')
    return `${field}: ${firstError.message}`
  }
  return 'Datos inválidos'
}

/**
 * Helper para lanzar errores específicos
 */
export function throwValidationError(
  message: string,
  code?: string,
  details?: Record<string, unknown>
): never {
  throw new AppError(message, code, details)
}

export function throwBusinessError(message: string, code?: string): never {
  throw new AppError(message, code)
}

export function throwAuthError(message: string): never {
  throw new AppError(message, 'AUTH_ERROR')
}
