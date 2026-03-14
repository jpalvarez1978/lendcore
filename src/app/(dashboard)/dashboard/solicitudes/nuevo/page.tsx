import { AccessDeniedState } from '@/components/shared/AccessDeniedState'
import NewApplicationPageClient from '@/components/applications/NewApplicationPageClient'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'

export default async function NuevaSolicitudPage() {
  const session = await auth()

  if (!session?.user?.role || !hasPermission(session.user.role, 'APPLICATIONS_CREATE')) {
    return (
      <AccessDeniedState
        description="Solo los perfiles autorizados pueden registrar nuevas solicitudes."
        backHref="/dashboard/solicitudes"
        backLabel="Volver a solicitudes"
      />
    )
  }

  return <NewApplicationPageClient />
}
