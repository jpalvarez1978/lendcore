'use client'

import { useEffect } from 'react'

/**
 * Hook para detectar cambios sin guardar y advertir al usuario (F2)
 *
 * Muestra un diálogo del navegador cuando el usuario intenta salir
 * con cambios sin guardar.
 */
export function useUnsavedChanges(hasChanges: boolean) {
  useEffect(() => {
    if (!hasChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Necesario para algunos navegadores
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges])
}
