/**
 * Security Service - Registro y Monitoreo de Eventos de Seguridad
 *
 * Funcionalidades:
 * - Log de intentos de login (éxito/fallo)
 * - Detección de actividad sospechosa
 * - Alertas automáticas
 * - Bloqueo de IPs
 */

import { prisma } from '@/lib/prisma'
import { Prisma, SecurityEventType, SecuritySeverity } from '@prisma/client'

interface SecurityLogData {
  eventType: SecurityEventType
  severity?: SecuritySeverity
  userId?: string
  email?: string
  ipAddress: string
  userAgent?: string
  location?: string
  description: string
  metadata?: Prisma.InputJsonValue | null
  isBlocked?: boolean
}

export class SecurityService {
  /**
   * Registrar evento de seguridad
   */
  static async logEvent(data: SecurityLogData) {
    try {
      const log = await prisma.securityLog.create({
        data: {
          eventType: data.eventType,
          severity: data.severity || SecuritySeverity.INFO,
          userId: data.userId,
          email: data.email,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          location: data.location,
          description: data.description,
          metadata: data.metadata,
          isBlocked: data.isBlocked || false,
          alertSent: false,
        },
      })

      // Verificar si necesita enviar alerta
      if (data.severity === SecuritySeverity.CRITICAL || data.severity === SecuritySeverity.ALERT) {
        await this.checkAndSendAlert(log.id, data)
      }

      return log
    } catch (error) {
      console.error('Error logging security event:', error)
      // No lanzar error para no bloquear la operación principal
    }
  }

  /**
   * Login exitoso
   */
  static async logLoginSuccess(userId: string, email: string, ipAddress: string, userAgent?: string) {
    return this.logEvent({
      eventType: SecurityEventType.LOGIN_SUCCESS,
      severity: SecuritySeverity.INFO,
      userId,
      email,
      ipAddress,
      userAgent,
      description: `Login exitoso para ${email}`,
      metadata: { timestamp: new Date().toISOString() },
    })
  }

  /**
   * Login fallido
   */
  static async logLoginFailed(email: string, ipAddress: string, reason: string, userAgent?: string) {
    // Contar intentos fallidos recientes
    const recentFailures = await this.countRecentFailedLogins(email, ipAddress)

    const severity =
      recentFailures >= 5
        ? SecuritySeverity.ALERT
        : recentFailures >= 3
        ? SecuritySeverity.WARNING
        : SecuritySeverity.INFO

    return this.logEvent({
      eventType: SecurityEventType.LOGIN_FAILED,
      severity,
      email,
      ipAddress,
      userAgent,
      description: `Login fallido para ${email}: ${reason}`,
      metadata: {
        reason,
        failureCount: recentFailures + 1,
        timestamp: new Date().toISOString(),
      },
    })
  }

  /**
   * Logout
   */
  static async logLogout(userId: string, email: string, ipAddress: string) {
    return this.logEvent({
      eventType: SecurityEventType.LOGOUT,
      severity: SecuritySeverity.INFO,
      userId,
      email,
      ipAddress,
      description: `Logout de ${email}`,
    })
  }

  /**
   * Cambio de contraseña
   */
  static async logPasswordChange(userId: string, email: string, ipAddress: string) {
    return this.logEvent({
      eventType: SecurityEventType.PASSWORD_CHANGE,
      severity: SecuritySeverity.INFO,
      userId,
      email,
      ipAddress,
      description: `Cambio de contraseña para ${email}`,
    })
  }

  /**
   * Cambio de permisos
   */
  static async logPermissionChange(
    adminId: string,
    adminEmail: string,
    targetUserId: string,
    targetEmail: string,
    oldRole: string,
    newRole: string,
    ipAddress: string
  ) {
    return this.logEvent({
      eventType: SecurityEventType.PERMISSION_CHANGE,
      severity: SecuritySeverity.WARNING,
      userId: adminId,
      email: adminEmail,
      ipAddress,
      description: `${adminEmail} cambió rol de ${targetEmail}: ${oldRole} → ${newRole}`,
      metadata: {
        targetUserId,
        targetEmail,
        oldRole,
        newRole,
      },
    })
  }

  /**
   * Rate limit excedido
   */
  static async logRateLimitExceeded(
    identifier: string,
    ipAddress: string,
    endpoint: string,
    attempts: number
  ) {
    return this.logEvent({
      eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
      severity: SecuritySeverity.WARNING,
      email: identifier.includes('@') ? identifier : undefined,
      ipAddress,
      description: `Rate limit excedido en ${endpoint}`,
      metadata: {
        identifier,
        endpoint,
        attempts,
      },
    })
  }

  /**
   * Actividad sospechosa
   */
  static async logSuspiciousActivity(
    userId: string | undefined,
    email: string | undefined,
    ipAddress: string,
    activityType: string,
    details: Prisma.InputJsonObject
  ) {
    return this.logEvent({
      eventType: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: SecuritySeverity.ALERT,
      userId,
      email,
      ipAddress,
      description: `Actividad sospechosa detectada: ${activityType}`,
      metadata: details,
    })
  }

  /**
   * Exportación masiva
   */
  static async logMassExport(
    userId: string,
    email: string,
    ipAddress: string,
    recordCount: number,
    exportType: string
  ) {
    const severity = recordCount > 1000 ? SecuritySeverity.WARNING : SecuritySeverity.INFO

    return this.logEvent({
      eventType: SecurityEventType.MASS_EXPORT,
      severity,
      userId,
      email,
      ipAddress,
      description: `Exportación de ${recordCount} registros (${exportType})`,
      metadata: {
        recordCount,
        exportType,
      },
    })
  }

  /**
   * Acceso no autorizado
   */
  static async logUnauthorizedAccess(
    userId: string | undefined,
    email: string | undefined,
    ipAddress: string,
    resource: string,
    requiredPermission: string
  ) {
    return this.logEvent({
      eventType: SecurityEventType.UNAUTHORIZED_ACCESS,
      severity: SecuritySeverity.ALERT,
      userId,
      email,
      ipAddress,
      description: `Intento de acceso no autorizado a ${resource}`,
      metadata: {
        resource,
        requiredPermission,
      },
    })
  }

  /**
   * Contar intentos fallidos recientes (últimos 15 minutos)
   */
  private static async countRecentFailedLogins(email: string, ipAddress: string): Promise<number> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)

    const count = await prisma.securityLog.count({
      where: {
        eventType: SecurityEventType.LOGIN_FAILED,
        OR: [{ email }, { ipAddress }],
        createdAt: {
          gte: fifteenMinutesAgo,
        },
      },
    })

    return count
  }

  /**
   * Detectar actividad sospechosa automáticamente
   */
  static async detectSuspiciousActivity(userId: string, ipAddress: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    // Detectar múltiples IPs en poco tiempo
    const recentLogs = await prisma.securityLog.findMany({
      where: {
        userId,
        createdAt: { gte: oneHourAgo },
      },
      select: {
        ipAddress: true,
      },
    })

    const uniqueIPs = new Set(recentLogs.map((log) => log.ipAddress))

    // Si hay más de 3 IPs diferentes en 1 hora
    if (uniqueIPs.size > 3) {
      await this.logSuspiciousActivity(userId, undefined, ipAddress, 'Múltiples IPs en corto tiempo', {
        ipCount: uniqueIPs.size,
        ips: Array.from(uniqueIPs),
      })
      return true
    }

    // Detectar actividad excesiva (más de 50 acciones en 1 hora)
    const actionCount = await prisma.securityLog.count({
      where: {
        userId,
        createdAt: { gte: oneHourAgo },
      },
    })

    if (actionCount > 50) {
      await this.logSuspiciousActivity(userId, undefined, ipAddress, 'Actividad excesiva', {
        actionCount,
      })
      return true
    }

    return false
  }

  /**
   * Verificar y enviar alerta si es necesario
   * IMPORTANTE: Usa dynamic imports para evitar problemas con Edge Runtime
   */
  private static async checkAndSendAlert(logId: string, data: SecurityLogData) {
    // 1. Log en consola (siempre)
    console.warn('🚨 ALERTA DE SEGURIDAD:', data.description)

    // 2. Marcar como enviada
    await prisma.securityLog.update({
      where: { id: logId },
      data: { alertSent: true },
    })

    // 3. Verificar si habilitado
    const alertsEnabled = process.env.SECURITY_ALERT_ENABLED === 'true'
    const alertEmail = process.env.SECURITY_ALERT_EMAIL

    if (!alertsEnabled || !alertEmail) {
      console.warn('⚠️  Alertas por email deshabilitadas')
      return
    }

    // 4. Verificar niveles de severidad configurados
    const alertLevels = process.env.SECURITY_ALERT_LEVELS?.split(',') || ['ALERT', 'CRITICAL']
    const severity = data.severity || SecuritySeverity.INFO

    if (!alertLevels.includes(severity)) {
      console.log(`ℹ️  Severidad ${severity} no configurada para alertas`)
      return
    }

    // 5. Enviar email (dynamic import para Edge Runtime compatibility)
    try {
      // Lazy load email modules solo cuando se necesitan
      const { sendEmail } = await import('@/lib/email/mailer')
      const { buildSecurityAlertEmail } = await import('@/lib/email/templates/security-alert')

      const emailData = buildSecurityAlertEmail({
        eventType: data.eventType,
        severity,
        description: data.description,
        ipAddress: data.ipAddress,
        email: data.email,
        timestamp: new Date().toISOString(),
        metadata: data.metadata as Record<string, unknown> | undefined,
      })

      const sent = await sendEmail({
        to: alertEmail,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
      })

      if (sent) {
        console.log('✅ Email de alerta enviado a:', alertEmail)
      } else {
        console.error('❌ Error enviando alerta (sendEmail retornó false)')
      }
    } catch (error) {
      console.error('❌ Error enviando alerta:', error)
      // No lanzar error para no afectar el flujo principal
    }
  }

  /**
   * Obtener eventos recientes de seguridad
   */
  static async getRecentEvents(limit = 50, severity?: SecuritySeverity) {
    return prisma.securityLog.findMany({
      where: severity ? { severity } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  /**
   * Obtener estadísticas de seguridad
   */
  static async getSecurityStats(daysBack = 7) {
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)

    const [totalEvents, failedLogins, suspiciousActivities, rateLimitExceeded] = await Promise.all([
      prisma.securityLog.count({
        where: { createdAt: { gte: since } },
      }),
      prisma.securityLog.count({
        where: {
          eventType: SecurityEventType.LOGIN_FAILED,
          createdAt: { gte: since },
        },
      }),
      prisma.securityLog.count({
        where: {
          severity: SecuritySeverity.ALERT,
          createdAt: { gte: since },
        },
      }),
      prisma.securityLog.count({
        where: {
          eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
          createdAt: { gte: since },
        },
      }),
    ])

    return {
      totalEvents,
      failedLogins,
      suspiciousActivities,
      rateLimitExceeded,
      daysAnalyzed: daysBack,
    }
  }
}
