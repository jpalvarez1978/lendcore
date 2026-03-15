/**
 * SEED MASIVO - Datos de prueba realistas
 *
 * Genera:
 * - 500+ clientes (individuales y empresas)
 * - Préstamos AMERICANOS en diferentes estados
 * - Clientes en mora (>90, >30, >8, >2 días)
 * - Pagos registrados
 * - 4+ cobradores con asignaciones
 * - Solicitudes en diferentes estados
 */

import { PrismaClient, ClientType, LoanStatus, InterestType, PaymentFrequency, AmortizationType, PaymentMethod, ClientStatus, ApplicationStatus, RiskLevel } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { encrypt } from '../src/lib/security/encryption'

const prisma = new PrismaClient()

// Nombres españoles realistas
const firstNames = [
  'Carlos', 'María', 'José', 'Ana', 'Juan', 'Laura', 'Pedro', 'Carmen', 'Miguel', 'Isabel',
  'Francisco', 'Dolores', 'Antonio', 'Pilar', 'Manuel', 'Teresa', 'David', 'Rosa', 'Javier', 'Ángeles',
  'Daniel', 'Concepción', 'Rafael', 'Mercedes', 'Fernando', 'Josefa', 'Alejandro', 'Francisca', 'Pablo', 'Antonia',
  'Sergio', 'Cristina', 'Jorge', 'Lucía', 'Roberto', 'Elena', 'Ángel', 'Marta', 'Adrián', 'Patricia',
  'Raúl', 'Beatriz', 'Alberto', 'Silvia', 'Diego', 'Rocío', 'Luis', 'Montserrat', 'Iván', 'Nuria',
  'Rubén', 'Sonia', 'Víctor', 'Raquel', 'Eduardo', 'Inmaculada', 'Enrique', 'Amparo', 'Óscar', 'Mónica'
]

const lastNames = [
  'García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín',
  'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Álvarez', 'Muñoz', 'Romero', 'Alonso', 'Gutiérrez',
  'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Ramírez', 'Serrano', 'Blanco', 'Molina',
  'Morales', 'Suárez', 'Ortega', 'Delgado', 'Castro', 'Ortiz', 'Rubio', 'Marín', 'Sanz', 'Iglesias',
  'Nuñez', 'Medina', 'Garrido', 'Santos', 'Castillo', 'Cortés', 'Guerrero', 'Lozano', 'Cano', 'Méndez'
]

const businessNames = [
  'Construcciones', 'Comercial', 'Inversiones', 'Distribuciones', 'Talleres', 'Restaurante', 'Cafetería',
  'Panadería', 'Carnicería', 'Ferretería', 'Carpintería', 'Electricidad', 'Fontanería', 'Pinturas',
  'Transportes', 'Logística', 'Almacenes', 'Consultoría', 'Asesoría', 'Servicios', 'Tecnología',
  'Importaciones', 'Exportaciones', 'Maquinaria', 'Automoción', 'Jardinería', 'Limpieza', 'Seguridad'
]

const cities = [
  'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Bilbao',
  'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'Hospitalet', 'Coruña', 'Granada', 'Vitoria',
  'Elche', 'Oviedo', 'Badalona', 'Cartagena', 'Terrassa', 'Jerez', 'Sabadell', 'Móstoles', 'Alcalá',
  'Pamplona', 'Fuenlabrada', 'Almería', 'Leganés', 'Santander', 'Burgos', 'Castellón', 'Albacete'
]

const streets = [
  'Calle Mayor', 'Avenida de la Constitución', 'Plaza España', 'Calle Real', 'Calle del Sol',
  'Avenida Principal', 'Calle de la Paz', 'Plaza Mayor', 'Calle Cervantes', 'Avenida Libertad'
]

const occupations = [
  'Empleado', 'Comerciante', 'Profesional', 'Técnico', 'Funcionario', 'Autónomo', 'Empresario',
  'Conductor', 'Mecánico', 'Enfermero', 'Profesor', 'Ingeniero', 'Arquitecto', 'Abogado', 'Médico'
]

// Generadores de datos aleatorios
function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number, decimals = 2): number {
  const value = Math.random() * (max - min) + min
  return Number(value.toFixed(decimals))
}

function generateDNI(): string {
  const number = String(randomInt(10000000, 99999999))
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE'
  const letter = letters[parseInt(number) % 23]
  return `${number}${letter}`
}

function generateCIF(): string {
  const letters = 'ABCDEFGHJNPQRSUVW'
  const letter = randomElement(letters.split(''))
  const number = String(randomInt(10000000, 99999999))
  return `${letter}${number}`
}

function generateEmail(name: string): string {
  const domains = ['gmail.com', 'hotmail.com', 'yahoo.es', 'outlook.com']
  return `${name.toLowerCase().replace(/\s/g, '.')}@${randomElement(domains)}`
}

function generatePhone(): string {
  return `6${randomInt(10000000, 99999999)}`
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

async function main() {
  console.log('🚀 Iniciando seed masivo...\n')

  // 1. Crear usuarios del sistema
  console.log('👤 Creando usuarios del sistema...')
  const hashedPassword = await bcrypt.hash('Admin123!', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@lendcore.com' },
    update: {},
    create: {
      email: 'admin@lendcore.com',
      name: 'Admin Sistema',
      firstName: 'Admin',
      lastName: 'Sistema',
      passwordHash: hashedPassword,
      role: 'ADMIN',
    },
  })

  const analyst = await prisma.user.upsert({
    where: { email: 'analyst@lendcore.com' },
    update: {},
    create: {
      email: 'analyst@lendcore.com',
      name: 'Ana Rodríguez',
      firstName: 'Ana',
      lastName: 'Rodríguez',
      passwordHash: await bcrypt.hash('Analyst123!', 12),
      role: 'ANALYST',
    },
  })

  console.log(`✅ Usuarios creados\n`)

  // 2. Crear cobradores
  console.log('👮 Creando cobradores...')
  const collectorNames = ['Carlos Méndez', 'Laura Torres', 'Miguel Santos', 'Patricia Ruiz', 'Javier Morales', 'Elena Navarro']
  const collectors = []

  for (const name of collectorNames) {
    const collector = await prisma.collector.create({
      data: {
        name,
        email: generateEmail(name),
        phone: generatePhone(),
        isActive: true,
      },
    })
    collectors.push(collector)
  }

  console.log(`✅ ${collectors.length} cobradores creados\n`)

  // 3. Crear parámetros del sistema
  console.log('⚙️  Verificando parámetros del sistema...')
  const paramCount = await prisma.systemParameter.count()
  if (paramCount === 0) {
    await prisma.systemParameter.createMany({
      data: [
        { key: 'DEFAULT_INTEREST_RATE', value: '0.03', type: 'DECIMAL', category: 'FINANCIAL' },
        { key: 'MAX_LOAN_AMOUNT', value: '50000', type: 'DECIMAL', category: 'FINANCIAL' },
        { key: 'MIN_LOAN_AMOUNT', value: '100', type: 'DECIMAL', category: 'FINANCIAL' },
        { key: 'DEFAULT_LOAN_TERM_MONTHS', value: '12', type: 'INTEGER', category: 'BUSINESS' },
        { key: 'LATE_PAYMENT_PENALTY_RATE', value: '0.05', type: 'DECIMAL', category: 'FINANCIAL' },
        { key: 'GRACE_PERIOD_DAYS', value: '3', type: 'INTEGER', category: 'COLLECTION' },
      ],
    })
    console.log('✅ Parámetros creados\n')
  } else {
    console.log('✅ Parámetros ya existen\n')
  }

  // 4. Generar 100 clientes
  console.log('👥 Generando 100 clientes...')
  const clients = []
  const today = new Date()

  for (let i = 0; i < 100; i++) {
    const isIndividual = Math.random() > 0.3 // 70% individuales, 30% empresas
    const type: ClientType = isIndividual ? 'INDIVIDUAL' : 'BUSINESS'

    let clientData: any = {
      type,
      status: randomElement<ClientStatus>(['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE']), // 75% activos
      email: encrypt(generateEmail(isIndividual ? `cliente${i}` : `empresa${i}`)),
      phone: encrypt(generatePhone()),
      address: encrypt(`${randomElement(streets)} ${randomInt(1, 200)}`),
      city: randomElement(cities),
      postalCode: String(randomInt(10000, 99999)),
      creditLimit: randomInt(1000, 50000),
      riskLevel: randomElement<RiskLevel>(['LOW', 'LOW', 'MEDIUM', 'MEDIUM', 'HIGH']),
      internalScore: randomInt(300, 850),
    }

    if (isIndividual) {
      const firstName = randomElement(firstNames)
      const lastName = `${randomElement(lastNames)} ${randomElement(lastNames)}`
      const dateOfBirth = new Date(randomInt(1950, 2000), randomInt(0, 11), randomInt(1, 28))

      clientData.individualProfile = {
        create: {
          firstName,
          lastName,
          taxId: encrypt(generateDNI()),
          dateOfBirth,
          occupation: randomElement(occupations),
          income: randomInt(12000, 60000),
        },
      }
    } else {
      const businessName = `${randomElement(businessNames)} ${randomElement(lastNames)}`
      const legalRepName = `${randomElement(firstNames)} ${randomElement(lastNames)}`

      clientData.businessProfile = {
        create: {
          businessName,
          taxId: encrypt(generateCIF()),
          legalRepName,
          legalRepTaxId: encrypt(generateDNI()),
          industry: randomElement(['Comercio', 'Servicios', 'Construcción', 'Hostelería', 'Transporte', 'Tecnología']),
          annualRevenue: randomInt(50000, 500000),
          employeeCount: randomInt(1, 50),
        },
      }
    }

    const client = await prisma.client.create({ data: clientData })
    clients.push(client)

    if ((i + 1) % 25 === 0) {
      console.log(`  ⏳ ${i + 1}/100 clientes creados...`)
    }
  }

  console.log(`✅ 100 clientes creados\n`)

  // 5. Crear solicitudes de crédito
  console.log('📋 Creando solicitudes de crédito...')
  const applications = []
  const applicationStatuses: ApplicationStatus[] = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']

  for (let i = 0; i < 30; i++) {
    const client = randomElement(clients)
    const status = randomElement(applicationStatuses)
    const amount = randomInt(500, 20000)
    const termMonths = randomElement([6, 12, 18, 24, 36])
    const createdAt = addDays(today, -randomInt(1, 180))

    const application = await prisma.creditApplication.create({
      data: {
        clientId: client.id,
        requestedAmount: amount,
        termMonths,
        proposedRate: randomInt(1, 10) / 100, // 1% a 10%
        purpose: randomElement(['Personal', 'Negocio', 'Vehículo', 'Vivienda', 'Educación', 'Consolidación deudas']),
        status,
        createdAt,
        updatedAt: createdAt,
      },
    })
    applications.push(application)
  }

  console.log(`✅ ${applications.length} solicitudes creadas\n`)

  // 6. Crear préstamos AMERICANOS
  console.log('💰 Creando préstamos AMERICANOS...')
  let loansCreated = 0

  // Distribución de estados de préstamos
  const loanScenarios = [
    { status: 'ACTIVE', daysOverdue: 0, count: 30 }, // Activos al día
    { status: 'ACTIVE', daysOverdue: 2, count: 6 }, // Mora 2 días
    { status: 'ACTIVE', daysOverdue: 8, count: 8 }, // Mora 8 días
    { status: 'ACTIVE', daysOverdue: 30, count: 10 }, // Mora 30 días
    { status: 'ACTIVE', daysOverdue: 90, count: 6 }, // Mora 90+ días
    { status: 'PAID', daysOverdue: 0, count: 20 }, // Pagados completamente
  ]

  for (const scenario of loanScenarios) {
    for (let i = 0; i < scenario.count; i++) {
      const client = randomElement(clients.filter(c => c.status === 'ACTIVE'))
      const principalAmount = randomInt(1000, 30000)
      const interestRate = randomFloat(0.01, 0.05, 4) // 1% a 5% mensual
      const termMonths = randomElement([6, 12, 18, 24, 36])
      const disbursementDate = addDays(today, -randomInt(30, 365)) // Entre 1 mes y 1 año atrás
      const firstDueDate = addMonths(disbursementDate, 1)
      const finalDueDate = addMonths(firstDueDate, termMonths - 1)

      // Para préstamos AMERICANOS: solo intereses hasta la última cuota
      const monthlyInterest = principalAmount * interestRate
      const totalInterest = monthlyInterest * termMonths

      const collector = randomElement(collectors)

      const loan = await prisma.loan.create({
        data: {
          loanNumber: `PRE-${String(Date.now() + loansCreated).slice(-7)}`,
          clientId: client.id,
          principalAmount,
          amortizationType: 'AMERICAN', // TODOS AMERICANOS
          interestType: 'PERCENTAGE_MONTHLY',
          interestRate,
          termMonths,
          paymentFrequency: 'MONTHLY',
          disbursementDate,
          firstDueDate,
          finalDueDate,
          status: scenario.status as LoanStatus,
          totalInterest,
          outstandingPrincipal: scenario.status === 'PAID_OFF' ? 0 : principalAmount,
          totalPaid: scenario.status === 'PAID_OFF' ? principalAmount + totalInterest : 0,
          createdBy: analyst.id,
          collectorId: collector.id,
          createdAt: disbursementDate,
        },
      })

      // Crear cuotas
      for (let month = 0; month < termMonths; month++) {
        const dueDate = addMonths(firstDueDate, month)
        const isLastInstallment = month === termMonths - 1

        // AMERICANO: Solo intereses hasta la última, en la última todo el capital
        const principalAmountForInstallment = isLastInstallment ? principalAmount : 0
        const interestAmountForInstallment = monthlyInterest
        const totalAmount = principalAmountForInstallment + interestAmountForInstallment

        // Calcular estado de la cuota según scenario
        let installmentStatus: 'PENDING' | 'PAID' | 'OVERDUE' = 'PENDING'
        let paidPrincipal = 0
        let paidInterest = 0
        let paidPenalty = 0
        let paidAt: Date | null = null

        if (scenario.status === 'PAID_OFF') {
          installmentStatus = 'PAID'
          paidPrincipal = principalAmountForInstallment
          paidInterest = interestAmountForInstallment
          paidAt = addDays(dueDate, randomInt(-5, 5)) // Pagado cerca de la fecha
        } else if (scenario.daysOverdue > 0 && dueDate < addDays(today, -scenario.daysOverdue)) {
          installmentStatus = 'OVERDUE'
        } else if (dueDate < today && Math.random() > 0.3) {
          // 70% de las cuotas vencidas están pagadas
          installmentStatus = 'PAID'
          paidPrincipal = principalAmountForInstallment
          paidInterest = interestAmountForInstallment
          paidAt = addDays(dueDate, randomInt(0, 10))
        }

        await prisma.installment.create({
          data: {
            loanId: loan.id,
            installmentNumber: month + 1,
            dueDate,
            principalAmount: principalAmountForInstallment,
            interestAmount: interestAmountForInstallment,
            penaltyAmount: 0,
            totalAmount,
            status: installmentStatus,
            paidPrincipal,
            paidInterest,
            paidPenalty,
            pendingAmount: totalAmount - (paidPrincipal + paidInterest + paidPenalty),
            paidAt,
          },
        })
      }

      loansCreated++
      if (loansCreated % 100 === 0) {
        console.log(`  ⏳ ${loansCreated} préstamos creados...`)
      }
    }
  }

  console.log(`✅ ${loansCreated} préstamos AMERICANOS creados\n`)

  // 7. Crear pagos
  console.log('💵 Generando pagos...')
  const allLoans = await prisma.loan.findMany({
    include: { installments: true },
  })

  let paymentsCreated = 0
  for (const loan of allLoans) {
    const paidInstallments = loan.installments.filter(i => i.status === 'PAID')

    for (const installment of paidInstallments) {
      if (installment.paidAt) {
        const payment = await prisma.payment.create({
          data: {
            loanId: loan.id,
            amount: Number(installment.paidPrincipal) + Number(installment.paidInterest),
            paymentMethod: randomElement<PaymentMethod>(['CASH', 'BANK_TRANSFER', 'CHECK', 'CARD']),
            paidAt: installment.paidAt,
            reference: Math.random() > 0.5 ? `REF-${randomInt(100000, 999999)}` : null,
            processedById: analyst.id,
          },
        })

        // Las allocations se crean automáticamente en el sistema real
        // Omitimos aquí para simplificar el seed

        paymentsCreated++
      }
    }
  }

  console.log(`✅ ${paymentsCreated} pagos generados\n`)

  console.log('🎉 ¡Seed masivo completado!\n')
  console.log('📊 Resumen:')
  console.log(`   • Clientes: 500`)
  console.log(`   • Solicitudes: ${applications.length}`)
  console.log(`   • Préstamos: ${loansCreated} (TODOS AMERICANOS)`)
  console.log(`   • Cobradores: ${collectors.length}`)
  console.log(`   • Pagos: ${paymentsCreated}`)
  console.log('')
  console.log('🔐 Credenciales:')
  console.log('   • Admin: admin@lendcore.com / Admin123!')
  console.log('   • Analista: analyst@lendcore.com / Analyst123!')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed masivo:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
