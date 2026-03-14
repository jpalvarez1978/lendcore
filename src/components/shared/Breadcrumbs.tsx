'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

/**
 * Mapeo de rutas a nombres legibles en español
 */
const routeNames: Record<string, string> = {
  dashboard: 'Dashboard',
  clientes: 'Clientes',
  nuevo: 'Nuevo',
  editar: 'Editar',
  prestamos: 'Préstamos',
  pagos: 'Pagos',
  cobranza: 'Cobranza',
  reportes: 'Reportes',
  auditoria: 'Auditoría',
  configuracion: 'Configuración',
  seguridad: 'Seguridad',
  usuarios: 'Usuarios',
  aplicaciones: 'Solicitudes',
  cartera: 'Cartera',
  aging: 'Antigüedad',
  perfil: 'Perfil',
}

export function Breadcrumbs() {
  const pathname = usePathname()

  // No mostrar breadcrumbs en la raíz del dashboard
  if (pathname === '/dashboard' || pathname === '/') {
    return null
  }

  // Dividir pathname en segmentos y filtrar vacíos
  const segments = pathname.split('/').filter(Boolean)

  // Construir breadcrumbs
  const breadcrumbs = segments.map((segment, index) => {
    const path = '/' + segments.slice(0, index + 1).join('/')

    // Obtener nombre legible
    let name = routeNames[segment] || segment

    // Si es un UUID (ID), acortar
    if (
      segment.length === 36 &&
      segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    ) {
      name = 'Detalle'
    }

    // Capitalizar primera letra si no está en el mapeo
    if (!routeNames[segment] && name === segment) {
      name = name.charAt(0).toUpperCase() + name.slice(1)
    }

    return {
      name,
      path,
      isLast: index === segments.length - 1,
    }
  })

  return (
    <nav
      className="flex items-center gap-2 text-sm text-muted-foreground mb-6 pb-4 border-b border-border/50"
      aria-label="Breadcrumb"
    >
      {/* Home link */}
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 hover:text-primary transition-colors font-medium"
        aria-label="Volver al dashboard"
      >
        <Home className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>

      {/* Breadcrumbs */}
      {breadcrumbs.map((crumb) => (
        <div key={crumb.path} className="flex items-center gap-2">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" />
          {crumb.isLast ? (
            <span
              className="font-semibold text-primary"
              aria-current="page"
            >
              {crumb.name}
            </span>
          ) : (
            <Link
              href={crumb.path}
              className="hover:text-primary transition-colors font-medium"
            >
              {crumb.name}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
