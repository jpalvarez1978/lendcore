import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'
import { prisma } from '@/lib/prisma'
import { decryptSafe } from '@/lib/security/encryption'
import { permissionDeniedResponse, sanitizeSearchQuery } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { matchesSearchTerm } from '@/lib/utils/search'

type SearchResultType = 'client' | 'loan' | 'payment' | 'application' | 'promise'

interface SearchResult {
  id: string
  type: SearchResultType
  title: string
  subtitle: string
  url: string
  metadata?: string
}

const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
})

function getClientName(client: {
  type: 'INDIVIDUAL' | 'BUSINESS'
  individualProfile?: { firstName?: string | null; lastName?: string | null; taxId?: string | null } | null
  businessProfile?: { businessName?: string | null; taxId?: string | null } | null
}) {
  if (client.type === 'INDIVIDUAL') {
    return `${client.individualProfile?.firstName || ''} ${client.individualProfile?.lastName || ''}`.trim()
  }

  return client.businessProfile?.businessName?.trim() || 'Cliente'
}

function getClientTaxId(client: {
  type: 'INDIVIDUAL' | 'BUSINESS'
  individualProfile?: { taxId?: string | null } | null
  businessProfile?: { taxId?: string | null } | null
}) {
  return client.type === 'INDIVIDUAL'
    ? decryptSafe(client.individualProfile?.taxId)
    : decryptSafe(client.businessProfile?.taxId)
}

function getClientTypeLabel(type: 'INDIVIDUAL' | 'BUSINESS') {
  return type === 'INDIVIDUAL' ? 'Persona Física' : 'Empresa'
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const query = sanitizeSearchQuery(request.nextUrl.searchParams.get('q'))

    if (query.trim().length < 2) {
      return NextResponse.json({ results: [] })
    }

    const canViewClients = hasPermission(session.user.role, 'CLIENTS_VIEW')
    const canViewLoans = hasPermission(session.user.role, 'LOANS_VIEW')
    const canViewPayments = hasPermission(session.user.role, 'PAYMENTS_VIEW')
    const canViewApplications = hasPermission(session.user.role, 'APPLICATIONS_VIEW')
    const canViewPromises = hasPermission(session.user.role, 'COLLECTION_VIEW')

    if (
      !canViewClients &&
      !canViewLoans &&
      !canViewPayments &&
      !canViewApplications &&
      !canViewPromises
    ) {
      return permissionDeniedResponse(request, session, 'api/search', 'GLOBAL_SEARCH')
    }

    const [clients, loans, payments, applications, promises] = await Promise.all([
      canViewClients
        ? prisma.client.findMany({
            include: {
              individualProfile: true,
              businessProfile: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
      canViewLoans
        ? prisma.loan.findMany({
            include: {
              client: {
                include: {
                  individualProfile: true,
                  businessProfile: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
      canViewPayments
        ? prisma.payment.findMany({
            include: {
              loan: {
                include: {
                  client: {
                    include: {
                      individualProfile: true,
                      businessProfile: true,
                    },
                  },
                },
              },
            },
            orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
          })
        : Promise.resolve([]),
      canViewApplications
        ? prisma.creditApplication.findMany({
            include: {
              client: {
                include: {
                  individualProfile: true,
                  businessProfile: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
      canViewPromises
        ? prisma.paymentPromise.findMany({
            include: {
              client: {
                include: {
                  individualProfile: true,
                  businessProfile: true,
                },
              },
            },
            orderBy: { promiseDate: 'desc' },
          })
        : Promise.resolve([]),
    ])

    const results: SearchResult[] = []

    clients
      .filter(client => {
        const name = getClientName(client)
        const taxId = getClientTaxId(client)
        const email = decryptSafe(client.email)
        const phone = decryptSafe(client.phone)

        return matchesSearchTerm(query, [name, taxId, email, phone, client.city])
      })
      .slice(0, 6)
      .forEach(client => {
        const name = getClientName(client)
        const taxId = getClientTaxId(client)
        const phone = decryptSafe(client.phone)

        results.push({
          id: client.id,
          type: 'client',
          title: name || 'Cliente',
          subtitle: [taxId, phone].filter(Boolean).join(' • ') || 'Sin identificador visible',
          url: `/dashboard/clientes/${client.id}`,
          metadata: getClientTypeLabel(client.type),
        })
      })

    loans
      .filter(loan => {
        const clientName = getClientName(loan.client)
        const clientTaxId = getClientTaxId(loan.client)
        const clientPhone = decryptSafe(loan.client.phone)

        return matchesSearchTerm(query, [
          loan.loanNumber,
          loan.status,
          clientName,
          clientTaxId,
          clientPhone,
        ])
      })
      .slice(0, 6)
      .forEach(loan => {
        const clientName = getClientName(loan.client)

        results.push({
          id: loan.id,
          type: 'loan',
          title: `Préstamo ${loan.loanNumber}`,
          subtitle: clientName || 'Cliente',
          url: `/dashboard/prestamos/${loan.id}`,
          metadata: `${currencyFormatter.format(Number(loan.principalAmount))} • ${loan.status}`,
        })
      })

    payments
      .filter(payment => {
        const clientName = getClientName(payment.loan.client)
        const clientTaxId = getClientTaxId(payment.loan.client)
        const paymentCode = payment.reference || payment.id

        return matchesSearchTerm(query, [
          paymentCode,
          payment.paymentMethod,
          payment.loan.loanNumber,
          clientName,
          clientTaxId,
          payment.notes,
        ])
      })
      .slice(0, 6)
      .forEach(payment => {
        const clientName = getClientName(payment.loan.client)

        results.push({
          id: payment.id,
          type: 'payment',
          title: `Pago ${payment.reference || payment.id.slice(0, 8)}`,
          subtitle: `${clientName} • ${payment.loan.loanNumber}`,
          url: `/dashboard/clientes/${payment.loan.clientId}`,
          metadata: `${currencyFormatter.format(Number(payment.amount))} • ${new Date(payment.paidAt).toLocaleDateString('es-ES')}`,
        })
      })

    applications
      .filter(application => {
        const clientName = getClientName(application.client)
        const clientTaxId = getClientTaxId(application.client)

        return matchesSearchTerm(query, [
          application.id,
          application.status,
          application.purpose,
          clientName,
          clientTaxId,
          Number(application.requestedAmount),
        ])
      })
      .slice(0, 4)
      .forEach(application => {
        const clientName = getClientName(application.client)

        results.push({
          id: application.id,
          type: 'application',
          title: `Solicitud ${application.id.slice(0, 8)}`,
          subtitle: clientName || 'Cliente',
          url: `/dashboard/solicitudes/${application.id}`,
          metadata: `${currencyFormatter.format(Number(application.requestedAmount))} • ${application.status}`,
        })
      })

    promises
      .filter(promise => {
        const clientName = getClientName(promise.client)
        const clientTaxId = getClientTaxId(promise.client)

        return matchesSearchTerm(query, [
          promise.id,
          promise.status,
          promise.notes,
          clientName,
          clientTaxId,
          Number(promise.promisedAmount),
        ])
      })
      .slice(0, 4)
      .forEach(promise => {
        const clientName = getClientName(promise.client)

        results.push({
          id: promise.id,
          type: 'promise',
          title: `Promesa ${promise.id.slice(0, 8)}`,
          subtitle: clientName || 'Cliente',
          url: '/dashboard/cobranza',
          metadata: `${currencyFormatter.format(Number(promise.promisedAmount))} • ${promise.status}`,
        })
      })

    return NextResponse.json({ results: results.slice(0, 20) })
  } catch (error) {
    console.error('Search error:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al buscar' },
      { status: 500 }
    )
  }
}
