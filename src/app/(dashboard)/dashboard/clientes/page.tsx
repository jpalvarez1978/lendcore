import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ClientsExplorer } from '@/components/clients/ClientsExplorer'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'
import { ClientService } from '@/services/clientService'

export default async function ClientesPage() {
  const session = await auth()
  const result = await ClientService.getAll({ pageSize: 500 })
  const canCreateClient =
    session?.user?.role ? hasPermission(session.user.role, 'CLIENTS_CREATE') : false

  const clients = result.data.map(client => ({
    id: client.id,
    type: client.type,
    status: client.status,
    riskLevel: client.riskLevel,
    name:
      client.type === 'INDIVIDUAL'
        ? `${client.individualProfile?.firstName || ''} ${client.individualProfile?.lastName || ''}`.trim()
        : client.businessProfile?.businessName || 'Cliente',
    taxId:
      client.type === 'INDIVIDUAL'
        ? client.individualProfile?.taxId || ''
        : client.businessProfile?.taxId || '',
    email: client.email || '',
    phone: client.phone || '',
    creditLimit: Number(client.creditLimit || 0),
    activeLoans: client._count.loans,
    internalScore: client.internalScore ?? null,
  }))

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

      <ClientsExplorer clients={clients} />
    </div>
  )
}
