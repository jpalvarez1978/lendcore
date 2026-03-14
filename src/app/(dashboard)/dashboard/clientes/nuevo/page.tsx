import { ClientForm } from '@/components/clients/ClientForm'
import { AccessDeniedState } from '@/components/shared/AccessDeniedState'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'

export default async function NuevoClientePage() {
  const session = await auth()

  if (!session?.user?.role || !hasPermission(session.user.role, 'CLIENTS_CREATE')) {
    return (
      <AccessDeniedState
        description="Solo los perfiles autorizados pueden registrar nuevos clientes."
        backHref="/dashboard/clientes"
        backLabel="Volver a clientes"
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Cliente</h1>
        <p className="text-muted-foreground">
          Registrar un nuevo cliente persona física o empresa
        </p>
      </div>

      <ClientForm />
    </div>
  )
}
