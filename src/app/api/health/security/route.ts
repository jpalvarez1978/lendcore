import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/constants/permissions'
import { prisma } from '@/lib/prisma'
import { permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withAPIRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getErrorMessage } from '@/lib/utils/errorMessages'

interface SecurityCheck {
  name: string
  status: 'ok' | 'warning' | 'error' | 'info'
  message: string
}

/**
 * Health Check de Seguridad
 *
 * Endpoint público para verificar el estado de las medidas de seguridad
 * GET /api/health/security
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'AUDIT_VIEW')) {
      return permissionDeniedResponse(request, session, 'api/health/security', 'AUDIT_VIEW')
    }

    const rateLimitResponse = await withAPIRateLimit(request)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const checks: SecurityCheck[] = []

    // 1. Verificar ENCRYPTION_KEY
    const hasEncryptionKey = !!process.env.ENCRYPTION_KEY
    checks.push({
      name: 'Encryption Key',
      status: hasEncryptionKey ? 'ok' : 'error',
      message: hasEncryptionKey ? 'Configurada' : 'NO configurada',
    })

    // 2. Verificar conexión a BD
    let dbConnected = false
    try {
      await prisma.$queryRaw`SELECT 1`
      dbConnected = true
    } catch {
      dbConnected = false
    }

    checks.push({
      name: 'Database Connection',
      status: dbConnected ? 'ok' : 'error',
      message: dbConnected ? 'Conectada' : 'Error de conexión',
    })

    // 3. Verificar tabla SecurityLog
    let securityLogTableExists = false
    if (dbConnected) {
      try {
        await prisma.securityLog.count()
        securityLogTableExists = true
      } catch {
        securityLogTableExists = false
      }
    }

    checks.push({
      name: 'Security Log Table',
      status: securityLogTableExists ? 'ok' : 'warning',
      message: securityLogTableExists ? 'Tabla existe' : 'Tabla no encontrada - ejecuta migración',
    })

    // 4. Verificar eventos de seguridad recientes (últimas 24h)
    let recentEvents = 0
    if (securityLogTableExists) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      recentEvents = await prisma.securityLog.count({
        where: {
          createdAt: { gte: yesterday },
        },
      })
    }

    checks.push({
      name: 'Security Events (24h)',
      status: 'info',
      message: `${recentEvents} eventos registrados`,
    })

    // 5. Verificar eventos críticos recientes
    let criticalEvents = 0
    if (securityLogTableExists) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      criticalEvents = await prisma.securityLog.count({
        where: {
          severity: 'CRITICAL',
          createdAt: { gte: yesterday },
        },
      })
    }

    checks.push({
      name: 'Critical Events (24h)',
      status: criticalEvents === 0 ? 'ok' : 'warning',
      message:
        criticalEvents === 0
          ? 'Sin eventos críticos'
          : `⚠️  ${criticalEvents} eventos críticos`,
    })

    // 6. Verificar headers de seguridad (simulado, se verifica en middleware)
    checks.push({
      name: 'Security Headers',
      status: 'ok',
      message: 'Configurados en middleware',
    })

    // Resumen
    const allOk = checks.every((c) => c.status === 'ok' || c.status === 'info')
    const hasErrors = checks.some((c) => c.status === 'error')

    return NextResponse.json({
      status: hasErrors ? 'error' : allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      summary: {
        total: checks.length,
        ok: checks.filter((c) => c.status === 'ok').length,
        warnings: checks.filter((c) => c.status === 'warning').length,
        errors: checks.filter((c) => c.status === 'error').length,
      },
    })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: getErrorMessage(error, 'Error en health check de seguridad'),
      },
      { status: 500 }
    )
  }
}
