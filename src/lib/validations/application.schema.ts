import { z } from 'zod'

export const applicationSchema = z.object({
  clientId: z.string().uuid('Cliente inválido'),
  requestedAmount: z.number().min(100, 'Monto mínimo: 100€').max(500000, 'Monto máximo: 500,000€'),
  purpose: z.string().optional().nullable(),
  termMonths: z.number().int().min(1, 'Plazo mínimo: 1 mes').max(120, 'Plazo máximo: 120 meses'),
  proposedRate: z.number().min(0, 'Tasa debe ser positiva').max(1, 'Tasa máxima: 100%'),
  paymentFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY']).default('MONTHLY'),
})

export const applicationApprovalSchema = z.object({
  approvalNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
})

export type ApplicationFormData = z.infer<typeof applicationSchema>
export type ApplicationApprovalData = z.infer<typeof applicationApprovalSchema>
