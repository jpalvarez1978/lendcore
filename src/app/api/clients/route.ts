import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ClientService } from '@/services/clientService'
import type { CreateClientData } from '@/services/clientService'
import { clientSchema } from '@/lib/validations/client.schema'
import type { ClientFormData } from '@/lib/validations/client.schema'
import { hasPermission } from '@/lib/constants/permissions'
import { withCreateRateLimit, withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { ClientStatus, ClientType, RiskLevel } from '@prisma/client'
import {
  AppError,
  getErrorMessage,
  isZodValidationError,
} from '@/lib/utils/errorMessages'
import { clampIntegerParam, PAGINATION_LIMITS } from '@/lib/utils/apiParams'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'CLIENTS_VIEW')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // Rate limiting: 100 requests por minuto
    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { searchParams } = new URL(request.url)
    const typeParam = searchParams.get('type')
    const statusParam = searchParams.get('status')
    const riskLevelParam = searchParams.get('riskLevel')
    const type =
      typeParam && Object.values(ClientType).includes(typeParam as ClientType)
        ? (typeParam as ClientType)
        : undefined
    const status =
      statusParam && Object.values(ClientStatus).includes(statusParam as ClientStatus)
        ? (statusParam as ClientStatus)
        : undefined
    const riskLevel =
      riskLevelParam && Object.values(RiskLevel).includes(riskLevelParam as RiskLevel)
        ? (riskLevelParam as RiskLevel)
        : undefined
    const search = searchParams.get('search') || undefined
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

    if (typeParam && !type) {
      return NextResponse.json({ error: 'Tipo de cliente inválido' }, { status: 400 })
    }

    if (statusParam && !status) {
      return NextResponse.json({ error: 'Estado de cliente inválido' }, { status: 400 })
    }

    if (riskLevelParam && !riskLevel) {
      return NextResponse.json({ error: 'Nivel de riesgo inválido' }, { status: 400 })
    }

    const result = await ClientService.getAll({
      type,
      status,
      riskLevel,
      search,
      page,
      pageSize,
    })

    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error('Error fetching clients:', error)

    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al obtener los clientes') },
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

    if (!hasPermission(session.user.role, 'CLIENTS_CREATE')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // Rate limiting: 20 creaciones por hora
    const rateLimitResponse = await withCreateRateLimit(request, session.user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const body = await request.json()

    // Validar datos
    const validatedData: ClientFormData = clientSchema.parse(body)

    // Preparar datos para el servicio
    const clientData: CreateClientData = {
      type: validatedData.type,
      email: validatedData.email,
      phone: validatedData.phone,
      address: validatedData.address,
      city: validatedData.city,
      postalCode: validatedData.postalCode,
      creditLimit: validatedData.creditLimit,
      riskLevel: validatedData.riskLevel,
      internalScore: validatedData.internalScore,
    }

    if (validatedData.type === 'INDIVIDUAL') {
      clientData.individualProfile = {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        taxId: validatedData.taxId,
        dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
        occupation: validatedData.occupation,
        income: validatedData.income,
        reference1Name: validatedData.reference1Name,
        reference1Phone: validatedData.reference1Phone,
        reference2Name: validatedData.reference2Name,
        reference2Phone: validatedData.reference2Phone,
      }
    } else {
      clientData.businessProfile = {
        businessName: validatedData.businessName,
        taxId: validatedData.taxId,
        legalRepName: validatedData.legalRepName,
        legalRepTaxId: validatedData.legalRepTaxId,
        industry: validatedData.industry,
        annualRevenue: validatedData.annualRevenue,
        employeeCount: validatedData.employeeCount,
      }
    }

    const client = await ClientService.create(clientData, session.user.id)

    return NextResponse.json(client, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating client:', error)

    if (isZodValidationError(error)) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }

    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(
      { error: getErrorMessage(error, 'Error al crear el cliente') },
      { status: 500 }
    )
  }
}
