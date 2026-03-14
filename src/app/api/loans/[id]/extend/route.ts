import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addMonths } from 'date-fns'
import { InstallmentStatus } from '@prisma/client'
import { getInstallmentComponentBalances } from '@/lib/calculations/allocation'
import { hasPermission } from '@/lib/constants/permissions'
import { permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withCreateRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage, isZodValidationError } from '@/lib/utils/errorMessages'
import { normalizeInterestRateForStorage } from '@/lib/utils/interestRate'
import { z } from 'zod'

const extendLoanSchema = z.object({
  additionalMonths: z.coerce.number().int().min(1).max(120),
  newInterestRate: z.coerce.number().min(0),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'LOANS_EDIT')) {
      return permissionDeniedResponse(request, session, 'api/loans/[id]/extend', 'LOANS_EDIT')
    }

    const rateLimitResponse = await withCreateRateLimit(request, session.user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { id } = await params
    const body = extendLoanSchema.parse(await request.json())
    const { additionalMonths, newInterestRate } = body
    const storedNewInterestRate = normalizeInterestRateForStorage(
      newInterestRate,
      'PERCENTAGE_MONTHLY'
    )

    // Obtener préstamo actual con cuotas
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    })

    if (!loan) {
      return NextResponse.json({ error: 'Préstamo no encontrado' }, { status: 404 })
    }

    if (loan.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Solo se pueden prorrogar préstamos activos' },
        { status: 400 }
      )
    }

    const capitalPending = loan.installments.reduce((sum, installment) => {
      const balances = getInstallmentComponentBalances(installment)
      return sum + balances.pendingPrincipal
    }, 0)

    if (capitalPending <= 0) {
      return NextResponse.json(
        { error: 'No hay capital pendiente para prorrogar' },
        { status: 400 }
      )
    }

    // Procesar prórroga en una transacción
    await prisma.$transaction(async tx => {
      // 1. MODIFICAR la última cuota para que solo tenga interés (quitar el capital)
      const lastInstallment = loan.installments[loan.installments.length - 1]
      const currentInterest = Number(lastInstallment.interestAmount)
      const alreadyPaid = Number(lastInstallment.paidAmount)

      // Solo modificar si tiene capital (para préstamos americanos, solo la última lo tiene)
      if (Number(lastInstallment.principalAmount) > 0) {
        // IMPORTANTE: Restar lo que ya se ha pagado para no permitir cobrar dos veces
        const newPendingAmount = Math.max(0, currentInterest - alreadyPaid)

        // Determinar el estado correcto según lo pagado
        let newStatus: 'PENDING' | 'PARTIAL' | 'PAID' = 'PENDING'
        if (newPendingAmount === 0) {
          newStatus = 'PAID'
        } else if (alreadyPaid > 0) {
          newStatus = 'PARTIAL'
        }

        await tx.installment.update({
          where: { id: lastInstallment.id },
          data: {
            principalAmount: 0,
            totalAmount: currentInterest,
            pendingAmount: newPendingAmount,
            status: newStatus,
          },
        })
      }

      // 2. El número de la próxima cuota
      const nextInstallmentNumber = lastInstallment.installmentNumber + 1

      // 3. Calcular fechas de las nuevas cuotas
      const lastDueDate = new Date(lastInstallment.dueDate)

      // 4. Crear nuevas cuotas con la NUEVA tasa de interés sobre el CAPITAL
      const newInstallments = []
      const monthlyInterest = capitalPending * (newInterestRate / 100)

      for (let i = 0; i < additionalMonths; i++) {
        const isLastInstallment = i === additionalMonths - 1
        const dueDate = addMonths(lastDueDate, i + 1)

        newInstallments.push({
          loanId: id,
          installmentNumber: nextInstallmentNumber + i,
          dueDate,
          principalAmount: isLastInstallment ? capitalPending : 0,
          interestAmount: monthlyInterest,
          totalAmount: isLastInstallment ? capitalPending + monthlyInterest : monthlyInterest,
          paidAmount: 0,
          pendingAmount: isLastInstallment ? capitalPending + monthlyInterest : monthlyInterest,
          status: InstallmentStatus.PENDING,
        })
      }

      // 5. Insertar las nuevas cuotas
      await tx.installment.createMany({
        data: newInstallments,
      })

      // 6. Calcular nuevo interés total
      const additionalInterest = monthlyInterest * additionalMonths
      const newTotalInterest = Number(loan.totalInterest) + additionalInterest

      // 7. Actualizar el préstamo
      const newFinalDueDate = addMonths(lastDueDate, additionalMonths)
      await tx.loan.update({
        where: { id },
        data: {
          termMonths: loan.termMonths + additionalMonths,
          finalDueDate: newFinalDueDate,
          totalInterest: newTotalInterest,
          interestRate: storedNewInterestRate,
        },
      })

      // 8. Registrar auditoría
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'UPDATE',
          entityType: 'loans',
          entityId: id,
          oldValue: {
            termMonths: loan.termMonths,
            interestRate: Number(loan.interestRate),
            finalDueDate: loan.finalDueDate.toISOString(),
          },
          newValue: {
            termMonths: loan.termMonths + additionalMonths,
            interestRate: storedNewInterestRate,
            finalDueDate: newFinalDueDate.toISOString(),
            additionalMonths,
            action: 'LOAN_EXTENSION',
          },
        },
      })
    })

    revalidatePath('/dashboard/prestamos')
    revalidatePath(`/dashboard/prestamos/${id}`)
    revalidatePath('/dashboard/reportes')
    revalidatePath('/dashboard')

    return NextResponse.json({
      success: true,
      message: 'Préstamo prorrogado exitosamente',
    })
  } catch (error: unknown) {
    console.error('Error extending loan:', error)

    if (isZodValidationError(error)) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al prorrogar el préstamo') },
      { status: 500 }
    )
  }
}
