import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { AccessDeniedState } from '@/components/shared/AccessDeniedState'
import NewPaymentPageClient from '@/components/payments/NewPaymentPageClient'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'

export default async function NewPaymentPage() {
  const session = await auth()

  if (!session?.user?.role || !hasPermission(session.user.role, 'PAYMENTS_REGISTER')) {
    return (
      <AccessDeniedState
        description="Tu rol no tiene permisos para registrar pagos."
        backHref="/dashboard/pagos"
        backLabel="Volver a pagos"
      />
    )
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <NewPaymentPageClient />
    </Suspense>
  )
}
