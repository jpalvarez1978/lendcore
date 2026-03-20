import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Health Check Público
 *
 * Endpoint público para verificar disponibilidad del sistema.
 * NO requiere autenticación — usado por Vercel, uptime monitors, etc.
 *
 * GET /api/health
 */
export async function GET() {
  const start = Date.now()

  try {
    // Verificar conexión a base de datos
    await prisma.$queryRaw`SELECT 1`

    // Diagnóstico temporal: verificar qué DB se usa
    const dbUrl = process.env.DATABASE_URL || 'NOT SET'
    const dbHost = dbUrl.includes('@') ? dbUrl.split('@')[1]?.split('/')[0] : 'unknown'
    const userCount = await prisma.user.count()
    const lastSecLog = await prisma.securityLog.findFirst({ orderBy: { createdAt: 'desc' } })

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime: Date.now() - start,
        debug: {
          dbHost,
          userCount,
          lastSecurityLog: lastSecLog?.createdAt?.toISOString() || 'none',
          lastSecurityEvent: lastSecLog?.eventType || 'none',
          nextauthUrl: process.env.NEXTAUTH_URL || 'NOT SET',
        },
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - start,
      },
      { status: 503 }
    )
  }
}
