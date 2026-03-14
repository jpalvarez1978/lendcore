import { AccessDeniedState } from '@/components/shared/AccessDeniedState'
import EditClientPageClient from '@/components/clients/EditClientPageClient'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'

export default async function EditClientPage() {
  const session = await auth()

  if (!session?.user?.role || !hasPermission(session.user.role, 'CLIENTS_EDIT')) {
    return (
      <AccessDeniedState
        description="Tu rol no tiene permisos para editar clientes."
        backHref="/dashboard/clientes"
        backLabel="Volver a clientes"
      />
    )
  }

  return <EditClientPageClient />
}
