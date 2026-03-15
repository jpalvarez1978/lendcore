import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'
import { prisma } from '@/lib/prisma'
import { decryptSafe } from '@/lib/security/encryption'
import { permissionDeniedResponse, sanitizeSearchQuery } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'

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
  individualProfile?: { firstName?: string | null; lastName?: string | null } | null
  businessProfile?: { businessName?: string | null } | null
}) {
  if (client.type === 'INDIVIDUAL') {
    return `${client.individualProfile?.firstName || ''} ${client.individualProfile?.lastName || ''}`.trim()
  }
  return client.businessProfile?.businessName?.trim() || 'Cliente'
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

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

    if (!canViewClients && !canViewLoans) {
      return permissionDeniedResponse(request, session, 'api/search', 'GLOBAL_SEARCH')
    }

    const results: SearchResult[] = []
    const queryLower = query.toLowerCase()

    // Búsqueda paralela optimizada - límite de 30 registros más recientes
    const [clients, loans] = await Promise.all([
      canViewClients
        ? prisma.client.findMany({
            take: 30,
            select: {
              id: true,
              type: true,
              email: true,
              phone: true,
              city: true,
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
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
      canViewLoans
        ? prisma.loan.findMany({
            take: 30,
            select: {
              id: true,
              loanNumber: true,
              status: true,
              principalAmount: true,
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
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ])

    const dbTime = Date.now() - startTime

    // Procesar clientes - filtrado rápido en memoria
    clients
      .filter(client => {
        const name = getClientName(client).toLowerCase()
        const email = decryptSafe(client.email).toLowerCase()
        const phone = decryptSafe(client.phone).toLowerCase()
        const taxId = (client.type === 'INDIVIDUAL'
          ? decryptSafe(client.individualProfile?.taxId)
          : decryptSafe(client.businessProfile?.taxId)).toLowerCase()
        const city = (client.city || '').toLowerCase()

        // Búsqueda rápida: verificar cada campo individualmente
        return (
          name.includes(queryLower) ||
          email.includes(queryLower) ||
          phone.includes(queryLower) ||
          taxId.includes(queryLower) ||
          city.includes(queryLower)
        )
      })
      .slice(0, 10)
      .forEach(client => {
        const name = getClientName(client)
        const phone = decryptSafe(client.phone)
        const taxId = client.type === 'INDIVIDUAL'
          ? decryptSafe(client.individualProfile?.taxId)
          : decryptSafe(client.businessProfile?.taxId)

        results.push({
          id: client.id,
          type: 'client',
          title: name || 'Cliente',
          subtitle: [taxId, phone].filter(Boolean).join(' • ') || 'Sin identificador',
          url: `/dashboard/clientes/${client.id}`,
          metadata: client.type === 'INDIVIDUAL' ? 'Persona Física' : 'Empresa',
        })
      })

    // Procesar préstamos - filtrar por nombre de cliente Y número de préstamo
    loans
      .filter(loan => {
        const loanNumber = loan.loanNumber.toLowerCase()
        const clientName = getClientName(loan.client).toLowerCase()
        const status = loan.status.toLowerCase()

        // Buscar en número de préstamo, nombre de cliente, o estado
        return (
          loanNumber.includes(queryLower) ||
          clientName.includes(queryLower) ||
          status.includes(queryLower)
        )
      })
      .slice(0, 10)
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

    const elapsed = Date.now() - startTime
    const processingTime = elapsed - dbTime

    console.log(
      `[Search] Query: "${query}" | Clients: ${clients.length} | Loans: ${loans.length} | ` +
      `Results: ${results.length} | DB: ${dbTime}ms | Processing: ${processingTime}ms | Total: ${elapsed}ms`
    )

    return NextResponse.json({
      results: results.slice(0, 20),
      _meta: {
        elapsed,
        dbTime,
        processingTime,
        count: results.length,
      },
    })
  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error(`[Search] Error after ${elapsed}ms:`, error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al buscar' },
      { status: 500 }
    )
  }
}
