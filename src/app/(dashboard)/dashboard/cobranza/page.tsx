import { CollectionWorkspace } from '@/components/collection/CollectionWorkspace'
import { CollectionDashboardService } from '@/services/collectionDashboardService'
import { decryptSafe } from '@/lib/security/encryption'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'

export default async function CobranzaPage() {
  const [session, metrics, prioritizedCases, promisesToday] = await Promise.all([
    auth(),
    CollectionDashboardService.getMetrics(),
    CollectionDashboardService.getPrioritizedCases(undefined, 50),
    CollectionDashboardService.getPromisesDueToday(),
  ])
  const canCreateCollectionAction =
    session?.user?.role ? hasPermission(session.user.role, 'COLLECTION_CREATE') : false

  const serializedCases = prioritizedCases.map(caseItem => ({
    ...caseItem,
    lastContactDate: caseItem.lastContactDate?.toISOString(),
  }))

  const serializedPromises = promisesToday.map(promise => {
    const clientName =
      promise.client.type === 'INDIVIDUAL'
        ? `${promise.client.individualProfile?.firstName || ''} ${promise.client.individualProfile?.lastName || ''}`.trim()
        : promise.client.businessProfile?.businessName || 'Cliente'

    return {
      id: promise.id,
      clientId: promise.clientId,
      clientName,
      phone: decryptSafe(promise.client.phone),
      promiseDate: promise.promiseDate.toISOString(),
      promisedAmount: Number(promise.promisedAmount),
    }
  })

  return (
    <CollectionWorkspace
      canCreateCollectionAction={canCreateCollectionAction}
      metrics={metrics}
      prioritizedCases={serializedCases}
      promisesToday={serializedPromises}
    />
  )
}
