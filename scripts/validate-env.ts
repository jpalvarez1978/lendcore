#!/usr/bin/env tsx

/**
 * LendCore - Validador de Environment Variables (Standalone)
 * ============================================================
 * Valida configuración de environment sin iniciar la app
 * Uso: npm run security:validate-env
 */

import { z } from 'zod'
import * as fs from 'fs'
import * as path from 'path'

// Colores ANSI
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

// Helper de logging
function log(emoji: string, message: string, color: string = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`)
}

// Schema de validación
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL debe ser una URL válida').startsWith('postgresql://', {
    message: 'DATABASE_URL debe usar PostgreSQL',
  }),

  // NextAuth
  NEXTAUTH_SECRET: z
    .string()
    .min(32, 'NEXTAUTH_SECRET debe tener mínimo 32 caracteres')
    .refine(
      (val) => !['changeme', 'REPLACE', 'EXAMPLE', 'test123'].some((bad) => val.includes(bad)),
      { message: 'NEXTAUTH_SECRET parece un valor de ejemplo - generar uno real' }
    ),

  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL debe ser una URL válida'),

  // Encryption
  ENCRYPTION_KEY: z
    .string()
    .min(32, 'ENCRYPTION_KEY debe tener mínimo 32 caracteres')
    .refine(
      (val) => {
        try {
          const decoded = Buffer.from(val, 'base64')
          return decoded.length >= 32
        } catch {
          return false
        }
      },
      { message: 'ENCRYPTION_KEY debe ser base64 válido de 32+ bytes' }
    )
    .refine(
      (val) => !['changeme', 'REPLACE', 'EXAMPLE'].some((bad) => val.includes(bad)),
      { message: 'ENCRYPTION_KEY parece un valor de ejemplo - generar uno real' }
    ),

  // SMTP (opcional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_SECURE: z.enum(['true', 'false']).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // Security Alerts
  SECURITY_ALERT_ENABLED: z.enum(['true', 'false']).optional().default('false'),
  SECURITY_ALERT_EMAIL: z.string().email().optional(),
  SECURITY_ALERT_LEVELS: z.string().optional(),

  // Redis
  REDIS_ENABLED: z.enum(['true', 'false']).optional().default('false'),
  REDIS_URL: z.string().optional(),

  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
  PORT: z.string().optional().default('3001'),
}).refine(
  (data) => {
    // Si SECURITY_ALERT_ENABLED=true, validar SMTP configurado
    if (data.SECURITY_ALERT_ENABLED === 'true') {
      return !!(
        data.SMTP_HOST &&
        data.SMTP_PORT &&
        data.SMTP_USER &&
        data.SMTP_PASSWORD &&
        data.SECURITY_ALERT_EMAIL
      )
    }
    return true
  },
  {
    message: 'Si SECURITY_ALERT_ENABLED=true, configurar SMTP (HOST, PORT, USER, PASSWORD, EMAIL)',
  }
).refine(
  (data) => {
    // Si REDIS_ENABLED=true, validar REDIS_URL
    if (data.REDIS_ENABLED === 'true') {
      return !!data.REDIS_URL
    }
    return true
  },
  {
    message: 'Si REDIS_ENABLED=true, configurar REDIS_URL',
  }
)

// Cargar .env manualmente
function loadEnvFile(envPath: string): Record<string, string> {
  if (!fs.existsSync(envPath)) {
    return {}
  }

  const content = fs.readFileSync(envPath, 'utf-8')
  const env: Record<string, string> = {}

  content.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return

    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()

      // Remover comillas
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      env[key] = value
    }
  })

  return env
}

// Main
async function main() {
  console.log('')
  log('🔍', `${colors.bold}LendCore - Validador de Environment Variables${colors.reset}`, colors.cyan)
  console.log('')

  // Detectar archivo .env
  const rootDir = path.resolve(__dirname, '..')
  const envPath = path.join(rootDir, '.env')
  const envProductionPath = path.join(rootDir, '.env.production')

  let activeEnvPath = envPath
  if (process.env.NODE_ENV === 'production' && fs.existsSync(envProductionPath)) {
    activeEnvPath = envProductionPath
  }

  if (!fs.existsSync(activeEnvPath)) {
    log('❌', `Archivo ${path.basename(activeEnvPath)} no encontrado`, colors.red)
    log('💡', `Crear con: cp .env.production.example ${path.basename(activeEnvPath)}`, colors.yellow)
    process.exit(1)
  }

  log('📁', `Validando: ${path.basename(activeEnvPath)}`, colors.cyan)
  console.log('')

  // Cargar variables
  const envVars = loadEnvFile(activeEnvPath)

  // Validar con Zod
  try {
    const validated = envSchema.parse(envVars)

    log('✅', `${colors.bold}Configuración válida${colors.reset}`, colors.green)
    console.log('')

    // Resumen
    log('📊', `${colors.bold}Resumen:${colors.reset}`, colors.cyan)
    console.log(`   • Database: ${validated.DATABASE_URL.split('@')[1]?.split('/')[0] || 'configurado'}`)
    console.log(`   • NextAuth: ${validated.NEXTAUTH_URL}`)
    console.log(`   • Encryption: AES-256-GCM ✅`)
    console.log(`   • SMTP: ${validated.SMTP_HOST ? `${validated.SMTP_HOST}:${validated.SMTP_PORT}` : 'No configurado'}`)
    console.log(`   • Security Alerts: ${validated.SECURITY_ALERT_ENABLED === 'true' ? '✅ Habilitado' : '❌ Deshabilitado'}`)
    console.log(`   • Redis: ${validated.REDIS_ENABLED === 'true' ? '✅ Habilitado' : '❌ Memoria'}`)
    console.log(`   • Ambiente: ${validated.NODE_ENV}`)
    console.log('')

    // Warnings
    if (validated.NODE_ENV === 'production') {
      if (validated.SECURITY_ALERT_ENABLED !== 'true') {
        log('⚠️', 'RECOMENDACIÓN: Habilitar SECURITY_ALERT_ENABLED en producción', colors.yellow)
      }
      if (validated.REDIS_ENABLED !== 'true') {
        log('⚠️', 'RECOMENDACIÓN: Usar Redis en producción (multi-instancia)', colors.yellow)
      }
      if (!validated.DATABASE_URL.includes('sslmode=require')) {
        log('⚠️', 'RECOMENDACIÓN: Usar sslmode=require en DATABASE_URL', colors.yellow)
      }
    }

    console.log('')
    log('✨', 'Validación completada sin errores', colors.green)
    process.exit(0)
  } catch (error) {
    if (error instanceof z.ZodError) {
      log('❌', `${colors.bold}Configuración inválida${colors.reset}`, colors.red)
      console.log('')
      log('📋', `${colors.bold}Errores encontrados:${colors.reset}`, colors.yellow)

      error.errors.forEach((err, index) => {
        const path = err.path.join('.')
        console.log(`   ${index + 1}. ${colors.red}${path}${colors.reset}: ${err.message}`)
      })

      console.log('')
      log('💡', 'Generar secrets seguros con: npm run security:generate', colors.cyan)
      process.exit(1)
    }

    log('❌', `Error inesperado: ${error}`, colors.red)
    process.exit(1)
  }
}

main()
