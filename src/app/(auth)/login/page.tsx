'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, ChartNoAxesCombined, ShieldCheck, Wallet, Clock, Loader2 } from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BRAND } from '@/lib/constants/brand'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false)

  useEffect(() => {
    // Verificar si la sesión expiró por timeout
    const timeout = searchParams.get('timeout')
    if (timeout === 'true') {
      setShowTimeoutMessage(true)
      // Limpiar el mensaje después de 10 segundos
      const timer = setTimeout(() => setShowTimeoutMessage(false), 10000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Credenciales inválidas')
        setLoading(false)
      } else {
        // Mantener el estado de loading mientras redirige
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('Error al iniciar sesión')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="brand-grid absolute inset-0 opacity-60" />
      <div className="absolute inset-x-0 top-[-16rem] h-[26rem] bg-[radial-gradient(circle,rgba(200,155,85,0.28),transparent_62%)]" />
      <div className="absolute inset-y-0 right-[-10rem] w-[28rem] bg-[radial-gradient(circle,rgba(20,38,63,0.14),transparent_58%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="hidden flex-col justify-between rounded-[2rem] border border-white/60 bg-[linear-gradient(145deg,rgba(20,38,63,0.96),rgba(13,23,39,0.94))] p-8 text-white shadow-[0_35px_80px_-42px_rgba(13,23,39,0.75)] lg:flex">
            <div className="space-y-8">
              <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.34em] text-[#f1e0b8]">
                {BRAND.loginEyebrow}
              </div>

              <BrandMark theme="inverse" className="max-w-max" />

              <div className="space-y-4">
                <h2 className="max-w-xl text-6xl leading-none text-balance">
                  Operación, cartera y seguimiento con una presencia más premium.
                </h2>
                <p className="max-w-xl text-base leading-7 text-slate-300">
                  Una cabina interna para registrar clientes, aprobar préstamos, controlar pagos,
                  vigilar vencimientos y mover la cobranza con criterio operativo.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#f1e0b8]">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold">Pagos y recibos</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Registro ágil, comprobantes claros y trazabilidad por préstamo.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#f1e0b8]">
                    <ChartNoAxesCombined className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold">Vista ejecutiva</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Dashboard, vencimientos y reportes con mejor lectura y foco.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#f1e0b8]">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold">Control interno</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Acceso protegido, auditoría y una base lista para escalar.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-sm leading-6 text-slate-300">
              El acceso de esta versión está reservado al equipo interno. La siguiente fase la
              dejaremos lista para apertura controlada hacia clientes y terceros.
            </div>
          </section>

          <Card className="brand-shell relative mx-auto w-full max-w-xl rounded-[2rem] border-0">
            <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(200,155,85,0.55),transparent)]" />
            <CardHeader className="space-y-6 px-7 pb-0 pt-7 sm:px-8 sm:pt-8">
              <div className="flex items-start justify-between gap-4">
                <BrandMark variant="compact" className="min-w-0" />
                <div className="rounded-full border border-[#d9c6a0] bg-[#f7efe0] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8d6730]">
                  Acceso privado
                </div>
              </div>
              <div className="space-y-2">
                <CardTitle className="text-4xl leading-none text-[#14263f]">
                  Bienvenido de nuevo
                </CardTitle>
                <CardDescription className="max-w-md text-sm leading-6 text-muted-foreground">
                  Ingresa con tu cuenta para acceder al centro operativo de {BRAND.name}.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="px-7 pb-7 pt-6 sm:px-8 sm:pb-8">
              {showTimeoutMessage && (
                <div className="mb-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex gap-3">
                    <Clock className="h-5 w-5 flex-shrink-0 text-yellow-600" />
                    <div>
                      <p className="font-semibold text-yellow-900">
                        Sesión expirada por inactividad
                      </p>
                      <p className="mt-1 text-sm text-yellow-700">
                        Por seguridad, tu sesión se cerró después de 30 minutos de inactividad.
                        Por favor, inicia sesión nuevamente.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-semibold text-foreground">
                    Correo electrónico
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="equipo@empresa.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 rounded-2xl border-[#d6dee7] bg-white/75 px-4 focus-visible:bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-semibold text-foreground">
                    Contraseña
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 rounded-2xl border-[#d6dee7] bg-white/75 px-4 focus-visible:bg-white"
                  />
                </div>
                {error && (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                    {error}
                  </div>
                )}
                <Button
                  type="submit"
                  className="h-12 w-full rounded-2xl bg-[linear-gradient(135deg,#14263f_0%,#1f3a5c_72%,#a97b36_100%)] text-base font-semibold text-white shadow-[0_20px_38px_-18px_rgba(20,38,63,0.75)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_22px_42px_-18px_rgba(20,38,63,0.78)]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ingresando al sistema...
                    </>
                  ) : (
                    <>
                      Entrar al panel
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="brand-divider mt-6" />

              <div className="mt-5 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>Acceso habilitado solo para el equipo interno.</p>
                <p className="font-medium text-[#8d6730]">© 2026 {BRAND.shortName}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <LoginForm />
    </Suspense>
  )
}
