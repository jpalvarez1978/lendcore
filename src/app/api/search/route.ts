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

    // OPTIMIZACIÓN AGRESIVA: Solo 15 registros, procesamiento ultra-rápido
    const [clients, loans] = await Promise.all([
      canViewClients
        ? prisma.client.findMany({
            take: 15, // Reducido de 30 a 15
            select: {
              id: true,
              type: true,
              phone: true, // Solo phone para búsqueda (menos desencriptación)
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
            take: 15, // Reducido de 30 a 15
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

    // Procesar clientes - ULTRA OPTIMIZADO
    let clientMatches = 0
    for (const client of clients) {
      if (clientMatches >= 6) break // Máximo 6 clientes

      const name = getClientName(client).toLowerCase()

      // Early exit: verificar nombre primero (más común)
      if (name.includes(queryLower)) {
        const phone = decryptSafe(client.phone)
        const taxId = client.type === 'INDIVIDUAL'
          ? decryptSafe(client.individualProfile?.taxId)
          : decryptSafe(client.businessProfile?.taxId)

        results.push({
          id: client.id,
          type: 'client',
          title: getClientName(client),
          subtitle: [taxId, phone].filter(Boolean).join(' • ') || 'Sin identificador',
          url: `/dashboard/clientes/${client.id}`,
          metadata: client.type === 'INDIVIDUAL' ? 'Persona Física' : 'Empresa',
        })
        clientMatches++
        continue
      }

      // Si no matchea nombre, verificar phone y taxId
      const phone = decryptSafe(client.phone).toLowerCase()
      const taxId = (client.type === 'INDIVIDUAL'
        ? decryptSafe(client.individualProfile?.taxId)
        : decryptSafe(client.businessProfile?.taxId)).toLowerCase()

      if (phone.includes(queryLower) || taxId.includes(queryLower)) {
        results.push({
          id: client.id,
          type: 'client',
          title: getClientName(client),
          subtitle: [taxId, phone].filter(Boolean).join(' • ') || 'Sin identificador',
          url: `/dashboard/clientes/${client.id}`,
          metadata: client.type === 'INDIVIDUAL' ? 'Persona Física' : 'Empresa',
        })
        clientMatches++
      }
    }

    // Procesar préstamos - ULTRA OPTIMIZADO
    let loanMatches = 0
    for (const loan of loans) {
      if (loanMatches >= 6) break // Máximo 6 préstamos

      const loanNumber = loan.loanNumber.toLowerCase()
      const clientName = getClientName(loan.client).toLowerCase()

      // Verificar loan number primero (más específico)
      if (loanNumber.includes(queryLower) || clientName.includes(queryLower)) {
        results.push({
          id: loan.id,
          type: 'loan',
          title: `Préstamo ${loan.loanNumber}`,
          subtitle: getClientName(loan.client) || 'Cliente',
          url: `/dashboard/prestamos/${loan.id}`,
          metadata: `${currencyFormatter.format(Number(loan.principalAmount))} • ${loan.status}`,
        })
        loanMatches++
      }
    }

    const elapsed = Date.now() - startTime
    const processingTime = elapsed - dbTime

    console.log(
      `[Search FAST] "${query}" | DB: ${dbTime}ms | Process: ${processingTime}ms | ` +
      `Total: ${elapsed}ms | Results: ${results.length}`
    )

    return NextResponse.json({
      results,
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
