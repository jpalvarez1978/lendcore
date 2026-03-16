'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, DollarSign, FileText, Search, TrendingUp, User, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { QUICK_ACTIONS } from '@/lib/constants/config'
import { canAccessPermission } from '@/lib/constants/permissions'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  type: 'client' | 'loan' | 'payment' | 'application' | 'promise'
  title: string
  subtitle: string
  url: string
  metadata?: string
}

const quickActionIcons = {
  User,
  DollarSign,
  TrendingUp,
  Calendar,
} as const

export function GlobalSearch() {
  const router = useRouter()
  const { role } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }

      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleShortcut)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleShortcut)
    }
  }, [])

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([])
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      setResults(data.results || [])
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      performSearch(query)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [performSearch, query])

  const groupedResults = useMemo(() => {
    return results.reduce<Record<string, SearchResult[]>>((acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = []
      }
      acc[result.type].push(result)
      return acc
    }, {})
  }, [results])

  const availableQuickActions = useMemo(() => {
    return QUICK_ACTIONS.filter(action => canAccessPermission(role, action.permission))
  }, [role])

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'client':
        return User
      case 'loan':
        return DollarSign
      case 'payment':
        return TrendingUp
      case 'application':
        return FileText
      case 'promise':
        return Calendar
      default:
        return Search
    }
  }

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'client':
        return 'Clientes'
      case 'loan':
        return 'Préstamos'
      case 'payment':
        return 'Pagos'
      case 'application':
        return 'Solicitudes'
      case 'promise':
        return 'Promesas'
      default:
        return 'Resultados'
    }
  }

  const handleSelect = (url: string) => {
    setOpen(false)
    setQuery('')
    router.push(url)
  }

  const handleSubmit = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && results[0]) {
      event.preventDefault()
      handleSelect(results[0].url)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        type="search"
        value={query}
        onChange={event => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleSubmit}
        placeholder="Buscar cliente, préstamo, DNI/CIF o número de operación..."
        className="h-12 rounded-2xl border-white/80 bg-white/80 pl-11 pr-12 shadow-[0_18px_40px_-32px_rgba(20,38,63,0.4)] transition-colors focus-visible:bg-white"
        role="combobox"
        aria-label="Búsqueda global de clientes, préstamos, pagos y solicitudes"
        aria-expanded={open}
        aria-controls="search-results"
        aria-autocomplete="list"
        aria-haspopup="listbox"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery('')
            setResults([])
            inputRef.current?.focus()
          }}
          className="absolute right-3 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-[#edf1f6] hover:text-[#14263f]"
          aria-label="Limpiar búsqueda"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {open && (
        <div
          id="search-results"
          role="listbox"
          className="absolute left-0 top-[calc(100%+0.65rem)] z-50 w-full rounded-[1.65rem] border border-white/80 bg-[rgba(255,255,255,0.96)] p-2 shadow-[0_24px_60px_-26px_rgba(20,38,63,0.35)] backdrop-blur-xl"
        >
          {query.trim().length < 2 ? (
            <div className="space-y-2 p-2">
              <p className="px-2 pt-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#8d6730]">
                Accesos rápidos
              </p>
              {availableQuickActions.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {availableQuickActions.map(action => {
                    const Icon = quickActionIcons[action.icon]

                    return (
                      <button
                        key={action.href}
                        type="button"
                        onClick={() => handleSelect(action.href)}
                        role="option"
                        aria-label={`${action.label} - Acceso rápido`}
                        className="flex items-center gap-3 rounded-2xl border border-[#e3eaf2] bg-white px-3 py-3 text-left transition-colors hover:bg-[#f8fbff]"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#14263f] text-[#f1e0b8]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#14263f]">{action.label}</p>
                          <p className="text-xs text-muted-foreground">Abrir módulo</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#e3eaf2] bg-white/70 px-4 py-5 text-sm text-muted-foreground">
                  Tu perfil actual no tiene accesos rápidos de creación. Usa la búsqueda para consultar información disponible.
                </div>
              )}
              <p className="px-2 pb-1 text-xs text-muted-foreground">
                Escribe al menos 2 caracteres para buscar por coincidencia parcial.
              </p>
            </div>
          ) : loading ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">Buscando resultados...</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              No se encontraron coincidencias para “{query}”.
            </div>
          ) : (
            <div className="max-h-[24rem] space-y-1 overflow-y-auto p-1">
              {Object.entries(groupedResults).map(([type, items]) => (
                <div key={type} className="space-y-1">
                  <p className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d6730]">
                    {getTypeLabel(type as SearchResult['type'])}
                  </p>
                  {items.map(result => {
                    const Icon = getIcon(result.type)

                    return (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => handleSelect(result.url)}
                        role="option"
                        aria-label={`${result.title} - ${result.subtitle}`}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-[1.2rem] px-3 py-3 text-left transition-colors',
                          'hover:bg-[#f7fafc]'
                        )}
                      >
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-[#e3eaf2] bg-white text-[#14263f]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-[#14263f]">
                              {result.title}
                            </p>
                            <span className="rounded-full bg-[#f8efe0] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d6730]">
                              {getTypeLabel(result.type).slice(0, -1)}
                            </span>
                          </div>
                          <p className="truncate text-sm text-muted-foreground">
                            {result.subtitle}
                          </p>
                          {result.metadata && (
                            <p className="truncate text-xs text-muted-foreground/90">
                              {result.metadata}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
