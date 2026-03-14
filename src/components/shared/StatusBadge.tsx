import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_COLORS,
  LOAN_STATUS_LABELS,
  LOAN_STATUS_COLORS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
  INSTALLMENT_STATUS_LABELS,
  INSTALLMENT_STATUS_COLORS,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_COLORS,
} from '@/lib/constants/statuses'
import { ClientStatus, LoanStatus, RiskLevel, InstallmentStatus, ApplicationStatus } from '@prisma/client'

interface StatusBadgeProps {
  type: 'client' | 'loan' | 'risk' | 'installment' | 'application'
  value: ClientStatus | LoanStatus | RiskLevel | InstallmentStatus | ApplicationStatus
  className?: string
}

export function StatusBadge({ type, value, className }: StatusBadgeProps) {
  let label = ''
  let colorClass = ''

  switch (type) {
    case 'client':
      label = CLIENT_STATUS_LABELS[value as ClientStatus]
      colorClass = CLIENT_STATUS_COLORS[value as ClientStatus]
      break
    case 'loan':
      label = LOAN_STATUS_LABELS[value as LoanStatus]
      colorClass = LOAN_STATUS_COLORS[value as LoanStatus]
      break
    case 'risk':
      label = RISK_LEVEL_LABELS[value as RiskLevel]
      colorClass = RISK_LEVEL_COLORS[value as RiskLevel]
      break
    case 'installment':
      label = INSTALLMENT_STATUS_LABELS[value as InstallmentStatus]
      colorClass = INSTALLMENT_STATUS_COLORS[value as InstallmentStatus]
      break
    case 'application':
      label = APPLICATION_STATUS_LABELS[value as ApplicationStatus]
      colorClass = APPLICATION_STATUS_COLORS[value as ApplicationStatus]
      break
  }

  return (
    <Badge variant="outline" className={cn(colorClass, 'font-medium', className)}>
      {label}
    </Badge>
  )
}
