import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Suspense } from 'react'
import { LoanStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { LoansExplorer } from '@/components/loans/LoansExplorer'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'
import { LoanService } from '@/services/loanService'
import { decryptSafe } from '@/lib/security/encryption'
import { Skeleton } from '@/components/ui/skeleton'

// Página completamente dinámica — los searchParams cambian en cada request
export const dynamic = 'force-dynamic'

interface PageSearchParams {
  q?:      string
  status?: string
  page?:   string
}

function LoansLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

async function LoansContent({ searchParams }: { searchParams: PageSearchParams }) {
  const session = await auth()

  // ── Parsear y validar searchParams ────────────────────────────────────────
  const search   = searchParams.q?.trim() || undefined
  const rawStatus = searchParams.status
  const status   = rawStatus && Object.values(LoanStatus).includes(rawStatus as LoanStatus)
    ? (rawStatus as LoanStatus)
    : undefined
  const page = Math.max(1, parseInt(searchParams.page ?? '1') || 1)

  // ── Query con búsqueda + filtro + paginación en servidor ──────────────────
  const loansResult = await LoanService.getAll({
    search,
    status,
    page,
    pageSize: 25,
  })

  const canCreateLoan =
    session?.user?.role ? hasPermission(session.user.role, 'LOANS_CREATE') : false
  const canRegisterPayment =
    session?.user?.role ? hasPermission(session.user.role, 'PAYMENTS_REGISTER') : false

  // Desencriptar taxId antes de pasar al cliente
  const serializedLoans = loansResult.data.map(loan => ({
    id:            loan.id,
    loanNumber:    loan.loanNumber,
    status:        loan.status,
    clientName:
      loan.client.type === 'INDIVIDUAL'
        ? `${loan.client.individualProfile?.firstName || ''} ${loan.client.individualProfile?.lastName || ''}`.trim()
        : loan.client.businessProfile?.businessName || 'Cliente',
    clientTaxId:
      loan.client.type === 'INDIVIDUAL'
        ? decryptSafe(loan.client.individualProfile?.taxId)
        : decryptSafe(loan.client.businessProfile?.taxId),
    principalAmount: Number(loan.principalAmount),
    totalPending:    Number(loan.totalPending   || 0),
    totalInterest:   Number(loan.totalInterest  || 0),
    interestRate:    Number(loan.interestRate),
    interestType:    loan.interestType,
    termMonths:      loan.termMonths,
    disbursementDate: loan.disbursementDate.toISOString(),
  }))

  return (
    <LoansExplorer
      loans={serializedLoans}
      pagination={loansResult.pagination}
      stats={loansResult.stats}
      currentSearch={search ?? ''}
      currentStatus={rawStatus ?? ''}
      canCreateLoan={canCreateLoan}
      canRegisterPayment={canRegisterPayment}
    />
  )
}

export default async function PrestamosPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>
}) {
  const session           = await auth()
  const resolvedParams    = await searchParams
  const canCreateLoan     =
    session?.user?.role ? hasPermission(session.user.role, 'LOANS_CREATE') : false

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Préstamos</h1>
          <p className="text-muted-foreground">Gestión de préstamos activos e históricos</p>
        </div>
        {canCreateLoan && (
          <Link href="/dashboard/prestamos/nuevo" className="w-full lg:w-auto">
            <Button className="w-full rounded-xl lg:w-auto">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Nuevo Préstamo
            </Button>
          </Link>
        )}
      </div>

      {/*
        key={JSON.stringify(resolvedParams)} fuerza un nuevo Suspense boundary
        cada vez que cambian los params, mostrando el skeleton mientras carga la
        nueva página/búsqueda. Sin esto, la UI anterior permanece visible hasta
        que los nuevos datos lleguen sin ningún indicador de carga.
      */}
      <Suspense
        key={JSON.stringify(resolvedParams)}
        fallback={<LoansLoadingSkeleton />}
      >
        <LoansContent searchParams={resolvedParams} />
      </Suspense>
    </div>
  )
}
