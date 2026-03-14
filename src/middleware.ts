import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * Agregar headers de seguridad a la respuesta
 * CSP adaptativo: Estricto en producción, permisivo en desarrollo
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // 1. Content Security Policy (CSP)
  const isDevelopment = process.env.NODE_ENV === 'development'

  // En desarrollo: más permisivo para evitar bloquear Next.js HMR
  // En producción: CSP hardened
  const scriptSrc = isDevelopment
    ? "'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live"
    : "'self' https://vercel.live"

  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https:;
    font-src 'self' data:;
    connect-src 'self' https://vercel.live wss://ws-*.pusher.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
    ${!isDevelopment ? 'upgrade-insecure-requests; block-all-mixed-content;' : ''}
  `
    .replace(/\s{2,}/g, ' ')
    .trim()

  response.headers.set('Content-Security-Policy', cspHeader)

  // 2. HSTS - Fuerza HTTPS (2 años)
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')

  // 3. X-Frame-Options - Previene clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // 4. X-Content-Type-Options - Previene MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // 5. Referrer-Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // 6. Permissions-Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=()'
  )

  // 7. X-XSS-Protection (legacy)
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // 8. Cross-Origin-Opener-Policy
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')

  // 9. Cross-Origin-Resource-Policy
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

  return response
}

/**
 * Detectar patrones de ataque en la URL
 */
function detectAttackPatterns(url: string, userAgent: string): boolean {
  const urlLower = url.toLowerCase()
  const uaLower = userAgent.toLowerCase()

  // SQL Injection patterns
  const sqlPatterns = [
    'union select',
    'drop table',
    'insert into',
    'delete from',
    '<script',
    'javascript:',
    'onerror=',
    '../../../',
    '..\\..\\',
  ]

  for (const pattern of sqlPatterns) {
    if (urlLower.includes(pattern)) {
      console.warn(`🚨 Attack attempt blocked: ${pattern} in ${url}`)
      return true
    }
  }

  // Bots maliciosos
  const badBots = ['sqlmap', 'nikto', 'nmap', 'masscan', 'nessus', 'metasploit', 'burpsuite']

  for (const bot of badBots) {
    if (uaLower.includes(bot)) {
      console.warn(`🚨 Malicious bot blocked: ${userAgent}`)
      return true
    }
  }

  return false
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth
  const isApiRoute = pathname.startsWith('/api')
  const userAgent = req.headers.get('user-agent') || ''

  // Detectar ataques
  if (detectAttackPatterns(req.url, userAgent)) {
    const response = isApiRoute
      ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      : new NextResponse('Forbidden', { status: 403 })
    return addSecurityHeaders(response)
  }

  // Rutas públicas
  const isPublicRoute = pathname.startsWith('/login') || pathname.startsWith('/api/auth')

  // Si está en ruta pública y está autenticado, redirigir al dashboard
  if (!isApiRoute && isPublicRoute && isLoggedIn) {
    const response = NextResponse.redirect(new URL('/dashboard', req.url))
    return addSecurityHeaders(response)
  }

  // Si está en ruta protegida y NO está autenticado, redirigir a login
  if (!isPublicRoute && !isLoggedIn) {
    const response = isApiRoute
      ? NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', req.url))
    return addSecurityHeaders(response)
  }

  // Continuar con headers de seguridad
  const response = NextResponse.next()
  return addSecurityHeaders(response)
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
