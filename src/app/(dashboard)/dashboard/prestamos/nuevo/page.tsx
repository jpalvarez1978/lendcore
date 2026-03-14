import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { AccessDeniedState } from '@/components/shared/AccessDeniedState'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'
import { CreateLoanForm } from '@/components/loans/CreateLoanForm'
import { ApplicationService } from '@/services/applicationService'

interface NuevoPrestamoPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function NuevoPrestamoPage({ searchParams }: NuevoPrestamoPageProps) {
  const session = await auth()

  if (!session?.user?.role || !hasPermission(session.user.role, 'LOANS_CREATE')) {
    return (
      <AccessDeniedState
        description="Solo los perfiles autorizados pueden originar nuevos préstamos."
        backHref="/dashboard/prestamos"
        backLabel="Volver a préstamos"
      />
    )
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const applicationIdParam = resolvedSearchParams?.applicationId
  const applicationId =
    typeof applicationIdParam === 'string'
      ? applicationIdParam
      : Array.isArray(applicationIdParam)
        ? applicationIdParam[0]
        : undefined

  const sourceApplication =
    applicationId ? await ApplicationService.getById(applicationId) : null

  const approvedApplicationContext =
    sourceApplication && sourceApplication.status === 'APPROVED'
      ? {
          id: sourceApplication.id,
          clientId: sourceApplication.clientId,
          clientName:
            sourceApplication.client.type === 'INDIVIDUAL'
              ? `${sourceApplication.client.individualProfile?.firstName || ''} ${sourceApplication.client.individualProfile?.lastName || ''}`.trim()
              : sourceApplication.client.businessProfile?.businessName || 'Cliente',
          requestedAmount: Number(sourceApplication.requestedAmount),
          termMonths: sourceApplication.termMonths,
          proposedRate: Number(sourceApplication.proposedRate),
          paymentFrequency: sourceApplication.paymentFrequency,
        }
      : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/prestamos">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Préstamo</h1>
          <p className="text-muted-foreground">
            Crear una nueva operación de préstamo con sistema de amortización profesional
          </p>
        </div>
      </div>

      {/* Formulario */}
      <CreateLoanForm sourceApplication={approvedApplicationContext} />
    </div>
  )
}
