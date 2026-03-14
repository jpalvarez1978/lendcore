#!/usr/bin/env tsx

/**
 * LendCore - Test Security Email Alerts
 * ======================================
 * Prueba el envío de emails de alertas de seguridad
 * Uso: npx tsx scripts/test-security-email.ts
 */

import { buildSecurityAlertEmail } from '../src/lib/email/templates/security-alert'
import { SecurityEventType, SecuritySeverity } from '@prisma/client'

// Colores
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

function log(emoji: string, message: string, color: string = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`)
}

async function main() {
  console.log('')
  log('📧', `${colors.bold}Test de Email de Seguridad${colors.reset}`, colors.cyan)
  console.log('')

  // Verificar configuración SMTP
  const smtpConfigured = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASSWORD
  )

  if (!smtpConfigured) {
    log('ℹ️', 'SMTP no configurado en .env - modo dry-run (solo preview)', colors.yellow)
    console.log('')
  }

  // Ejemplos de alertas por severidad
  const testCases: Array<{
    severity: SecuritySeverity
    eventType: SecurityEventType
    description: string
  }> = [
    {
      severity: 'INFO',
      eventType: 'LOGIN_SUCCESS',
      description: 'Usuario admin@lendcore.com inició sesión correctamente',
    },
    {
      severity: 'WARNING',
      eventType: 'LOGIN_FAILED',
      description: 'Intento de login fallido - credenciales incorrectas',
    },
    {
      severity: 'ALERT',
      eventType: 'RATE_LIMIT_EXCEEDED',
      description: 'Límite de intentos de login excedido - posible ataque de fuerza bruta',
    },
    {
      severity: 'CRITICAL',
      eventType: 'UNAUTHORIZED_ACCESS',
      description: 'Intento de acceso no autorizado a endpoint protegido: /api/admin/users',
    },
  ]

  for (const testCase of testCases) {
    const emailData = buildSecurityAlertEmail({
      eventType: testCase.eventType,
      severity: testCase.severity,
      description: testCase.description,
      ipAddress: '192.168.1.100',
      email: 'admin@lendcore.com',
      timestamp: new Date().toISOString(),
      metadata: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        endpoint: '/api/auth/signin',
        method: 'POST',
      },
    })

    log('✉️', `${colors.bold}Severidad: ${testCase.severity}${colors.reset}`, colors.cyan)
    console.log(`   Subject: ${emailData.subject}`)
    console.log(`   Preview: ${testCase.description}`)
    console.log('')
  }

  // Generar preview HTML
  const criticalAlert = buildSecurityAlertEmail({
    eventType: 'RATE_LIMIT_EXCEEDED',
    severity: 'CRITICAL',
    description: 'Cuenta bloqueada después de 10 intentos de login fallidos en 5 minutos',
    ipAddress: '203.0.113.42',
    email: 'admin@lendcore.com',
    timestamp: new Date().toISOString(),
    metadata: {
      failedAttempts: 10,
      lockDuration: '30 minutos',
      suspiciousActivity: true,
    },
  })

  // Guardar preview
  const fs = await import('fs')
  const path = await import('path')
  const previewPath = path.join(__dirname, '..', 'security-alert-preview.html')

  fs.writeFileSync(previewPath, criticalAlert.html)

  log('✅', `Preview HTML guardado en: security-alert-preview.html`, colors.green)
  log('💡', `Abrir en navegador para ver el diseño`, colors.cyan)
  console.log('')

  // Test envío real (si SMTP configurado)
  if (smtpConfigured) {
    log('📤', 'Intentando envío de prueba...', colors.yellow)

    try {
      const { sendEmail } = await import('../src/lib/email/mailer')
      const testEmail = process.env.SECURITY_ALERT_EMAIL || process.env.SMTP_USER

      if (!testEmail) {
        log('❌', 'No se encontró email de destino (SECURITY_ALERT_EMAIL o SMTP_USER)', colors.red)
        process.exit(1)
      }

      const sent = await sendEmail({
        to: testEmail,
        subject: criticalAlert.subject,
        text: criticalAlert.text,
        html: criticalAlert.html,
      })

      if (sent) {
        log('✅', `Email de prueba enviado a: ${testEmail}`, colors.green)
      } else {
        log('❌', 'Error al enviar email - verificar configuración SMTP', colors.red)
      }
    } catch (error) {
      log('❌', `Error: ${error}`, colors.red)
      process.exit(1)
    }
  } else {
    log('💡', 'Para probar envío real, configurar SMTP en .env:', colors.cyan)
    console.log('   SMTP_HOST=smtp.gmail.com')
    console.log('   SMTP_PORT=587')
    console.log('   SMTP_USER=your-email@gmail.com')
    console.log('   SMTP_PASSWORD=your-app-password')
    console.log('   SECURITY_ALERT_EMAIL=security@yourdomain.com')
  }

  console.log('')
  log('✨', 'Test completado', colors.green)
}

main()
