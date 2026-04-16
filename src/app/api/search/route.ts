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
    const q = query.trim()

    // ── Búsqueda a nivel de base de datos (busca en TODOS los registros) ───
    const [clients, loans] = await Promise.all([
      canViewClients
        ? prisma.client.findMany({
            where: {
              OR: [
                { individualProfile: { firstName: { contains: q, mode: 'insensitive' } } },
                { individualProfile: { lastName:  { contains: q, mode: 'insensitive' } } },
                { businessProfile:   { businessName: { contains: q, mode: 'insensitive' } } },
                { businessProfile:   { legalRepName: { contains: q, mode: 'insensitive' } } },
                { city: { contains: q, mode: 'insensitive' } },
              ],
            },
            take: 8,
            select: {
              id: true,
              type: true,
              city: true,
              phone: true,
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
            where: {
              OR: [
                { loanNumber: { contains: q, mode: 'insensitive' } },
                { client: { individualProfile: { firstName: { contains: q, mode: 'insensitive' } } } },
                { client: { individualProfile: { lastName:  { contains: q, mode: 'insensitive' } } } },
                { client: { businessProfile:   { businessName: { contains: q, mode: 'insensitive' } } } },
              ],
            },
            take: 6,
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

    // ── Mapear clientes a resultados ──────────────────────────────────────
    for (const client of clients) {
      const taxId = client.type === 'INDIVIDUAL'
        ? decryptSafe(client.individualProfile?.taxId)
        : decryptSafe(client.businessProfile?.taxId)

      results.push({
        id: client.id,
        type: 'client',
        title: getClientName(client),
        subtitle: [taxId, client.city].filter(Boolean).join(' • ') || 'Sin identificador',
        url: `/dashboard/clientes/${client.id}`,
        metadata: client.type === 'INDIVIDUAL' ? 'Persona Física' : 'Empresa',
      })
    }

    // ── Mapear préstamos a resultados ─────────────────────────────────────
    for (const loan of loans) {
      results.push({
        id: loan.id,
        type: 'loan',
        title: `Préstamo ${loan.loanNumber}`,
        subtitle: getClientName(loan.client) || 'Cliente',
        url: `/dashboard/prestamos/${loan.id}`,
        metadata: `${currencyFormatter.format(Number(loan.principalAmount))} • ${loan.status}`,
      })
    }

    return NextResponse.json({
      results,
      count: results.length,
    })
  } catch (error) {
    console.error('[Search] Error:', error)

    return NextResponse.json(
      { error: 'Error al buscar' },
      { status: 500 }
    )
  }
}
