import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { ClientsExplorer } from '@/components/clients/ClientsExplorer'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'
import { ClientService } from '@/services/clientService'
import { Skeleton } from '@/components/ui/skeleton'

// Página completamente dinámica — los searchParams cambian en cada request
export const dynamic = 'force-dynamic'

interface PageSearchParams {
  q?:    string
  page?: string
}

function ClientsLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  )
}

async function ClientsContent({ searchParams }: { searchParams: PageSearchParams }) {
  const search = searchParams.q?.trim() || undefined
  const page   = Math.max(1, parseInt(searchParams.page ?? '1') || 1)

  const result = await ClientService.getAll({ search, page, pageSize: 25 })

  const serializedClients = result.data.map(client => ({
    id:        client.id,
    type:      client.type,
    status:    client.status,
    riskLevel: client.riskLevel,
    name:
      client.type === 'INDIVIDUAL'
        ? `${client.individualProfile?.firstName || ''} ${client.individualProfile?.lastName || ''}`.trim()
        : client.businessProfile?.businessName || 'Cliente',
    taxId:
      client.type === 'INDIVIDUAL'
        ? client.individualProfile?.taxId || ''
        : client.businessProfile?.taxId  || '',
    email:         client.email        || '',
    phone:         client.phone        || '',
    creditLimit:   Number(client.creditLimit   || 0),
    activeLoans:   client._count.loans,
    internalScore: client.internalScore ?? null,
  }))

  return (
    <ClientsExplorer
      clients={serializedClients}
      pagination={result.pagination}
      stats={result.stats}
      currentSearch={search ?? ''}
    />
  )
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>
}) {
  const session         = await auth()
  const resolvedParams  = await searchParams
  const canCreateClient =
    session?.user?.role ? hasPermission(session.user.role, 'CLIENTS_CREATE') : false

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gestión de clientes personas y empresas</p>
        </div>
        {canCreateClient && (
          <Link href="/dashboard/clientes/nuevo" className="w-full lg:w-auto">
            <Button className="w-full rounded-xl lg:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </Link>
        )}
      </div>

      {/*
        SIN key en Suspense: React mantiene el componente montado entre
        navegaciones y usa useTransition (isPending) para el indicador de carga.
      */}
      <Suspense fallback={<ClientsLoadingSkeleton />}>
        <ClientsContent searchParams={resolvedParams} />
      </Suspense>
    </div>
  )
}
