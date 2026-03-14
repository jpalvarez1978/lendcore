import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface AccessDeniedStateProps {
  title?: string
  description?: string
  backHref?: string
  backLabel?: string
}

export function AccessDeniedState({
  title = 'Sin permisos para esta vista',
  description = 'Tu rol actual no tiene acceso a esta acción o pantalla. Si lo necesitas, solicita acceso al administrador.',
  backHref = '/dashboard',
  backLabel = 'Volver al dashboard',
}: AccessDeniedStateProps) {
  return (
    <Card className="rounded-[1.8rem] border-white/80 bg-white/90 shadow-[0_22px_44px_-34px_rgba(20,38,63,0.42)]">
      <CardContent className="flex flex-col items-center gap-5 px-6 py-14 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-[#14263f]">{title}</h2>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <Link href={backHref}>
          <Button variant="outline" className="rounded-2xl">
            {backLabel}
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
