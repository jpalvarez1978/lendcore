import { NextRequest, NextResponse } from 'next/server'

/**
 * Middleware de seguridad global
 * Aplica headers de seguridad a todas las respuestas
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Security Headers - Protección contra ataques comunes

  // Previene MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Previene clickjacking - no permitir iframe
  response.headers.set('X-Frame-Options', 'DENY')

  // Protección XSS en navegadores antiguos
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Control de información del referrer
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Deshabilita APIs peligrosas (geolocation, camera, microphone)
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  )

  // Content Security Policy - Solo para páginas HTML
  if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname === '/login') {
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
      ].join('; ')
    )
  }

  return response
}

// Aplicar a todas las rutas excepto API routes
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
