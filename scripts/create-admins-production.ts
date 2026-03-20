import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { readFileSync } from 'fs'
import { join } from 'path'

// Leer y parsear .env.vercel.production manualmente
const envPath = join(__dirname, '..', '.env.vercel.production')
const envContent = readFileSync(envPath, 'utf-8')
const envVars: Record<string, string> = {}

envContent.split('\n').forEach(line => {
  const trimmedLine = line.trim()
  if (trimmedLine && !trimmedLine.startsWith('#')) {
    const [key, ...valueParts] = trimmedLine.split('=')
    if (key && valueParts.length > 0) {
      // Remover comillas y caracteres especiales
      let value = valueParts.join('=').trim()
      value = value.replace(/^["']|["']$/g, '')
      value = value.replace(/\\n/g, '') // Remover \n literales
      value = value.trim()
      envVars[key.trim()] = value
    }
  }
})

// Aplicar variables de entorno
Object.assign(process.env, envVars)

const prisma = new PrismaClient()

async function createAdminsProduction() {
  const dbUrl = process.env.DATABASE_URL || ''

  console.log('🔧 Creando usuarios administradores en PRODUCCIÓN...')
  console.log(`📊 Database: ${dbUrl.includes('neon.tech') ? '✓ Neon (PRODUCCIÓN)' : '✗ Local (ERROR)'}`)
  console.log(`   ${dbUrl.substring(0, 60)}...`)
  console.log('')

  if (!dbUrl.includes('neon.tech')) {
    throw new Error('ERROR: No está conectado a la base de datos de producción')
  }

  try {
    // Nueva contraseña temporal
    const password = 'JeanPaul2026!'
    const passwordHash = await bcrypt.hash(password, 12)

    // Verificar que el hash funciona ANTES de crear usuarios
    const testMatch = await bcrypt.compare(password, passwordHash)
    console.log(`🧪 Pre-test de contraseña: ${testMatch ? '✓ Hash correcto' : '✗ Error en hash'}`)

    if (!testMatch) {
      throw new Error('El hash de contraseña no funciona correctamente')
    }
    console.log('')

    // Admin 1: auracaceres@gmail.com
    const admin1 = await prisma.user.upsert({
      where: { email: 'auracaceres@gmail.com' },
      update: {
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        name: 'Aura Cáceres',
        firstName: 'Aura',
        lastName: 'Cáceres',
      },
      create: {
        email: 'auracaceres@gmail.com',
        passwordHash,
        name: 'Aura Cáceres',
        firstName: 'Aura',
        lastName: 'Cáceres',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    })

    console.log('✓ Usuario 1 creado/actualizado en PRODUCCIÓN:')
    console.log(`   ID: ${admin1.id}`)
    console.log(`   Email: ${admin1.email}`)
    console.log(`   Nombre: ${admin1.name}`)
    console.log(`   Rol: ${admin1.role}`)
    console.log(`   Estado: ${admin1.status}`)
    console.log('')

    // Admin 2: jpalvareztorres11@gmail.com
    const admin2 = await prisma.user.upsert({
      where: { email: 'jpalvareztorres11@gmail.com' },
      update: {
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        name: 'Juan Pablo Álvarez Torres',
        firstName: 'Juan Pablo',
        lastName: 'Álvarez Torres',
      },
      create: {
        email: 'jpalvareztorres11@gmail.com',
        passwordHash,
        name: 'Juan Pablo Álvarez Torres',
        firstName: 'Juan Pablo',
        lastName: 'Álvarez Torres',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    })

    console.log('✓ Usuario 2 creado/actualizado en PRODUCCIÓN:')
    console.log(`   ID: ${admin2.id}`)
    console.log(`   Email: ${admin2.email}`)
    console.log(`   Nombre: ${admin2.name}`)
    console.log(`   Rol: ${admin2.role}`)
    console.log(`   Estado: ${admin2.status}`)
    console.log('')

    // Verificación final - Leer usuarios de la base de datos y verificar contraseña
    console.log('🔍 Verificación final en base de datos de producción...')
    const verifyUser1 = await prisma.user.findUnique({
      where: { email: 'auracaceres@gmail.com' }
    })

    const verifyUser2 = await prisma.user.findUnique({
      where: { email: 'jpalvareztorres11@gmail.com' }
    })

    if (verifyUser1 && verifyUser2) {
      const test1 = await bcrypt.compare(password, verifyUser1.passwordHash)
      const test2 = await bcrypt.compare(password, verifyUser2.passwordHash)

      console.log(`✓ Usuario 1 - Contraseña válida: ${test1 ? 'SÍ ✓' : 'NO ✗'}`)
      console.log(`✓ Usuario 2 - Contraseña válida: ${test2 ? 'SÍ ✓' : 'NO ✗'}`)
      console.log('')

      if (!test1 || !test2) {
        throw new Error('Las contraseñas no coinciden después de la creación')
      }
    }

    console.log('🎉 ¡Usuarios creados exitosamente en BASE DE DATOS DE PRODUCCIÓN!')
    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📝 CREDENCIALES DE ACCESO')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('🌐 URL: https://lendcore.vercel.app/login')
    console.log('')
    console.log('👤 Usuario 1:')
    console.log('   Email: auracaceres@gmail.com')
    console.log('   Contraseña: JeanPaul2026!')
    console.log('')
    console.log('👤 Usuario 2:')
    console.log('   Email: jpalvareztorres11@gmail.com')
    console.log('   Contraseña: JeanPaul2026!')
    console.log('')
    console.log('⚠️  IMPORTANTE:')
    console.log('   - Usuarios creados en BASE DE DATOS DE PRODUCCIÓN ✓')
    console.log('   - Ambos usuarios tienen rol ADMIN')
    console.log('   - Deben cambiar su contraseña después del primer login')
    console.log('   - Acceso completo al sistema')
    console.log('')
    console.log('✅ AHORA SÍ DEBEN PODER INGRESAR AL SISTEMA')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  } catch (error) {
    console.error('❌ Error al crear administradores:', error)
    throw error
  }
}

createAdminsProduction()
  .catch((e) => {
    console.error('❌ Error fatal:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
