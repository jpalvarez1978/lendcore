import { ClientStatus, LoanStatus, ApplicationStatus, RiskLevel, InstallmentStatus } from '@prisma/client'

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  BLOCKED: 'Bloqueado',
  UNDER_REVIEW: 'En Revisión',
}

export const CLIENT_STATUS_COLORS: Record<ClientStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  BLOCKED: 'bg-red-100 text-red-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
}

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  ACTIVE: 'Activo',
  PAID: 'Pagado',
  DEFAULTED: 'Vencido',
  RESTRUCTURED: 'Reestructurado',
  CANCELLED: 'Cancelado',
}

export const LOAN_STATUS_COLORS: Record<LoanStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PAID: 'bg-blue-100 text-blue-800',
  DEFAULTED: 'bg-red-100 text-red-800',
  RESTRUCTURED: 'bg-orange-100 text-orange-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: 'Borrador',
  UNDER_REVIEW: 'En Revisión',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  DISBURSED: 'Desembolsado',
  CANCELLED: 'Cancelado',
}

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  DISBURSED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
}

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  LOW: 'Bajo',
  MEDIUM: 'Medio',
  HIGH: 'Alto',
  CRITICAL: 'Crítico',
}

export const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
}

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  OVERDUE: 'Vencido',
  PARTIAL: 'Pago Parcial',
}

export const INSTALLMENT_STATUS_COLORS: Record<InstallmentStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-800',
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  PARTIAL: 'bg-yellow-100 text-yellow-800',
}
