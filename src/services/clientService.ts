import { prisma } from '@/lib/prisma'
import { ClientType, ClientStatus, RiskLevel, Prisma } from '@prisma/client'
import { encryptIfNeeded, decryptSafe } from '@/lib/security/encryption'
import { DuplicateErrors, throwBusinessError } from '@/lib/utils/errorMessages'
import { matchesSearchTerm } from '@/lib/utils/search'

export interface CreateClientData {
  type: ClientType
  status?: ClientStatus
  email?: string | null
  phone: string
  address?: string | null
  city?: string | null
  postalCode?: string | null
  creditLimit?: number
  riskLevel?: RiskLevel
  internalScore?: number | null
  individualProfile?: {
    firstName: string
    lastName: string
    taxId?: string | null
    dateOfBirth?: Date | null
    occupation?: string | null
    income?: number | null
    reference1Name?: string | null
    reference1Phone?: string | null
    reference2Name?: string | null
    reference2Phone?: string | null
  }
  businessProfile?: {
    businessName: string
    taxId?: string | null
    legalRepName: string
    legalRepTaxId?: string | null
    industry?: string | null
    annualRevenue?: number | null
    employeeCount?: number | null
  }
}

const clientProfileInclude = {
  individualProfile: true,
  businessProfile: true,
} satisfies Prisma.ClientInclude

const clientDetailsInclude = {
  ...clientProfileInclude,
  loans: {
    include: {
      installments: true,
      payments: {
        include: {
          allocations: true,
        },
        orderBy: { paidAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  },
  creditApplications: {
    orderBy: { createdAt: 'desc' },
  },
  creditLimitChanges: {
    include: {
      approver: {
        select: { name: true, firstName: true, lastName: true },
      },
    },
    orderBy: { approvedAt: 'desc' },
  },
  notes: {
    include: {
      user: {
        select: { name: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  },
  documents: {
    orderBy: { uploadedAt: 'desc' },
  },
} satisfies Prisma.ClientInclude

type ClientWithProfiles = Prisma.ClientGetPayload<{ include: typeof clientProfileInclude }>
type ClientWithDetails = Prisma.ClientGetPayload<{ include: typeof clientDetailsInclude }>
type ExistingIndividualProfile = Prisma.IndividualProfileGetPayload<{ include: { client: true } }>
type ExistingBusinessProfile = Prisma.BusinessProfileGetPayload<{ include: { client: true } }>
type ExistingClientProfile = ExistingIndividualProfile | ExistingBusinessProfile

type SanitizableClient = {
  email?: string | null
  phone?: string | null
  address?: string | null
  individualProfile?: {
    taxId?: string | null
    reference1Phone?: string | null
    reference2Phone?: string | null
  } | null
  businessProfile?: {
    taxId?: string | null
    legalRepTaxId?: string | null
  } | null
}

export class ClientService {
  private static normalizeTaxId(taxId: string) {
    return taxId.trim().toUpperCase()
  }

  private static sanitizeOptionalText(value?: string | null) {
    if (typeof value !== 'string') return value ?? null

    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
  }

  private static maskSensitiveValue(value?: string | null) {
    if (!value) return null

    const plaintext = decryptSafe(value)
    if (!plaintext) return null
    if (plaintext.length <= 4) return plaintext

    return `${'*'.repeat(Math.max(plaintext.length - 4, 0))}${plaintext.slice(-4)}`
  }

  private static buildClientAuditSnapshot(
    client: ClientWithProfiles | ClientWithDetails
  ): Prisma.InputJsonObject {
    return {
      id: client.id,
      type: client.type,
      status: client.status,
      email: this.maskSensitiveValue(client.email),
      phone: this.maskSensitiveValue(client.phone),
      city: client.city,
      postalCode: client.postalCode,
      creditLimit: Number(client.creditLimit),
      riskLevel: client.riskLevel,
      internalScore: client.internalScore,
      individualProfile: client.individualProfile
        ? {
            firstName: client.individualProfile.firstName,
            lastName: client.individualProfile.lastName,
            taxId: this.maskSensitiveValue(client.individualProfile.taxId),
            occupation: client.individualProfile.occupation,
            income: client.individualProfile.income,
          }
        : null,
      businessProfile: client.businessProfile
        ? {
            businessName: client.businessProfile.businessName,
            taxId: this.maskSensitiveValue(client.businessProfile.taxId),
            legalRepName: client.businessProfile.legalRepName,
            legalRepTaxId: this.maskSensitiveValue(client.businessProfile.legalRepTaxId),
            industry: client.businessProfile.industry,
            annualRevenue: client.businessProfile.annualRevenue,
            employeeCount: client.businessProfile.employeeCount,
          }
        : null,
    }
  }

  private static getExistingProfileName(profile: ExistingClientProfile) {
    if ('firstName' in profile) {
      return `${profile.firstName} ${profile.lastName}`.replace(/\s+/g, ' ').trim()
    }

    return profile.businessName
  }

  private static sanitizeClient<T extends SanitizableClient | null>(client: T): T {
    if (!client || typeof client !== 'object') return client

    return {
      ...client,
      email: client.email ? decryptSafe(client.email) : client.email,
      phone: client.phone ? decryptSafe(client.phone) : client.phone,
      address: client.address ? decryptSafe(client.address) : client.address,
      individualProfile: client.individualProfile
        ? {
            ...client.individualProfile,
            taxId: client.individualProfile.taxId
              ? decryptSafe(client.individualProfile.taxId)
              : client.individualProfile.taxId,
            reference1Phone: client.individualProfile.reference1Phone
              ? decryptSafe(client.individualProfile.reference1Phone)
              : client.individualProfile.reference1Phone,
            reference2Phone: client.individualProfile.reference2Phone
              ? decryptSafe(client.individualProfile.reference2Phone)
              : client.individualProfile.reference2Phone,
          }
        : client.individualProfile,
      businessProfile: client.businessProfile
        ? {
            ...client.businessProfile,
            taxId: client.businessProfile.taxId
              ? decryptSafe(client.businessProfile.taxId)
              : client.businessProfile.taxId,
            legalRepTaxId: client.businessProfile.legalRepTaxId
              ? decryptSafe(client.businessProfile.legalRepTaxId)
              : client.businessProfile.legalRepTaxId,
          }
        : client.businessProfile,
    } as T
  }

  private static async findExistingClientByTaxId(
    type: ClientType,
    taxId: string,
    excludeClientId?: string
  ): Promise<ExistingClientProfile | null> {
    const normalizedTaxId = this.normalizeTaxId(taxId)

    if (type === 'INDIVIDUAL') {
      const profiles = await prisma.individualProfile.findMany({
        include: { client: true },
      })

      return (
        profiles.find(profile => {
          if (excludeClientId && profile.clientId === excludeClientId) return false
          return this.normalizeTaxId(decryptSafe(profile.taxId)) === normalizedTaxId
        }) || null
      )
    }

    const profiles = await prisma.businessProfile.findMany({
      include: { client: true },
    })

    return (
      profiles.find(profile => {
        if (excludeClientId && profile.clientId === excludeClientId) return false
        return this.normalizeTaxId(decryptSafe(profile.taxId)) === normalizedTaxId
      }) || null
    )
  }

  private static async getByIdRaw(id: string) {
    return await prisma.client.findUnique({
      where: { id },
      include: clientDetailsInclude,
    })
  }

  /**
   * Obtener todos los clientes con filtros opcionales y paginación
   */
  static async getAll(filters?: {
    type?: ClientType
    status?: ClientStatus
    riskLevel?: RiskLevel
    search?: string
    page?: number
    pageSize?: number
  }) {
    const page = filters?.page || 1
    const pageSize = filters?.pageSize || 50
    const skip = (page - 1) * pageSize

    const where: Prisma.ClientWhereInput = {}

    if (filters?.type) where.type = filters.type
    if (filters?.status) where.status = filters.status
    if (filters?.riskLevel) where.riskLevel = filters.riskLevel

    const baseInclude = {
      individualProfile: true,
      businessProfile: true,
      _count: {
        select: {
          loans: true,
          creditApplications: true,
        },
      },
    } satisfies Prisma.ClientInclude

    if (filters?.search) {
      const data = await prisma.client.findMany({
        where,
        include: baseInclude,
        orderBy: { createdAt: 'desc' },
      })

      const sanitizedData = data.map(client => this.sanitizeClient(client))
      const filteredData = sanitizedData.filter(client =>
        matchesSearchTerm(filters.search, [
          client.email,
          client.phone,
          client.city,
          client.individualProfile?.firstName,
          client.individualProfile?.lastName,
          client.individualProfile?.taxId,
          client.businessProfile?.businessName,
          client.businessProfile?.taxId,
        ])
      )

      const paginatedData = filteredData.slice(skip, skip + pageSize)

      return {
        data: paginatedData,
        pagination: {
          page,
          pageSize,
          total: filteredData.length,
          totalPages: Math.ceil(filteredData.length / pageSize),
        },
      }
    }

    const [data, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: baseInclude,
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip,
      }),
      prisma.client.count({ where }),
    ])

    return {
      data: data.map(client => this.sanitizeClient(client)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }

  /**
   * Obtener cliente por ID
   */
  static async getById(id: string) {
    const client = await this.getByIdRaw(id)
    return this.sanitizeClient(client)
  }

  /**
   * Crear nuevo cliente
   */
  static async create(data: CreateClientData, userId: string) {
    // Verificar si ya existe un cliente con el mismo taxId
    const taxId = this.sanitizeOptionalText(
      data.type === 'INDIVIDUAL'
        ? data.individualProfile?.taxId
        : data.businessProfile?.taxId
    )

    if (taxId) {
      const existingProfile = await this.findExistingClientByTaxId(data.type, taxId)

      if (existingProfile) {
        if (data.type === 'INDIVIDUAL') {
          throw new Error(
            DuplicateErrors.EXISTING_DNI(taxId, this.getExistingProfileName(existingProfile))
          )
        } else {
          throw new Error(
            DuplicateErrors.EXISTING_CIF(taxId, this.getExistingProfileName(existingProfile))
          )
        }
      }
    }

    // Crear cliente con perfil (datos sensibles encriptados)
    const client = await prisma.client.create({
      data: {
        type: data.type,
        email: data.email ? encryptIfNeeded(data.email) : null,
        phone: encryptIfNeeded(data.phone),
        address: data.address ? encryptIfNeeded(data.address) : null,
        city: data.city,
        postalCode: data.postalCode,
        creditLimit: data.creditLimit || 0,
        riskLevel: data.riskLevel || 'MEDIUM',
        internalScore: data.internalScore,
        status: data.status || 'ACTIVE',
        ...(data.type === 'INDIVIDUAL' && data.individualProfile
          ? {
              individualProfile: {
                create: {
                  firstName: data.individualProfile.firstName,
                  lastName: data.individualProfile.lastName,
                  taxId: encryptIfNeeded(this.sanitizeOptionalText(data.individualProfile.taxId)),
                  dateOfBirth: data.individualProfile.dateOfBirth,
                  occupation: data.individualProfile.occupation,
                  income: data.individualProfile.income,
                  reference1Name: data.individualProfile.reference1Name,
                  reference1Phone: data.individualProfile.reference1Phone
                    ? encryptIfNeeded(data.individualProfile.reference1Phone)
                    : null,
                  reference2Name: data.individualProfile.reference2Name,
                  reference2Phone: data.individualProfile.reference2Phone
                    ? encryptIfNeeded(data.individualProfile.reference2Phone)
                    : null,
                },
              },
            }
          : {}),
        ...(data.type === 'BUSINESS' && data.businessProfile
          ? {
              businessProfile: {
                create: {
                  businessName: data.businessProfile.businessName,
                  taxId: encryptIfNeeded(this.sanitizeOptionalText(data.businessProfile.taxId)),
                  legalRepName: data.businessProfile.legalRepName,
                  legalRepTaxId: encryptIfNeeded(
                    this.sanitizeOptionalText(data.businessProfile.legalRepTaxId)
                  ),
                  industry: data.businessProfile.industry,
                  annualRevenue: data.businessProfile.annualRevenue,
                  employeeCount: data.businessProfile.employeeCount,
                },
              },
            }
          : {}),
      },
      include: clientProfileInclude,
    })

    // Registrar auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entityType: 'clients',
        entityId: client.id,
        newValue: this.buildClientAuditSnapshot(client),
      },
    })

    return this.sanitizeClient(client)
  }

  /**
   * Actualizar cliente
   */
  static async update(id: string, data: Partial<CreateClientData>, userId: string) {
    const existing = await this.getByIdRaw(id)
    if (!existing) throwBusinessError('El cliente que intentas actualizar no existe', 'CLIENT_NOT_FOUND')

    const clientType = data.type || existing.type
    const nextTaxId = this.sanitizeOptionalText(
      clientType === 'INDIVIDUAL'
        ? data.individualProfile?.taxId
        : data.businessProfile?.taxId
    )

    if (nextTaxId) {
      const existingProfile = await this.findExistingClientByTaxId(clientType, nextTaxId, id)
      if (existingProfile) {
        if (clientType === 'INDIVIDUAL') {
          throw new Error(
            DuplicateErrors.EXISTING_DNI(nextTaxId, this.getExistingProfileName(existingProfile))
          )
        } else {
          throw new Error(
            DuplicateErrors.EXISTING_CIF(nextTaxId, this.getExistingProfileName(existingProfile))
          )
        }
      }
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        type: data.type,
        status: data.status,
        email: data.email !== undefined ? encryptIfNeeded(data.email) : undefined,
        phone: data.phone !== undefined ? encryptIfNeeded(data.phone) : undefined,
        address: data.address !== undefined ? encryptIfNeeded(data.address) : undefined,
        city: data.city,
        postalCode: data.postalCode,
        creditLimit: data.creditLimit,
        riskLevel: data.riskLevel,
        internalScore: data.internalScore,
        ...(clientType === 'INDIVIDUAL' && data.individualProfile
          ? {
              individualProfile: {
                update: {
                  firstName: data.individualProfile.firstName,
                  lastName: data.individualProfile.lastName,
                  taxId:
                    data.individualProfile.taxId !== undefined
                      ? encryptIfNeeded(this.sanitizeOptionalText(data.individualProfile.taxId))
                      : undefined,
                  dateOfBirth: data.individualProfile.dateOfBirth,
                  occupation: data.individualProfile.occupation,
                  income: data.individualProfile.income,
                  reference1Name: data.individualProfile.reference1Name,
                  reference1Phone: data.individualProfile.reference1Phone !== undefined
                    ? (data.individualProfile.reference1Phone
                        ? encryptIfNeeded(data.individualProfile.reference1Phone)
                        : null)
                    : undefined,
                  reference2Name: data.individualProfile.reference2Name,
                  reference2Phone: data.individualProfile.reference2Phone !== undefined
                    ? (data.individualProfile.reference2Phone
                        ? encryptIfNeeded(data.individualProfile.reference2Phone)
                        : null)
                    : undefined,
                },
              },
            }
          : {}),
        ...(clientType === 'BUSINESS' && data.businessProfile
          ? {
              businessProfile: {
                update: {
                  businessName: data.businessProfile.businessName,
                  taxId:
                    data.businessProfile.taxId !== undefined
                      ? encryptIfNeeded(this.sanitizeOptionalText(data.businessProfile.taxId))
                      : undefined,
                  legalRepName: data.businessProfile.legalRepName,
                  legalRepTaxId:
                    data.businessProfile.legalRepTaxId !== undefined
                      ? encryptIfNeeded(this.sanitizeOptionalText(data.businessProfile.legalRepTaxId))
                      : undefined,
                  industry: data.businessProfile.industry,
                  annualRevenue: data.businessProfile.annualRevenue,
                  employeeCount: data.businessProfile.employeeCount,
                },
              },
            }
          : {}),
      },
      include: clientProfileInclude,
    })

    // Registrar auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entityType: 'clients',
        entityId: id,
        oldValue: this.buildClientAuditSnapshot(existing),
        newValue: this.buildClientAuditSnapshot(updated),
      },
    })

    return this.sanitizeClient(updated)
  }

  /**
   * Cambiar estado del cliente
   */
  static async updateStatus(id: string, status: ClientStatus, userId: string) {
    const existing = await this.getByIdRaw(id)
    if (!existing) throwBusinessError('El cliente que intentas actualizar no existe', 'CLIENT_NOT_FOUND')

    const updated = await prisma.client.update({
      where: { id },
      data: { status },
    })

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE_STATUS',
        entityType: 'clients',
        entityId: id,
        oldValue: { status: existing.status },
        newValue: { status },
      },
    })

    return this.sanitizeClient(updated)
  }

  /**
   * Calcular métricas del cliente
   */
  static async getClientMetrics(id: string) {
    const client = await this.getById(id)
    if (!client) throwBusinessError('El cliente que intentas consultar no existe', 'CLIENT_NOT_FOUND')

    // Calcular exposición total
    const totalExposure = client.loans.reduce((sum, loan) => {
      return sum + Number(loan.outstandingPrincipal)
    }, 0)

    // Préstamos activos
    const activeLoans = client.loans.filter(l => l.status === 'ACTIVE').length

    // Total prestado históricamente
    const totalLent = client.loans.reduce((sum, loan) => {
      return sum + Number(loan.principalAmount)
    }, 0)

    // Pagos a tiempo vs atrasados
    const allInstallments = client.loans.flatMap(l => l.installments)
    const paidOnTime = allInstallments.filter(
      i => i.status === 'PAID' && i.paidAt && i.paidAt <= i.dueDate
    ).length
    const paidLate = allInstallments.filter(
      i => i.status === 'PAID' && i.paidAt && i.paidAt > i.dueDate
    ).length
    const onTimeRate = paidOnTime + paidLate > 0 ? (paidOnTime / (paidOnTime + paidLate)) * 100 : 100

    return {
      totalExposure,
      activeLoans,
      totalLent,
      totalLoans: client.loans.length,
      onTimePaymentRate: onTimeRate,
      availableCredit: Number(client.creditLimit) - totalExposure,
    }
  }

  /**
   * Obtener actividades del cliente para timeline
   */
  static async getClientActivities(clientId: string) {
    const activities = []

    // Préstamos creados
    const loans = await prisma.loan.findMany({
      where: { clientId },
      select: {
        id: true,
        loanNumber: true,
        principalAmount: true,
        createdAt: true,
        disbursementDate: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    loans.forEach(loan => {
      activities.push({
        id: `loan-${loan.id}`,
        type: 'LOAN_CREATED' as const,
        description: `Préstamo ${loan.loanNumber} creado por ${loan.principalAmount}`,
        timestamp: loan.createdAt,
        metadata: { amount: Number(loan.principalAmount) },
      })
    })

    // Pagos recibidos
    const payments = await prisma.payment.findMany({
      where: {
        loan: { clientId },
      },
      include: {
        loan: { select: { loanNumber: true } },
        processedBy: { select: { name: true } },
      },
      orderBy: { paidAt: 'desc' },
      take: 50,
    })

    payments.forEach(payment => {
      activities.push({
        id: `payment-${payment.id}`,
        type: 'PAYMENT_RECEIVED' as const,
        description: `Pago recibido en ${payment.loan.loanNumber}`,
        timestamp: payment.paidAt,
        userId: payment.processedById,
        userName: payment.processedBy?.name,
        metadata: { amount: Number(payment.amount) },
      })
    })

    // Cambios de cupo
    const creditChanges = await prisma.creditLimitChange.findMany({
      where: { clientId },
      include: {
        approver: { select: { name: true } },
      },
      orderBy: { approvedAt: 'desc' },
    })

    creditChanges.forEach(change => {
      activities.push({
        id: `credit-${change.id}`,
        type: 'CREDIT_LIMIT_CHANGED' as const,
        description: change.reason || 'Cupo de crédito modificado',
        timestamp: change.approvedAt,
        userId: change.approvedBy,
        userName: change.approver.name,
        metadata: {
          previousValue: Number(change.previousLimit),
          newValue: Number(change.newLimit),
        },
      })
    })

    // Notas añadidas
    const notes = await prisma.clientNote.findMany({
      where: { clientId },
      include: {
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    notes.forEach(note => {
      activities.push({
        id: `note-${note.id}`,
        type: 'NOTE_ADDED' as const,
        description: note.content.substring(0, 100) + (note.content.length > 100 ? '...' : ''),
        timestamp: note.createdAt,
        userId: note.userId,
        userName: note.user.name,
      })
    })

    // Ordenar por fecha descendente
    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Añadir nota al cliente
   */
  static async addNote(clientId: string, content: string, userId: string) {
    const note = await prisma.clientNote.create({
      data: {
        clientId,
        userId,
        content,
      },
      include: {
        user: {
          select: { name: true },
        },
      },
    })

    // Auditoría
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'NOTE_ADDED',
        entityType: 'clients',
        entityId: clientId,
        newValue: { noteId: note.id, content },
      },
    })

    return note
  }
}
