import { addDays, startOfDay } from 'date-fns'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'
import { formatCurrency } from '@/lib/formatters/currency'
import { prisma } from '@/lib/prisma'
import { getOverdueInstallmentWhere, getUpcomingInstallmentWhere } from '@/lib/utils/installmentStatus'

type AlertType = 'warning' | 'error' | 'success' | 'info'

interface DashboardAlert {
  id: string
  type: AlertType
  title: string
  message: string
  time: string
  actionUrl: string
}

export async function GET() {
  const session = await auth()

  if (!session?.user?.role) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const alerts: DashboardAlert[] = []
  const role = session.user.role
  const today = startOfDay(new Date())
  const tomorrow = addDays(today, 1)

  if (hasPermission(role, 'APPLICATIONS_VIEW')) {
    const pendingApplications = await prisma.creditApplication.count({
      where: {
        status: {
          in: ['DRAFT', 'UNDER_REVIEW'],
        },
      },
    })

    if (pendingApplications > 0) {
      alerts.push({
        id: 'pending-applications',
        type: 'warning',
        title: `${pendingApplications} solicitud${pendingApplications === 1 ? '' : 'es'} por gestionar`,
        message: 'Borradores y casos en revisión pendientes de decisión.',
        time: 'Hoy',
        actionUrl: '/dashboard/solicitudes',
      })
    }
  }

  if (hasPermission(role, 'COLLECTION_VIEW')) {
    const [overdueLoans, overdueAmounts, upcomingInstallments, upcomingAmounts, promisesDueToday] =
      await Promise.all([
        prisma.loan.count({
          where: {
            status: { in: ['ACTIVE', 'DEFAULTED'] },
            installments: {
              some: getOverdueInstallmentWhere(today),
            },
          },
        }),
        prisma.installment.aggregate({
          where: getOverdueInstallmentWhere(today),
          _sum: {
            pendingAmount: true,
          },
        }),
        prisma.installment.count({
          where: getUpcomingInstallmentWhere({
            referenceDate: today,
            daysAhead: 7,
          }),
        }),
        prisma.installment.aggregate({
          where: getUpcomingInstallmentWhere({
            referenceDate: today,
            daysAhead: 7,
          }),
          _sum: {
            pendingAmount: true,
          },
        }),
        prisma.paymentPromise.aggregate({
          where: {
            status: 'PENDING',
            promiseDate: {
              gte: today,
              lt: tomorrow,
            },
          },
          _count: {
            _all: true,
          },
          _sum: {
            promisedAmount: true,
          },
        }),
      ])

    if (overdueLoans > 0) {
      alerts.push({
        id: 'overdue-loans',
        type: 'error',
        title: `${overdueLoans} préstamo${overdueLoans === 1 ? '' : 's'} con mora activa`,
        message: `${formatCurrency(Number(overdueAmounts._sum.pendingAmount || 0))} vencidos pendientes de gestión.`,
        time: 'Ahora',
        actionUrl: '/dashboard/cobranza',
      })
    }

    if (promisesDueToday._count._all > 0) {
      alerts.push({
        id: 'promises-due-today',
        type: 'warning',
        title: `${promisesDueToday._count._all} promesa${promisesDueToday._count._all === 1 ? '' : 's'} vence${promisesDueToday._count._all === 1 ? '' : 'n'} hoy`,
        message: `${formatCurrency(Number(promisesDueToday._sum.promisedAmount || 0))} comprometidos para cobro hoy.`,
        time: 'Hoy',
        actionUrl: '/dashboard/cobranza',
      })
    }

    if (upcomingInstallments > 0) {
      alerts.push({
        id: 'upcoming-installments',
        type: 'info',
        title: `${upcomingInstallments} cuota${upcomingInstallments === 1 ? '' : 's'} vence${upcomingInstallments === 1 ? '' : 'n'} en 7 días`,
        message: `${formatCurrency(Number(upcomingAmounts._sum.pendingAmount || 0))} previstas para seguimiento cercano.`,
        time: 'Próximos 7 días',
        actionUrl: '/dashboard',
      })
    }
  }

  return NextResponse.json(
    { alerts },
    {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    }
  )
}
