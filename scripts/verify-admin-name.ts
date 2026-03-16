import { PrismaClient } from '@prisma/client'
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
      let value = valueParts.join('=').trim()
      value = value.replace(/^["']|["']$/g, '')
      value = value.replace(/\\n/g, '')
      value = value.trim()
      envVars[key.trim()] = value
    }
  }
})

Object.assign(process.env, envVars)

const prisma = new PrismaClient()

async function verifyAdminName() {
  console.log('🔍 Verificando nombre en base de datos de PRODUCCIÓN...\n')

  try {
    const user = await prisma.user.findUnique({
      where: { email: 'auracaceres@gmail.com' },
      select: {
        email: true,
        name: true,
        firstName: true,
        lastName: true,
      }
    })

    if (!user) {
      console.log('❌ Usuario no encontrado')
      return
    }

    console.log('📊 Datos actuales en base de datos:')
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.name}`)
    console.log(`   FirstName: ${user.firstName}`)
    console.log(`   LastName: ${user.lastName}`)
    console.log('')

    if (user.name === 'Admin Caceres') {
      console.log('✅ El nombre en la base de datos ES CORRECTO: "Admin Caceres"')
      console.log('')
      console.log('⚠️  Si todavía aparece "Aura Caceres" en la pantalla:')
      console.log('   1. Cerrar sesión (botón de usuario → Cerrar sesión)')
      console.log('   2. Volver a iniciar sesión')
      console.log('   3. El nombre se actualizará automáticamente')
      console.log('')
      console.log('   Motivo: NextAuth cachea el nombre del usuario en la sesión.')
      console.log('   El nombre solo se actualiza al hacer un nuevo login.')
    } else {
      console.log(`❌ El nombre en la base de datos es: "${user.name}"`)
      console.log('   Debería ser: "Admin Caceres"')
    }

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

verifyAdminName()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
