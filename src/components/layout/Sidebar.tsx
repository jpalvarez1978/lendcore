'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Bell,
  Briefcase,
  ChevronDown,
  CreditCard,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
  WalletCards,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { BrandMark } from '@/components/brand/BrandMark'
import { useAuth } from '@/hooks/useAuth'
import { BRAND } from '@/lib/constants/brand'
import { NAVIGATION_ITEMS } from '@/lib/constants/config'
import { type AppPermission, canAccessPermission } from '@/lib/constants/permissions'
import { cn } from '@/lib/utils'

const iconMap = {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  CreditCard,
  WalletCards,
  Bell,
  BarChart3,
  Settings,
} as const

type SidebarChild = {
  title: string
  href: string
  icon: keyof typeof iconMap
  permission?: AppPermission
}

type SidebarItem = {
  title: string
  icon: keyof typeof iconMap
  href?: string
  permission?: AppPermission
  badge?: number
  children?: SidebarChild[]
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, role } = useAuth()
  const [expandedItems, setExpandedItems] = useState<string[]>(['Operaciones'])

  const toggleExpanded = (name: string) => {
    setExpandedItems(prev =>
      prev.includes(name) ? prev.filter(item => item !== name) : [...prev, name]
    )
  }

  const navigation = useMemo<SidebarItem[]>(() => {
    return NAVIGATION_ITEMS.reduce<SidebarItem[]>((acc, item) => {
      if ('children' in item && item.children) {
        const children = item.children.filter(child => canAccessPermission(role, child.permission))
        if (children.length === 0) {
          return acc
        }

        acc.push({
          title: item.title,
          icon: item.icon,
          children: children.map(child => ({
            title: child.title,
            href: child.href,
            icon: child.icon,
            permission: child.permission,
          })),
        })
        return acc
      }

      const permission = 'permission' in item ? item.permission : undefined
      if (!canAccessPermission(role, permission)) {
        return acc
      }

      acc.push({
        title: item.title,
        href: 'href' in item ? item.href : undefined,
        icon: item.icon,
        permission,
      })
      return acc
    }, [])
  }, [role])

  return (
    <aside
      className="flex h-screen w-72 flex-col border-r border-[#1e3556] bg-[linear-gradient(180deg,#152844_0%,#102038_52%,#0d1727_100%)] text-slate-100 shadow-[0_24px_60px_-36px_rgba(13,23,39,0.9)]"
      aria-label="Navegación principal"
    >
      <div className="border-b border-white/10 px-6 py-6">
        <BrandMark theme="inverse" variant="compact" />
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Operación privada para seguimiento de cartera, clientes y cobranza.
        </p>
      </div>

      <div className="border-b border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 font-semibold text-[#f1e0b8] shadow-[0_14px_28px_-18px_rgba(0,0,0,0.85)]">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="truncate text-xs capitalize text-slate-300">{role?.toLowerCase()}</p>
          </div>
          <div className="rounded-full border border-[#f1e0b8]/20 bg-[#f1e0b8]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#f1e0b8]">
            Interno
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Menú de navegación">
        {navigation.map(item => {
          const label = item.title
          const href = 'href' in item ? item.href : undefined
          const Icon = iconMap[item.icon]
          const isActive = pathname === href
          const hasChildren = 'children' in item && item.children && item.children.length > 0
          const isExpanded = expandedItems.includes(label)

          if (hasChildren) {
            return (
              <div key={label}>
                <button
                  onClick={() => toggleExpanded(label)}
                  aria-expanded={isExpanded}
                  aria-controls={`submenu-${label}`}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200',
                    'text-slate-300 hover:bg-white/8 hover:text-white'
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span className="flex-1 text-left">{label}</span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      isExpanded && 'rotate-180'
                    )}
                    aria-hidden="true"
                  />
                </button>
                {isExpanded && (
                  <div id={`submenu-${label}`} className="ml-4 mt-1 space-y-1" role="group">
                    {item.children.map(child => {
                      const ChildIcon = iconMap[child.icon]
                      const isChildActive = pathname === child.href

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          aria-current={isChildActive ? 'page' : undefined}
                          className={cn(
                            'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all duration-200',
                            isChildActive
                              ? 'border border-[#f1e0b8]/20 bg-[linear-gradient(135deg,rgba(200,155,85,0.26),rgba(200,155,85,0.12))] text-white shadow-[0_20px_30px_-22px_rgba(169,123,54,0.9)]'
                              : 'text-slate-300 hover:bg-white/8 hover:text-white'
                          )}
                        >
                          <ChildIcon className="h-4 w-4" aria-hidden="true" />
                          {child.title}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={label}
              href={href!}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'border border-[#f1e0b8]/20 bg-[linear-gradient(135deg,rgba(200,155,85,0.26),rgba(200,155,85,0.12))] text-white shadow-[0_20px_30px_-22px_rgba(169,123,54,0.9)]'
                  : 'text-slate-300 hover:bg-white/8 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
              {'badge' in item && item.badge && (
                <>
                  <span
                    className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-white"
                    aria-hidden="true"
                  >
                    {item.badge}
                  </span>
                  <span className="sr-only">{item.badge} pendientes</span>
                </>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <p className="text-xs uppercase tracking-[0.28em] text-[#f1e0b8]">
          {BRAND.internalEnvironmentLabel}
        </p>
        <p className="mt-2 text-xs text-slate-400">© 2026 {BRAND.name}</p>
      </div>
    </aside>
  )
}
