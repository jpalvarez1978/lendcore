'use client'

import type { ReactNode } from 'react'
import { Box, Lock, Search, Settings, Sparkles } from 'lucide-react'
import { GlowingEffect } from '@/components/ui/glowing-effect'
import { cn } from '@/lib/utils'

export function GlowingEffectDemo() {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-12 md:grid-rows-3 xl:max-h-[34rem] xl:grid-rows-2">
      <GridItem
        area="md:[grid-area:1/1/2/7] xl:[grid-area:1/1/2/5]"
        icon={<Box className="h-4 w-4" />}
        title="Visibilidad operativa"
        description="Seguimiento diario de clientes, cartera, pagos y cobranza con una lectura mucho mas clara."
      />
      <GridItem
        area="md:[grid-area:1/7/2/13] xl:[grid-area:2/1/3/5]"
        icon={<Settings className="h-4 w-4" />}
        title="Configuracion preparada"
        description="Bloques visuales listos para extender marca, componentes y experiencia sin romper consistencia."
      />
      <GridItem
        area="md:[grid-area:2/1/3/7] xl:[grid-area:1/5/3/8]"
        icon={<Lock className="h-4 w-4" />}
        title="Seguridad primero"
        description="Permisos, sesiones y trazabilidad pensados para uso interno hoy y escalado despues."
      />
      <GridItem
        area="md:[grid-area:2/7/3/13] xl:[grid-area:1/8/2/13]"
        icon={<Sparkles className="h-4 w-4" />}
        title="Marca mas premium"
        description="Bordes vivos y profundidad elegante para que la interfaz se sienta mas cuidada."
      />
      <GridItem
        area="md:[grid-area:3/1/4/13] xl:[grid-area:2/8/3/13]"
        icon={<Search className="h-4 w-4" />}
        title="Componentes reutilizables"
        description="El efecto se puede llevar despues a tarjetas, paneles y bloques estrategicos sin duplicar logica."
      />
    </ul>
  )
}

interface GridItemProps {
  area: string
  icon: ReactNode
  title: string
  description: ReactNode
}

function GridItem({ area, icon, title, description }: GridItemProps) {
  return (
    <li className={cn('min-h-[14rem] list-none', area)}>
      <div className="relative h-full rounded-[1.5rem] border-[0.75px] border-border/70 p-2 md:p-3">
        <GlowingEffect
          spread={40}
          glow
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={3}
        />
        <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-[1.2rem] border-[0.75px] border-white/70 bg-background/95 p-6 shadow-sm md:p-6">
          <div className="relative flex flex-1 flex-col justify-between gap-3">
            <div className="w-fit rounded-lg border-[0.75px] border-border bg-muted p-2">
              {icon}
            </div>
            <div className="space-y-3">
              <h3 className="text-balance pt-0.5 text-xl font-semibold leading-[1.375rem] tracking-[-0.04em] text-foreground md:text-2xl md:leading-[1.875rem]">
                {title}
              </h3>
              <h2 className="text-sm leading-[1.125rem] text-muted-foreground md:text-base md:leading-[1.375rem]">
                {description}
              </h2>
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}
