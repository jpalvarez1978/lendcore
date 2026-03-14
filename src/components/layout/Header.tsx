'use client'

import { useEffect, useState } from 'react'
import {
  Bell,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Info,
  CalendarDays,
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { GlobalSearch } from '@/components/shared/GlobalSearch'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BRAND } from '@/lib/constants/brand'
import { cn } from '@/lib/utils'

type HeaderNotification = {
  id: string
  type: 'warning' | 'error' | 'success' | 'info'
  title: string
  message: string
  time: string
  actionUrl?: string
  unread: boolean
}

export function Header() {
  const router = useRouter()
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<HeaderNotification[]>([])
  const [loadingNotifications, setLoadingNotifications] = useState(true)
  const unreadCount = notifications.filter(notification => notification.unread).length
  const todayLabel = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      window.location.href = '/login'
    }
  }

  useEffect(() => {
    let isMounted = true

    const loadNotifications = async () => {
      try {
        const response = await fetch('/api/dashboard/alerts', {
          cache: 'no-store',
        })

        if (!response.ok) {
          if (isMounted) {
            setNotifications([])
            setLoadingNotifications(false)
          }
          return
        }

        const payload = (await response.json()) as {
          alerts?: Array<Omit<HeaderNotification, 'unread'>>
        }

        if (!isMounted) return

        setNotifications(previousNotifications => {
          const previousState = new Map(
            previousNotifications.map(notification => [notification.id, notification.unread])
          )

          return (payload.alerts || []).map(alert => ({
            ...alert,
            unread: previousState.get(alert.id) ?? true,
          }))
        })
      } catch (error) {
        console.error('Error al cargar alertas del dashboard:', error)
        if (isMounted) {
          setNotifications([])
        }
      } finally {
        if (isMounted) {
          setLoadingNotifications(false)
        }
      }
    }

    void loadNotifications()
    const intervalId = window.setInterval(() => {
      void loadNotifications()
    }, 60000)

    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [])

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, unread: false } : notification
      )
    )
  }

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, unread: false })))
  }

  const handleNotificationClick = (notification: HeaderNotification) => {
    handleMarkAsRead(notification.id)

    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  const getNotificationIcon = (type: 'warning' | 'error' | 'success' | 'info') => {
    switch (type) {
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <header
      className="sticky top-0 z-40 border-b border-white/70 bg-[rgba(251,248,242,0.72)] shadow-[0_18px_42px_-32px_rgba(20,38,63,0.35)] backdrop-blur-xl"
      role="banner"
    >
      <div className="flex min-h-[5.5rem] flex-wrap items-center gap-4 px-5 py-4 sm:px-6">
        <div className="min-w-[16rem] flex-1" role="search">
          <GlobalSearch />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-2xl border border-white/80 bg-white/70 px-4 py-2.5 shadow-[0_16px_36px_-28px_rgba(20,38,63,0.45)] lg:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8d6730]">
              {BRAND.internalEnvironmentLabel}
            </p>
            <div className="mt-1 flex items-center gap-2 text-sm text-[#14263f]">
              <CalendarDays className="h-4 w-4 text-[#a97b36]" />
              <span className="capitalize">{todayLabel}</span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-11 w-11 rounded-2xl border border-white/80 bg-white/80 shadow-[0_18px_40px_-32px_rgba(20,38,63,0.4)] transition-colors hover:bg-white hover:text-primary"
                aria-label={`Notificaciones: ${unreadCount} sin leer`}
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white shadow-sm animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notificaciones</span>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 text-xs"
                    onClick={handleMarkAllAsRead}
                  >
                    Marcar todo como leído
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[400px] overflow-y-auto">
                {loadingNotifications ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Cargando alertas operativas...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Operación al día. No hay alertas activas.
                  </div>
                ) : (
                  notifications.map(notification => (
                    <DropdownMenuItem
                      key={notification.id}
                      className={cn(
                        'flex cursor-pointer gap-3 p-3',
                        notification.unread && 'bg-primary/5'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{notification.title}</p>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">{notification.time}</p>
                      </div>
                      {notification.unread && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </DropdownMenuItem>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2 border-l border-[#d6dee7] pl-2">
            <div className="hidden items-center gap-2 rounded-2xl border border-white/80 bg-white/80 px-3 py-2 shadow-[0_18px_40px_-32px_rgba(20,38,63,0.4)] sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#14263f_0%,#1f3a5c_100%)] font-semibold text-[#f1e0b8]">
                {session?.user?.name?.[0] || session?.user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium leading-none text-[#14263f]">
                  {session?.user?.name || 'Usuario'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {session?.user?.role || 'Admin'}
                </span>
              </div>
            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              size="default"
              className="h-11 rounded-2xl border-[#d6dee7] bg-white/80 font-semibold text-[#14263f] shadow-[0_18px_40px_-32px_rgba(20,38,63,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
