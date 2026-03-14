import { formatDate } from '@/lib/formatters/date'
import { formatCurrency } from '@/lib/formatters/currency'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle,
  type LucideIcon,
} from 'lucide-react'

type ActivityType =
  | 'LOAN_CREATED'
  | 'PAYMENT_RECEIVED'
  | 'CREDIT_LIMIT_CHANGED'
  | 'APPLICATION_SUBMITTED'
  | 'APPLICATION_APPROVED'
  | 'STATUS_CHANGED'
  | 'NOTE_ADDED'

interface Activity {
  id: string
  type: ActivityType
  description: string
  timestamp: Date | string
  userId?: string
  userName?: string
  metadata?: {
    amount?: number
    previousValue?: number | string
    newValue?: number | string
  }
}

interface ActivityTimelineProps {
  activities: Activity[]
}

const activityConfig: Record<ActivityType, { icon: LucideIcon; color: string; label: string }> = {
  LOAN_CREATED: { icon: FileText, color: 'text-blue-500', label: 'Préstamo creado' },
  PAYMENT_RECEIVED: { icon: DollarSign, color: 'text-green-500', label: 'Pago recibido' },
  CREDIT_LIMIT_CHANGED: { icon: AlertCircle, color: 'text-orange-500', label: 'Cupo modificado' },
  APPLICATION_SUBMITTED: { icon: FileText, color: 'text-purple-500', label: 'Solicitud enviada' },
  APPLICATION_APPROVED: { icon: CheckCircle, color: 'text-green-500', label: 'Solicitud aprobada' },
  STATUS_CHANGED: { icon: AlertCircle, color: 'text-yellow-500', label: 'Estado cambiado' },
  NOTE_ADDED: { icon: FileText, color: 'text-gray-500', label: 'Nota añadida' },
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No hay actividad registrada
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const config = activityConfig[activity.type]
        const Icon = config.icon

        return (
          <div key={activity.id} className="flex gap-4">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`rounded-full p-2 bg-muted ${config.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              {index < activities.length - 1 && (
                <div className="w-0.5 h-full bg-muted mt-2" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {config.label}
                  </Badge>
                  {activity.userName && (
                    <span className="text-xs text-muted-foreground">
                      por {activity.userName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDate(activity.timestamp)}
                </div>
              </div>
              <p className="text-sm">{activity.description}</p>

              {/* Metadata display */}
              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  {activity.metadata.amount && (
                    <p>Monto: {formatCurrency(activity.metadata.amount)}</p>
                  )}
                  {activity.metadata.previousValue && activity.metadata.newValue && (
                    <p>
                      {activity.metadata.previousValue} → {activity.metadata.newValue}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
