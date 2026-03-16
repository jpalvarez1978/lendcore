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

async function updateAdminName() {
  console.log('🔧 Actualizando nombre de usuario en PRODUCCIÓN...\n')

  try {
    const updatedUser = await prisma.user.update({
      where: { email: 'auracaceres@gmail.com' },
      data: {
        name: 'Admin Caceres',
        firstName: 'Admin',
        lastName: 'Caceres',
      },
    })

    console.log('✓ Usuario actualizado exitosamente:')
    console.log(`   Email: ${updatedUser.email}`)
    console.log(`   Nombre: ${updatedUser.name}`)
    console.log(`   FirstName: ${updatedUser.firstName}`)
    console.log(`   LastName: ${updatedUser.lastName}`)
    console.log('')
    console.log('🎉 ¡Nombre actualizado! Ahora aparecerá como "Admin Caceres" en el sistema.')

  } catch (error) {
    console.error('❌ Error al actualizar nombre:', error)
    throw error
  }
}

updateAdminName()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
