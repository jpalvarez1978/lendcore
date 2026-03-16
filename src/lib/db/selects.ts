/**
 * Selectores Prisma optimizados para reducir transferencia de datos
 *
 * Define los campos específicos necesarios para cada caso de uso,
 * evitando traer todos los campos cuando no son necesarios.
 */

import type { Prisma } from '@prisma/client'

/**
 * Select para listados de clientes (card view)
 * Incluye solo campos necesarios para mostrar en listas
 */
export const clientListSelect = {
  id: true,
  type: true,
  email: true,
  phone: true,
  status: true,
  riskLevel: true,
  creditLimit: true,
  internalScore: true,
  createdAt: true,
  individualProfile: {
    select: {
      firstName: true,
      lastName: true,
      taxId: true,
    },
  },
  businessProfile: {
    select: {
      businessName: true,
      taxId: true,
    },
  },
} satisfies Prisma.ClientSelect

/**
 * Select para detalles completos de cliente
 * Incluye todos los campos necesarios para vista de detalle
 */
export const clientDetailSelect = {
  id: true,
  type: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  postalCode: true,
  status: true,
  riskLevel: true,
  creditLimit: true,
  internalScore: true,
  createdAt: true,
  updatedAt: true,
  individualProfile: true,
  businessProfile: true,
} satisfies Prisma.ClientSelect

/**
 * Select para listados de préstamos (card view)
 * Incluye solo campos necesarios para mostrar en listas
 */
export const loanListSelect = {
  id: true,
  loanNumber: true,
  status: true,
  principalAmount: true,
  totalPending: true,
  totalInterest: true,
  interestRate: true,
  interestType: true,
  termMonths: true,
  disbursementDate: true,
  client: {
    select: {
      id: true,
      type: true,
      individualProfile: {
        select: {
          firstName: true,
          lastName: true,
          taxId: true,
        },
      },
      businessProfile: {
        select: {
          businessName: true,
          taxId: true,
        },
      },
    },
  },
} satisfies Prisma.LoanSelect

/**
 * Select para listados de pagos
 * Incluye solo campos necesarios para mostrar en listas
 */
export const paymentListSelect = {
  id: true,
  amount: true,
  paymentMethod: true,
  reference: true,
  paidAt: true,
  loan: {
    select: {
      id: true,
      loanNumber: true,
      client: {
        select: {
          id: true,
          type: true,
          individualProfile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          businessProfile: {
            select: {
              businessName: true,
            },
          },
        },
      },
    },
  },
  processedBy: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.PaymentSelect

/**
 * Select para listados de solicitudes de crédito
 */
export const applicationListSelect = {
  id: true,
  applicationNumber: true,
  status: true,
  requestedAmount: true,
  termMonths: true,
  paymentFrequency: true,
  proposedRate: true,
  createdAt: true,
  client: {
    select: {
      id: true,
      type: true,
      individualProfile: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      businessProfile: {
        select: {
          businessName: true,
        },
      },
    },
  },
} satisfies Prisma.CreditApplicationSelect

/**
 * Select para usuarios (omite password hash)
 * CRÍTICO: Nunca incluir passwordHash en selects
 */
export const userSafeSelect = {
  id: true,
  email: true,
  name: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  // passwordHash: NEVER include this
} satisfies Prisma.UserSelect

/**
 * Select minimal para referencias (solo id y nombre)
 * Útil para dropdowns y referencias
 */
export const clientReferenceSelect = {
  id: true,
  type: true,
  individualProfile: {
    select: {
      firstName: true,
      lastName: true,
    },
  },
  businessProfile: {
    select: {
      businessName: true,
    },
  },
} satisfies Prisma.ClientSelect
