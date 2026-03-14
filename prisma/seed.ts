import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { encrypt } from '../src/lib/security/encryption'
import { seedParameters } from './seeds/parameters'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Seed parameters first
  await seedParameters()

  // Crear usuario administrador
  const adminPassword = await bcrypt.hash('Admin123!', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lendcore.com' },
    update: {},
    create: {
      email: 'admin@lendcore.com',
      passwordHash: adminPassword,
      name: 'Admin Sistema',
      firstName: 'Admin',
      lastName: 'Sistema',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  })

  console.log('✓ Usuario administrador creado:', admin.email)

  // Crear usuario analista
  const analystPassword = await bcrypt.hash('Analyst123!', 10)
  const analyst = await prisma.user.upsert({
    where: { email: 'analyst@lendcore.com' },
    update: {},
    create: {
      email: 'analyst@lendcore.com',
      passwordHash: analystPassword,
      name: 'Ana Rodríguez',
      firstName: 'Ana',
      lastName: 'Rodríguez',
      role: 'ANALYST',
      status: 'ACTIVE',
    },
  })

  console.log('✓ Usuario analista creado:', analyst.email)

  // Crear usuario de cobranza
  const collectionPassword = await bcrypt.hash('Collector123!', 10)
  const collector = await prisma.user.upsert({
    where: { email: 'collector@lendcore.com' },
    update: {},
    create: {
      email: 'collector@lendcore.com',
      passwordHash: collectionPassword,
      name: 'Carlos Méndez',
      firstName: 'Carlos',
      lastName: 'Méndez',
      role: 'COLLECTION',
      status: 'ACTIVE',
    },
  })

  console.log('✓ Usuario de cobranza creado:', collector.email)

  // Crear cliente de prueba (persona física)
  const client1 = await prisma.client.create({
    data: {
      type: 'INDIVIDUAL',
      status: 'ACTIVE',
      riskLevel: 'MEDIUM',
      email: encrypt('juan.garcia@email.com'),
      phone: encrypt('+34 600 123 456'),
      address: encrypt('Calle Gran Vía, 45'),
      city: 'Madrid',
      postalCode: '48001',
      creditLimit: 30000.00,
      internalScore: 72,
      individualProfile: {
        create: {
          firstName: 'Juan',
          lastName: 'García Pérez',
          taxId: encrypt('12345678A'),
          dateOfBirth: new Date('1985-05-15'),
          occupation: 'Ingeniero',
          income: 45000.00,
          reference1Name: 'María López',
          reference1Phone: encrypt('+34 600 111 222'),
        },
      },
    },
  })

  console.log('✓ Cliente individual creado:', client1.id)

  // Crear cliente de prueba (empresa)
  const client2 = await prisma.client.create({
    data: {
      type: 'BUSINESS',
      status: 'ACTIVE',
      riskLevel: 'LOW',
      email: encrypt('info@constructora-abc.com'),
      phone: encrypt('+34 944 123 456'),
      address: encrypt('Polígono Industrial Asua, Nave 12'),
      city: 'Madrid',
      postalCode: '48930',
      creditLimit: 100000.00,
      internalScore: 85,
      businessProfile: {
        create: {
          businessName: 'Constructora ABC SL',
          taxId: encrypt('B12345678'),
          legalRepName: 'Alberto Martínez',
          legalRepTaxId: encrypt('87654321B'),
          industry: 'Construcción',
          annualRevenue: 500000.00,
          employeeCount: 15,
        },
      },
    },
  })

  console.log('✓ Cliente empresa creado:', client2.id)

  console.log('🎉 Seed completado exitosamente!')
  console.log('\n📝 Credenciales de acceso:')
  console.log('   Admin:      admin@lendcore.com / Admin123!')
  console.log('   Analista:   analyst@lendcore.com / Analyst123!')
  console.log('   Cobranza:   collector@lendcore.com / Collector123!')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
