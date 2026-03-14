import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { LoanService } from '@/services/loanService'
import type { CreateLoanData } from '@/services/loanService'
import { loanSchema } from '@/lib/validations/loan.schema'
import { hasPermission } from '@/lib/constants/permissions'
import { LoanStatus } from '@prisma/client'
import { withCreateRateLimit, withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage, isZodValidationError } from '@/lib/utils/errorMessages'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'LOANS_VIEW')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status')
    const status =
      statusParam && Object.values(LoanStatus).includes(statusParam as LoanStatus)
        ? (statusParam as LoanStatus)
        : undefined
    const clientId = searchParams.get('clientId') || undefined

    if (statusParam && !status) {
      return NextResponse.json({ error: 'Estado de préstamo inválido' }, { status: 400 })
    }

    const loans = await LoanService.getAll({ status, clientId })

    return NextResponse.json(loans)
  } catch (error: unknown) {
    console.error('Error fetching loans:', error)
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al obtener los préstamos') },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'LOANS_CREATE')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const rateLimitResponse = await withCreateRateLimit(request, session.user.id)
    if (rateLimitResponse) return rateLimitResponse

    const body = await request.json()
    const validatedData = loanSchema.parse(body)

    const loanData: CreateLoanData = {
      applicationId: validatedData.applicationId,
      clientId: validatedData.clientId,
      principalAmount: validatedData.principalAmount,
      amortizationType: validatedData.amortizationType,
      interestType: validatedData.interestType,
      interestRate: validatedData.interestRate,
      fixedInterestAmount: validatedData.fixedInterestAmount,
      termMonths: validatedData.termMonths,
      paymentFrequency: validatedData.paymentFrequency,
      disbursementDate: validatedData.disbursementDate
        ? new Date(validatedData.disbursementDate)
        : new Date(), // Default: hoy
      firstDueDate: new Date(validatedData.firstDueDate),
      allowSaturdayPayments: validatedData.allowSaturdayPayments,
      allowSundayPayments: validatedData.allowSundayPayments,
      hasGuarantor: validatedData.hasGuarantor,
      guarantorName: validatedData.guarantorName,
      guarantorTaxId: validatedData.guarantorTaxId,
      guarantorPhone: validatedData.guarantorPhone,
      guarantorAddress: validatedData.guarantorAddress,
      collateralType: validatedData.collateralType,
      collateralValue: validatedData.collateralValue,
      collateralNotes: validatedData.collateralNotes,
      notes: validatedData.notes,
      clientInstructions: validatedData.clientInstructions,
      sendEmailOnCreate: validatedData.sendEmailOnCreate,
    }

    const loan = await LoanService.create(loanData, session.user.id)

    return NextResponse.json(loan, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating loan:', error)
    if (isZodValidationError(error)) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al crear el préstamo') },
      { status: 500 }
    )
  }
}
