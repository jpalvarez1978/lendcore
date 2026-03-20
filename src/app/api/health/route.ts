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

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTime: Date.now() - start,
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
