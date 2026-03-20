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

  // HSTS - Forzar HTTPS en producción (max-age: 1 año, incluir subdominios)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  // Deshabilita APIs peligrosas (geolocation, camera, microphone)
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  )

  // Content Security Policy - Solo para páginas HTML
  // Nota: Next.js requiere 'unsafe-inline' para scripts de hidratación en desarrollo
  // En producción, idealmente se usaría nonce o hash, pero 'unsafe-inline' es necesario para estilos dinámicos
  if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname === '/login') {
    const isDev = process.env.NODE_ENV === 'development'

    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        // En producción evitamos 'unsafe-eval', en desarrollo Next.js lo requiere para HMR
        isDev
          ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
          : "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
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
