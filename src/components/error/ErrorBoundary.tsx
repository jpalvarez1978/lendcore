'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo })

    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error)
    console.error('Error info:', errorInfo)

    // Call optional error handler
    this.props.onError?.(error, errorInfo)

    // In production, you might want to send this to an error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to Sentry, LogRocket, etc.
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = (): void => {
    window.location.href = '/dashboard'
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Algo salió mal</CardTitle>
              <CardDescription>
                Ha ocurrido un error inesperado. Puedes intentar recargar la página o volver al inicio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={this.handleReset}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={this.handleGoHome}
                >
                  <Home className="mr-2 h-4 w-4" />
                  Ir al inicio
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook to throw errors inside functional components for testing
 */
export function useErrorBoundary(): { showBoundary: (error: Error) => void } {
  const [, setError] = React.useState<Error | null>(null)

  const showBoundary = React.useCallback((error: Error) => {
    setError(() => {
      throw error
    })
  }, [])

  return { showBoundary }
}

/**
 * Simple error fallback component
 */
export function ErrorFallback({
  error,
  reset
}: {
  error?: Error
  reset?: () => void
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center p-4 text-center">
      <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
      <p className="text-sm text-muted-foreground mb-4">
        Error al cargar este componente
      </p>
      {process.env.NODE_ENV === 'development' && error && (
        <p className="text-xs font-mono text-muted-foreground mb-4 max-w-xs truncate">
          {error.message}
        </p>
      )}
      {reset && (
        <Button variant="outline" size="sm" onClick={reset}>
          <RefreshCw className="mr-2 h-3 w-3" />
          Reintentar
        </Button>
      )}
    </div>
  )
}
