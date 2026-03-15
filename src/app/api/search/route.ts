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

    // OPTIMIZACIÓN: Solo buscar en clientes y préstamos (los más comunes)
    // Búsqueda paralela ultra-rápida con límite de 20 registros
    const [clients, loans] = await Promise.all([
      canViewClients
        ? prisma.client.findMany({
            take: 20,
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
            take: 20,
            where: {
              loanNumber: {
                contains: query,
                mode: 'insensitive',
              },
            },
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

    // Procesar clientes (filtrado en memoria solo para campos encriptados)
    const queryLower = query.toLowerCase()
    clients
      .filter(client => {
        const name = getClientName(client)
        const email = decryptSafe(client.email)
        const phone = decryptSafe(client.phone)
        const taxId = client.type === 'INDIVIDUAL'
          ? decryptSafe(client.individualProfile?.taxId)
          : decryptSafe(client.businessProfile?.taxId)

        const searchText = `${name} ${taxId} ${email} ${phone} ${client.city || ''}`.toLowerCase()
        return searchText.includes(queryLower)
      })
      .slice(0, 8)
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

    // Procesar préstamos (ya filtrados por BD)
    loans.slice(0, 8).forEach(loan => {
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
    console.log(`[Search] Query: "${query}" | Results: ${results.length} | Time: ${elapsed}ms`)

    return NextResponse.json({
      results: results.slice(0, 16),
      _meta: {
        elapsed,
        count: results.length
      }
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
