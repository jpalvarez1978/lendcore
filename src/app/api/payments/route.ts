import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { PaymentService } from '@/services/paymentService'
import { hasPermission } from '@/lib/constants/permissions'
import { PaymentMethod } from '@prisma/client'
import { withAPIRateLimit, withCreateRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage } from '@/lib/utils/errorMessages'
import { clampIntegerParam, PAGINATION_LIMITS } from '@/lib/utils/apiParams'

function parsePaidAtValue(value?: string) {
  if (!value) return undefined

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  if (isDateOnly) {
    const [year, month, day] = value.split('-').map(Number)
    const now = new Date()

    return new Date(
      year,
      month - 1,
      day,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds()
    )
  }

  return new Date(value)
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'PAYMENTS_REGISTER')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const rateLimitResponse = await withCreateRateLimit(request, session.user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()
    const amount = Number(body.amount)
    const paymentMethod = body.paymentMethod as PaymentMethod
    const paidAt = parsePaidAtValue(body.paidAt)

    if (!body.loanId || !body.paymentMethod || !Number.isFinite(amount)) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: loanId, amount, paymentMethod' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'El monto del pago debe ser mayor que 0' },
        { status: 400 }
      )
    }

    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Método de pago inválido' },
        { status: 400 }
      )
    }

    if (paidAt && Number.isNaN(paidAt.getTime())) {
      return NextResponse.json(
        { error: 'La fecha de pago no es válida' },
        { status: 400 }
      )
    }

    const paymentData = {
      loanId: body.loanId,
      amount,
      paymentMethod,
      reference: body.reference || null,
      paidAt,
      notes: body.notes || null,
      installmentId: body.installmentId || null,
    }

    const payment = await PaymentService.create(paymentData, session.user.id)

    // Fetch payment with allocations and updated loan data
    const paymentWithDetails = await PaymentService.getById(payment.id)

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/pagos')
    revalidatePath('/dashboard/reportes')
    revalidatePath('/dashboard/cobranza')
    revalidatePath(`/dashboard/prestamos/${body.loanId}`)

    return NextResponse.json(paymentWithDetails, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating payment:', error)

    const message = getErrorMessage(error, 'Error al crear el pago')
    if (
      message === 'Préstamo no encontrado' ||
      message === 'Cuota no encontrada'
    ) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    if (
      message.includes('monto') ||
      message.includes('saldo pendiente') ||
      message.includes('cuotas pendientes') ||
      message.includes('no se pueden registrar pagos') ||
      message.includes('ya está pagada') ||
      message.includes('No se pudo asignar completamente')
    ) {
      return NextResponse.json({ error: message }, { status: 400 })
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'PAYMENTS_VIEW')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { searchParams } = new URL(request.url)
    const loanId = searchParams.get('loanId')
    const page = clampIntegerParam(
      searchParams.get('page'),
      PAGINATION_LIMITS.DEFAULT_PAGE,
      PAGINATION_LIMITS.MIN_PAGE,
      PAGINATION_LIMITS.MAX_PAGE
    )
    const pageSize = clampIntegerParam(
      searchParams.get('pageSize'),
      PAGINATION_LIMITS.DEFAULT_PAGE_SIZE,
      PAGINATION_LIMITS.MIN_PAGE_SIZE,
      PAGINATION_LIMITS.MAX_PAGE_SIZE
    )

    if (loanId) {
      const payments = await PaymentService.getByLoanId(loanId, page, pageSize)
      return NextResponse.json(payments)
    }

    return NextResponse.json({ error: 'Se requiere loanId' }, { status: 400 })
  } catch (error: unknown) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al obtener pagos') },
      { status: 500 }
    )
  }
}
