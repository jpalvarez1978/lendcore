/**
 * Script de Validación de Seguridad
 *
 * Verifica que todas las medidas de seguridad estén correctamente configuradas
 *
 * Uso: npx tsx scripts/security-check.ts
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

interface CheckResult {
  name: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  fix?: string
}

const results: CheckResult[] = []

function check(name: string, condition: boolean, message: string, fix?: string) {
  results.push({
    name,
    status: condition ? 'pass' : 'fail',
    message,
    fix,
  })
}

function warn(name: string, message: string, fix?: string) {
  results.push({
    name,
    status: 'warning',
    message,
    fix,
  })
}

async function runSecurityChecks() {
  console.log('🔒 Ejecutando verificación de seguridad...\n')

  // ============================================
  // 1. VARIABLES DE ENTORNO
  // ============================================

  console.log('📋 Verificando variables de entorno...')

  const envPath = path.join(process.cwd(), '.env')
  const envExists = fs.existsSync(envPath)

  check('.env existe', envExists, '.env encontrado', 'Crea archivo .env basado en .env.example')

  if (envExists) {
    const envContent = fs.readFileSync(envPath, 'utf-8')

    // ENCRYPTION_KEY
    const hasEncryptionKey = envContent.includes('ENCRYPTION_KEY=')
    check(
      'ENCRYPTION_KEY configurada',
      hasEncryptionKey,
      'Clave de encriptación presente',
      'Agrega ENCRYPTION_KEY generada con: openssl rand -base64 32'
    )

    if (hasEncryptionKey) {
      const keyMatch = envContent.match(/ENCRYPTION_KEY=["']?([^"'\n]+)["']?/)
      if (keyMatch) {
        const key = keyMatch[1]
        const keyLength = Buffer.from(key, 'base64').length

        check(
          'ENCRYPTION_KEY válida',
          keyLength === 32,
          keyLength === 32
            ? 'Clave de 256 bits (AES-256)'
            : `Clave inválida: ${keyLength * 8} bits (debe ser 256)`,
          'Regenera con: openssl rand -base64 32'
        )

        // Verificar que no sea la de ejemplo
        if (key.includes('ejemplo') || key.includes('example') || key === 'tu-clave-aqui') {
          warn(
            'ENCRYPTION_KEY es de ejemplo',
            '⚠️  Usando clave de ejemplo - CAMBIAR en producción',
            'Genera nueva clave con: openssl rand -base64 32'
          )
        }
      }
    }

    // NEXTAUTH_SECRET
    const hasNextAuthSecret = envContent.includes('NEXTAUTH_SECRET=')
    check(
      'NEXTAUTH_SECRET configurada',
      hasNextAuthSecret,
      'Secret de NextAuth presente',
      'Agrega NEXTAUTH_SECRET con valor aleatorio fuerte'
    )

    // DATABASE_URL
    const hasDbUrl = envContent.includes('DATABASE_URL=')
    check(
      'DATABASE_URL configurada',
      hasDbUrl,
      'URL de base de datos presente',
      'Agrega DATABASE_URL con conexión a PostgreSQL'
    )
  }

  // ============================================
  // 2. ARCHIVOS DE SEGURIDAD
  // ============================================

  console.log('\n📂 Verificando archivos de seguridad...')

  const securityFiles = [
    {
      path: 'src/lib/security/rateLimiter.ts',
      name: 'Rate Limiter',
    },
    {
      path: 'src/lib/security/encryption.ts',
      name: 'Encryption',
    },
    {
      path: 'src/services/securityService.ts',
      name: 'Security Service',
    },
    {
      path: 'src/middleware.ts',
      name: 'Security Middleware',
    },
  ]

  for (const file of securityFiles) {
    const filePath = path.join(process.cwd(), file.path)
    check(
      `${file.name} existe`,
      fs.existsSync(filePath),
      `${file.name} implementado`,
      `Verifica que el archivo ${file.path} exista`
    )
  }

  // ============================================
  // 3. PRISMA SCHEMA
  // ============================================

  console.log('\n🗄️  Verificando schema de base de datos...')

  const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma')
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8')
    const hasSecurityLogModel =
      schema.includes('model SecurityLog') || schema.includes('model security_logs')

    check(
      'SecurityLog model existe',
      hasSecurityLogModel,
      hasSecurityLogModel
        ? 'Modelo de logs de seguridad encontrado en schema'
        : 'Modelo de logs de seguridad no encontrado',
      'Ejecuta: npx prisma migrate dev --name add_security_logging'
    )

    check(
      'SecurityEventType enum existe',
      schema.includes('enum SecurityEventType'),
      'Enum SecurityEventType encontrado',
      'Agrega enum SecurityEventType al schema'
    )
  } else {
    check('Schema Prisma existe', false, 'Schema no encontrado', 'Verifica prisma/schema.prisma')
  }

  // ============================================
  // 4. MIDDLEWARE
  // ============================================

  console.log('\n🛡️  Verificando middleware de seguridad...')

  const middlewarePath = path.join(process.cwd(), 'src/middleware.ts')
  if (fs.existsSync(middlewarePath)) {
    const middleware = fs.readFileSync(middlewarePath, 'utf-8')

    check(
      'Content-Security-Policy',
      middleware.includes('Content-Security-Policy'),
      'CSP header configurado',
      'Agrega CSP header en middleware'
    )

    check(
      'Strict-Transport-Security',
      middleware.includes('Strict-Transport-Security'),
      'HSTS header configurado',
      'Agrega HSTS header en middleware'
    )

    check(
      'X-Frame-Options',
      middleware.includes('X-Frame-Options'),
      'Clickjacking protection habilitado',
      'Agrega X-Frame-Options: DENY'
    )

    check(
      'Detección de ataques',
      middleware.includes('detectAttackPatterns') || middleware.includes('sqlPatterns'),
      'Detección de SQL injection/XSS activa',
      'Implementa detección de patrones de ataque'
    )
  }

  // ============================================
  // 5. GITIGNORE
  // ============================================

  console.log('\n📝 Verificando .gitignore...')

  const gitignorePath = path.join(process.cwd(), '.gitignore')
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8')

    check(
      '.env en .gitignore',
      gitignore.includes('.env'),
      '.env NO se subirá a Git',
      'Agrega .env a .gitignore'
    )

    check(
      'Backups en .gitignore',
      gitignore.includes('*.sql') || gitignore.includes('backup'),
      'Backups de BD protegidos',
      'Agrega *.sql a .gitignore'
    )
  }

  // ============================================
  // 6. PACKAGE.JSON - DEPENDENCIAS
  // ============================================

  console.log('\n📦 Verificando dependencias...')

  const packagePath = path.join(process.cwd(), 'package.json')
  if (fs.existsSync(packagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'))
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }

    check('bcryptjs instalado', !!deps.bcryptjs, 'Hashing de contraseñas', 'npm install bcryptjs')

    check('zod instalado', !!deps.zod, 'Validación de inputs', 'npm install zod')

    // Verificar versiones vulnerables conocidas
    if (deps.next) {
      const nextVersion = deps.next.replace('^', '').replace('~', '')
      const [major] = nextVersion.split('.')
      warn(
        'Next.js actualizado',
        parseInt(major) >= 14 ? 'Versión reciente de Next.js' : '⚠️  Actualiza Next.js a v14+',
        'npm install next@latest'
      )
    }
  }

  // ============================================
  // RESUMEN
  // ============================================

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 RESUMEN DE VERIFICACIÓN')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const passed = results.filter((r) => r.status === 'pass').length
  const failed = results.filter((r) => r.status === 'fail').length
  const warnings = results.filter((r) => r.status === 'warning').length

  console.log(`✅ Pasadas:      ${passed}`)
  console.log(`❌ Fallidas:     ${failed}`)
  console.log(`⚠️  Advertencias: ${warnings}`)
  console.log(`📋 Total:        ${results.length}\n`)

  // Mostrar fallos
  if (failed > 0) {
    console.log('❌ VERIFICACIONES FALLIDAS:\n')
    results
      .filter((r) => r.status === 'fail')
      .forEach((r) => {
        console.log(`  • ${r.name}`)
        console.log(`    ${r.message}`)
        if (r.fix) {
          console.log(`    💡 Solución: ${r.fix}`)
        }
        console.log()
      })
  }

  // Mostrar advertencias
  if (warnings > 0) {
    console.log('⚠️  ADVERTENCIAS:\n')
    results
      .filter((r) => r.status === 'warning')
      .forEach((r) => {
        console.log(`  • ${r.name}`)
        console.log(`    ${r.message}`)
        if (r.fix) {
          console.log(`    💡 Recomendación: ${r.fix}`)
        }
        console.log()
      })
  }

  // Resultado final
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  if (failed === 0 && warnings === 0) {
    console.log('🎉 ¡PERFECTO! Todas las verificaciones de seguridad pasaron.\n')
    return 0
  } else if (failed === 0) {
    console.log('✅ Configuración básica correcta, pero revisa las advertencias.\n')
    return 0
  } else {
    console.log('❌ Hay problemas de seguridad que deben resolverse antes de producción.\n')
    return 1
  }
}

// Ejecutar
runSecurityChecks()
  .then((exitCode) => {
    process.exit(exitCode)
  })
  .catch((error) => {
    console.error('💥 Error durante verificación:', error)
    process.exit(1)
  })
