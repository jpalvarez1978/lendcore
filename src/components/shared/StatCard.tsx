import { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlowingEffect } from '@/components/ui/glowing-effect'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
}

const variantStyles = {
  default: {
    card: 'border-white/80 bg-white/86 shadow-[0_22px_44px_-34px_rgba(20,38,63,0.42)]',
    icon: 'bg-[#14263f] text-[#f1e0b8]',
    value: 'text-[#172235]',
    eyebrow: 'text-[#66758a]',
  },
  primary: {
    card: 'border-[#d9e2ec] bg-[linear-gradient(180deg,rgba(20,38,63,0.09),rgba(255,255,255,0.95))] shadow-[0_22px_44px_-34px_rgba(20,38,63,0.46)]',
    icon: 'bg-[linear-gradient(135deg,#14263f_0%,#1f3a5c_100%)] text-[#f7f2e8]',
    value: 'text-[#14263f]',
    eyebrow: 'text-[#617083]',
  },
  success: {
    card: 'border-[#d9eadf] bg-[linear-gradient(180deg,rgba(234,247,241,0.95),rgba(255,255,255,0.95))] shadow-[0_22px_44px_-34px_rgba(31,122,89,0.36)]',
    icon: 'bg-[#1f7a59] text-white',
    value: 'text-[#1f7a59]',
    eyebrow: 'text-[#4c6b60]',
  },
  warning: {
    card: 'border-[#f0dfbc] bg-[linear-gradient(180deg,rgba(255,244,225,0.96),rgba(255,255,255,0.95))] shadow-[0_22px_44px_-34px_rgba(196,136,44,0.35)]',
    icon: 'bg-[linear-gradient(135deg,#c4882c_0%,#a97b36_100%)] text-white',
    value: 'text-[#9a6b27]',
    eyebrow: 'text-[#8d6730]',
  },
  danger: {
    card: 'border-[#f2dede] bg-[linear-gradient(180deg,rgba(255,240,240,0.96),rgba(255,255,255,0.95))] shadow-[0_22px_44px_-34px_rgba(201,78,78,0.34)]',
    icon: 'bg-[#c94e4e] text-white',
    value: 'text-[#b33f3f]',
    eyebrow: 'text-[#8e5757]',
  },
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = 'default',
}: StatCardProps) {
  const styles = variantStyles[variant]

  return (
    <div className="group relative rounded-[1.65rem]">
      <GlowingEffect
        blur={2}
        spread={28}
        proximity={72}
        inactiveZone={0.25}
        borderWidth={2}
        glow
        disabled={false}
        className="rounded-[1.65rem]"
      />
      <Card
        className={cn(
          'relative overflow-hidden rounded-[1.65rem] border transition-all duration-200 hover:-translate-y-0.5',
          styles.card
        )}
      >
        <div className="h-1 w-full bg-[linear-gradient(90deg,rgba(20,38,63,0),rgba(200,155,85,0.55),rgba(20,38,63,0))]" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-5">
          <CardTitle className={cn('text-xs font-semibold uppercase tracking-[0.24em]', styles.eyebrow)}>
            {title}
          </CardTitle>
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-2xl shadow-[0_16px_28px_-18px_rgba(20,38,63,0.7)]',
              styles.icon
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        </CardHeader>
        <CardContent>
          <div className={cn('text-[2rem] font-semibold tracking-[-0.04em]', styles.value)}>{value}</div>

          {description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>}

          {trend && (
            <div className="mt-3 flex items-center gap-1">
              <span
                className={cn('text-xs font-medium', trend.isPositive ? 'text-green-600' : 'text-red-600')}
              >
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
