'use client'

import { useEffect, useRef, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutos en milisegundos
const WARNING_TIME = 2 * 60 * 1000 // Mostrar advertencia 2 minutos antes

export function InactivityDetector() {
  const { data: session, status } = useSession()
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(120) // 2 minutos en segundos
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null)
  const warningTimer = useRef<NodeJS.Timeout | null>(null)
  const countdownInterval = useRef<NodeJS.Timeout | null>(null)

  const resetTimers = () => {
    // Limpiar timers existentes
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    if (warningTimer.current) clearTimeout(warningTimer.current)
    if (countdownInterval.current) clearInterval(countdownInterval.current)

    setShowWarning(false)
    setCountdown(120)

    // No iniciar timers si no hay sesión
    if (status !== 'authenticated') return

    // Timer para mostrar advertencia
    warningTimer.current = setTimeout(() => {
      setShowWarning(true)

      // Iniciar cuenta regresiva
      setCountdown(120)
      countdownInterval.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleLogout()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, INACTIVITY_TIMEOUT - WARNING_TIME)

    // Timer para cerrar sesión automáticamente
    inactivityTimer.current = setTimeout(() => {
      handleLogout()
    }, INACTIVITY_TIMEOUT)
  }

  const handleLogout = async () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    if (warningTimer.current) clearTimeout(warningTimer.current)
    if (countdownInterval.current) clearInterval(countdownInterval.current)

    await signOut({ callbackUrl: '/login?timeout=true' })
  }

  const handleStayActive = () => {
    resetTimers()
  }

  useEffect(() => {
    if (status !== 'authenticated') return

    // Eventos que indican actividad del usuario
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ]

    // Resetear timer en cada evento de actividad
    events.forEach((event) => {
      document.addEventListener(event, resetTimers, { passive: true })
    })

    // Iniciar timers al montar
    resetTimers()

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimers)
      })
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      if (warningTimer.current) clearTimeout(warningTimer.current)
      if (countdownInterval.current) clearInterval(countdownInterval.current)
    }
  }, [status])

  // No renderizar nada si no hay sesión
  if (status !== 'authenticated') return null

  const minutes = Math.floor(countdown / 60)
  const seconds = countdown % 60

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            <span className="text-2xl">⏱️</span>
            Sesión por expirar
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p className="text-base">
              Tu sesión está a punto de cerrarse por inactividad.
            </p>
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
              <p className="text-center text-2xl font-bold text-yellow-800 tabular-nums">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </p>
              <p className="text-center text-sm text-yellow-700 mt-1">
                minutos restantes
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Por seguridad, cerramos sesiones después de 30 minutos de inactividad.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={handleLogout} className="sm:mr-auto">
            Cerrar sesión
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleStayActive} className="bg-primary">
            Continuar trabajando
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
