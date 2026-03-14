import { AccessDeniedState } from '@/components/shared/AccessDeniedState'
import ExtendLoanPageClient from '@/components/loans/ExtendLoanPageClient'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'

export default async function ExtendLoanPage() {
  const session = await auth()

  if (!session?.user?.role || !hasPermission(session.user.role, 'LOANS_EDIT')) {
    return (
      <AccessDeniedState
        description="Tu rol no tiene permisos para prorrogar préstamos."
        backHref="/dashboard/prestamos"
        backLabel="Volver a préstamos"
      />
    )
  }

  return <ExtendLoanPageClient />
}
