import { UserRole } from '@prisma/client'

export const PERMISSIONS = {
  // Clientes
  CLIENTS_VIEW: [UserRole.ADMIN, UserRole.ANALYST, UserRole.COLLECTION, UserRole.VIEWER],
  CLIENTS_CREATE: [UserRole.ADMIN, UserRole.ANALYST],
  CLIENTS_EDIT: [UserRole.ADMIN, UserRole.ANALYST],
  CLIENTS_DELETE: [UserRole.ADMIN],

  // Solicitudes
  APPLICATIONS_VIEW: [UserRole.ADMIN, UserRole.ANALYST, UserRole.COLLECTION, UserRole.VIEWER],
  APPLICATIONS_CREATE: [UserRole.ADMIN, UserRole.ANALYST],
  APPLICATIONS_APPROVE: [UserRole.ADMIN],
  APPLICATIONS_REJECT: [UserRole.ADMIN],

  // Préstamos
  LOANS_VIEW: [UserRole.ADMIN, UserRole.ANALYST, UserRole.COLLECTION, UserRole.VIEWER],
  LOANS_CREATE: [UserRole.ADMIN, UserRole.ANALYST],
  LOANS_EDIT: [UserRole.ADMIN, UserRole.ANALYST],
  LOANS_DELETE: [UserRole.ADMIN],

  // Pagos
  PAYMENTS_VIEW: [UserRole.ADMIN, UserRole.ANALYST, UserRole.COLLECTION, UserRole.VIEWER],
  PAYMENTS_REGISTER: [UserRole.ADMIN, UserRole.ANALYST, UserRole.COLLECTION],
  PAYMENTS_EDIT: [UserRole.ADMIN],
  PAYMENTS_DELETE: [UserRole.ADMIN],

  // Cobranza
  COLLECTION_VIEW: [UserRole.ADMIN, UserRole.ANALYST, UserRole.COLLECTION, UserRole.VIEWER],
  COLLECTION_CREATE: [UserRole.ADMIN, UserRole.ANALYST, UserRole.COLLECTION],
  COLLECTION_EDIT: [UserRole.ADMIN, UserRole.COLLECTION],

  // Configuración
  USERS_MANAGE: [UserRole.ADMIN],
  SETTINGS_MANAGE: [UserRole.ADMIN],
  AUDIT_VIEW: [UserRole.ADMIN],

  // Reportes
  REPORTS_VIEW: [UserRole.ADMIN, UserRole.ANALYST, UserRole.COLLECTION, UserRole.VIEWER],
  REPORTS_EXPORT: [UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER],
} as const

export type AppPermission = keyof typeof PERMISSIONS

export function hasPermission(userRole: UserRole, permission: AppPermission): boolean {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(userRole)
}

export function canAccessPermission(
  userRole: UserRole | null | undefined,
  permission?: AppPermission
): boolean {
  if (!permission) return true
  if (!userRole) return false

  return hasPermission(userRole, permission)
}
