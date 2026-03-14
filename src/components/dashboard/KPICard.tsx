import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/formatters/currency'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: number | string
  type?: 'currency' | 'number' | 'percentage' | 'count'
  trend?: {
    value: number
    isPositive?: boolean
  }
  icon: LucideIcon
  description?: string
}

export function KPICard({ title, value, type = 'currency', trend, icon: Icon, description }: KPICardProps) {
  const formattedValue = () => {
    if (typeof value === 'string') return value

    switch (type) {
      case 'currency':
        return formatCurrency(value)
      case 'percentage':
        return formatPercentage(value)
      case 'number':
        return formatNumber(value)
      case 'count':
        return value.toString()
      default:
        return value.toString()
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formattedValue()}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend && (
          <div className="flex items-center text-xs mt-2">
            {trend.isPositive ? (
              <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
            )}
            <span
              className={cn(
                'font-medium',
                trend.isPositive ? 'text-green-500' : 'text-red-500'
              )}
            >
              {trend.value > 0 ? '+' : ''}
              {formatPercentage(trend.value / 100)}
            </span>
            <span className="ml-1 text-muted-foreground">vs mes anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
