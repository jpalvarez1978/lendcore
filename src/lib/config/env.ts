/**
 * LendCore - Environment Variables Validator
 * ===========================================
 * Valida y expone variables de entorno con type-safety
 * Fail-fast: Si la configuración es inválida, la app no inicia
 */

import { z } from 'zod'

/**
 * Schema de validación de environment variables
 */
const envSchema = z
  .object({
    // Database
    DATABASE_URL: z
      .string()
      .url('DATABASE_URL debe ser una URL válida')
      .startsWith('postgresql://', {
        message: 'DATABASE_URL debe usar PostgreSQL',
      }),

    // NextAuth
    NEXTAUTH_SECRET: z
      .string()
      .min(32, 'NEXTAUTH_SECRET debe tener mínimo 32 caracteres')
      .refine(
        (val) => !['changeme', 'REPLACE', 'EXAMPLE', 'test123'].some((bad) => val.toUpperCase().includes(bad)),
        { message: 'NEXTAUTH_SECRET parece un valor de ejemplo - generar uno real con: npm run security:generate' }
      ),

    NEXTAUTH_URL: z.string().url('NEXTAUTH_URL debe ser una URL válida'),

    // Encryption (AES-256-GCM)
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
        { message: 'ENCRYPTION_KEY debe ser base64 válido de 32+ bytes - generar con: npm run security:generate' }
      )
      .refine(
        (val) => !['changeme', 'REPLACE', 'EXAMPLE'].some((bad) => val.toUpperCase().includes(bad)),
        { message: 'ENCRYPTION_KEY parece un valor de ejemplo - generar uno real con: npm run security:generate' }
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
    SECURITY_ALERT_EMAIL: z.string().email('SECURITY_ALERT_EMAIL debe ser un email válido').optional(),
    SECURITY_ALERT_LEVELS: z.string().optional(),

    // Redis
    REDIS_ENABLED: z.enum(['true', 'false']).optional().default('false'),
    REDIS_URL: z.string().optional(),

    // Application
    NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
    PORT: z.string().optional().default('3001'),

    // Organization (opcional)
    ORG_NAME: z.string().optional(),
    ORG_EMAIL: z.string().email().optional(),
  })
  .refine(
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
      message:
        'Si SECURITY_ALERT_ENABLED=true, configurar SMTP completo (HOST, PORT, USER, PASSWORD) y SECURITY_ALERT_EMAIL',
    }
  )
  .refine(
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
  .refine(
    (data) => {
      // En producción, advertir si DATABASE_URL no usa SSL
      if (data.NODE_ENV === 'production' && !data.DATABASE_URL.includes('sslmode=require')) {
        console.warn('⚠️  ADVERTENCIA: DATABASE_URL en producción debería usar sslmode=require')
      }
      return true
    },
    {
      message: 'Validación de SSL en producción',
    }
  )

/**
 * Tipo inferido del schema
 */
type Env = z.infer<typeof envSchema>

/**
 * Parsea y valida las variables de entorno
 * @throws {Error} Si la validación falla
 */
function parseEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env)

    // Warnings en consola (no bloquean)
    if (parsed.NODE_ENV === 'production') {
      if (parsed.SECURITY_ALERT_ENABLED !== 'true') {
        console.warn('⚠️  RECOMENDACIÓN: Habilitar SECURITY_ALERT_ENABLED=true en producción')
      }
      if (parsed.REDIS_ENABLED !== 'true') {
        console.warn('⚠️  RECOMENDACIÓN: Usar Redis en producción para rate limiting (multi-instancia)')
      }
    }

    return parsed
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('\n❌ CONFIGURACIÓN INVÁLIDA - La aplicación no puede iniciar\n')
      console.error('Errores encontrados:')
      error.errors.forEach((err, index) => {
        const path = err.path.join('.') || 'general'
        console.error(`  ${index + 1}. ${path}: ${err.message}`)
      })
      console.error('\n💡 Generar secrets seguros con: npm run security:generate')
      console.error('💡 Validar configuración con: npm run security:validate-env\n')

      process.exit(1)
    }

    throw error
  }
}

/**
 * Variables de entorno validadas
 * Exportar como singleton
 */
export const env = parseEnv()

/**
 * Helper para verificar si estamos en producción
 */
export const isProduction = env.NODE_ENV === 'production'

/**
 * Helper para verificar si estamos en desarrollo
 */
export const isDevelopment = env.NODE_ENV === 'development'

/**
 * Helper para verificar si estamos en test
 */
export const isTest = env.NODE_ENV === 'test'
