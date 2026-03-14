/**
 * LendCore - Security Alert Email Template
 * ==========================================
 * Template HTML profesional para alertas de seguridad
 */

import { SecurityEventType, SecuritySeverity } from '@prisma/client'

export interface SecurityAlertData {
  eventType: SecurityEventType
  severity: SecuritySeverity
  description: string
  ipAddress?: string
  email?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

/**
 * Obtener emoji según severidad
 */
function getSeverityEmoji(severity: SecuritySeverity): string {
  const emojis = {
    INFO: '📘',
    WARNING: '⚠️',
    ALERT: '🚨',
    CRITICAL: '🔴',
  }
  return emojis[severity] || '📘'
}

/**
 * Obtener color según severidad
 */
function getSeverityColor(severity: SecuritySeverity): string {
  const colors = {
    INFO: '#3b82f6', // blue-500
    WARNING: '#f59e0b', // amber-500
    ALERT: '#ef4444', // red-500
    CRITICAL: '#dc2626', // red-600
  }
  return colors[severity] || '#3b82f6'
}

/**
 * Obtener label legible del tipo de evento
 */
function getEventTypeLabel(eventType: SecurityEventType): string {
  const labels: Record<SecurityEventType, string> = {
    LOGIN_SUCCESS: 'Login Exitoso',
    LOGIN_FAILED: 'Login Fallido',
    LOGOUT: 'Cierre de Sesión',
    PASSWORD_CHANGE: 'Cambio de Contraseña',
    PERMISSION_CHANGE: 'Cambio de Permisos',
    RATE_LIMIT_EXCEEDED: 'Límite de Tasa Excedido',
    UNAUTHORIZED_ACCESS: 'Acceso No Autorizado',
    SUSPICIOUS_ACTIVITY: 'Actividad Sospechosa',
    IP_BLOCKED: 'IP Bloqueada',
    MASS_EXPORT: 'Exportación Masiva',
    MASS_DELETE: 'Eliminación Masiva',
    SESSION_EXPIRED: 'Sesión Expirada',
  }
  return labels[eventType] || eventType
}

/**
 * Construir email de alerta de seguridad
 */
export function buildSecurityAlertEmail(data: SecurityAlertData) {
  const emoji = getSeverityEmoji(data.severity)
  const color = getSeverityColor(data.severity)
  const eventLabel = getEventTypeLabel(data.eventType)

  // Subject
  const subject = `${emoji} Alerta de Seguridad: ${eventLabel} [${data.severity}]`

  // Plain text version
  const text = `
ALERTA DE SEGURIDAD - LENDCORE

Tipo de evento: ${eventLabel}
Severidad: ${data.severity}
Descripción: ${data.description}

Detalles:
${data.email ? `- Email: ${data.email}` : ''}
${data.ipAddress ? `- IP: ${data.ipAddress}` : ''}
- Timestamp: ${new Date(data.timestamp).toLocaleString('es-ES')}

${data.metadata ? `Metadata:\n${JSON.stringify(data.metadata, null, 2)}` : ''}

---
Este es un mensaje automático de LendCore.
No responder a este email.
  `.trim()

  // HTML version
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta de Seguridad</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">

  <!-- Container -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: ${color}; padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${emoji} Alerta de Seguridad
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">

              <!-- Event Type Badge -->
              <div style="display: inline-block; background-color: ${color}15; color: ${color}; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 600; margin-bottom: 20px;">
                ${eventLabel}
              </div>

              <!-- Severity Badge -->
              <div style="display: inline-block; background-color: ${color}; color: #ffffff; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 600; margin-bottom: 20px; margin-left: 10px;">
                ${data.severity}
              </div>

              <!-- Description -->
              <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 20px 0;">
                <strong>Descripción:</strong><br>
                ${data.description}
              </p>

              <!-- Details Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; background-color: #f9fafb; border-radius: 6px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #111827;">Detalles del Evento</h3>

                    ${
                      data.email
                        ? `
                    <p style="margin: 8px 0; font-size: 14px; color: #6b7280;">
                      <strong>Email:</strong> ${data.email}
                    </p>
                    `
                        : ''
                    }

                    ${
                      data.ipAddress
                        ? `
                    <p style="margin: 8px 0; font-size: 14px; color: #6b7280;">
                      <strong>IP Address:</strong> ${data.ipAddress}
                    </p>
                    `
                        : ''
                    }

                    <p style="margin: 8px 0; font-size: 14px; color: #6b7280;">
                      <strong>Timestamp:</strong> ${new Date(data.timestamp).toLocaleString('es-ES', {
                        dateStyle: 'full',
                        timeStyle: 'long',
                      })}
                    </p>

                    ${
                      data.metadata && Object.keys(data.metadata).length > 0
                        ? `
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;"><strong>Metadata:</strong></p>
                      <pre style="font-size: 12px; color: #6b7280; background-color: #ffffff; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(data.metadata, null, 2)}</pre>
                    </div>
                    `
                        : ''
                    }
                  </td>
                </tr>
              </table>

              <!-- Action Required (if critical) -->
              ${
                data.severity === 'CRITICAL' || data.severity === 'ALERT'
                  ? `
              <div style="margin-top: 30px; padding: 20px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 6px;">
                <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 600;">
                  ⚠️ Acción Requerida
                </p>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #7f1d1d; line-height: 1.5;">
                  Este evento requiere atención inmediata. Por favor, revisa los logs de seguridad y toma las medidas necesarias.
                </p>
              </div>
              `
                  : ''
              }

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                Este es un mensaje automático de <strong>LendCore</strong>.<br>
                No responder a este email.
              </p>
              <p style="margin: 15px 0 0 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} LendCore. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `.trim()

  return {
    subject,
    text,
    html,
  }
}
