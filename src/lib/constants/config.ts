import { BRAND } from '@/lib/constants/brand'
import type { AppPermission } from '@/lib/constants/permissions'

export const APP_CONFIG = {
  name: BRAND.name,
  shortName: BRAND.shortName,
  descriptor: BRAND.descriptor,
  description: BRAND.description,
  locale: 'es-ES',
  currency: 'EUR',
  timezone: 'Europe/Madrid',
} as const

export const PAGINATION = {
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
} as const

export const LOAN_CONFIG = {
  minAmount: 100,
  maxAmount: 500000,
  minTermMonths: 1,
  maxTermMonths: 120,
  defaultInterestRate: 0.035, // 3.5% mensual
  penaltyRatePerDay: 0.001, // 0.1% diario
} as const

export const NAVIGATION_ITEMS = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
  },
  {
    title: 'Clientes',
    href: '/dashboard/clientes',
    icon: 'Users',
    permission: 'CLIENTS_VIEW' as AppPermission,
  },
  {
    title: 'Operaciones',
    icon: 'Briefcase',
    children: [
      {
        title: 'Solicitudes',
        href: '/dashboard/solicitudes',
        icon: 'FileText',
        permission: 'APPLICATIONS_VIEW' as AppPermission,
      },
      {
        title: 'Préstamos',
        href: '/dashboard/prestamos',
        icon: 'CreditCard',
        permission: 'LOANS_VIEW' as AppPermission,
      },
      {
        title: 'Pagos',
        href: '/dashboard/pagos',
        icon: 'WalletCards',
        permission: 'PAYMENTS_VIEW' as AppPermission,
      },
    ],
  },
  {
    title: 'Cobranza',
    href: '/dashboard/cobranza',
    icon: 'Bell',
    permission: 'COLLECTION_VIEW' as AppPermission,
  },
  {
    title: 'Reportes',
    href: '/dashboard/reportes',
    icon: 'BarChart3',
    permission: 'REPORTS_VIEW' as AppPermission,
  },
  {
    title: 'Configuración',
    href: '/dashboard/configuracion',
    icon: 'Settings',
    permission: 'SETTINGS_MANAGE' as AppPermission,
  },
] as const

export const QUICK_ACTIONS = [
  {
    label: 'Nuevo cliente',
    href: '/dashboard/clientes/nuevo',
    icon: 'User',
    permission: 'CLIENTS_CREATE' as AppPermission,
  },
  {
    label: 'Nuevo préstamo',
    href: '/dashboard/prestamos/nuevo',
    icon: 'DollarSign',
    permission: 'LOANS_CREATE' as AppPermission,
  },
  {
    label: 'Registrar pago',
    href: '/dashboard/pagos/nuevo',
    icon: 'TrendingUp',
    permission: 'PAYMENTS_REGISTER' as AppPermission,
  },
  {
    label: 'Cobranza',
    href: '/dashboard/cobranza',
    icon: 'Calendar',
    permission: 'COLLECTION_VIEW' as AppPermission,
  },
] as const
