import { z } from 'zod'

export const loanSchema = z.object({
  applicationId: z.string().uuid('Solicitud inválida').optional(),
  clientId: z.string().uuid('Cliente inválido'),
  principalAmount: z.number().min(100, 'Monto mínimo: 100€').max(500000, 'Monto máximo: 500,000€'),

  // Tipo de amortización (nuevo sistema)
  amortizationType: z
    .enum(['AMERICAN', 'FRENCH', 'GERMAN', 'SIMPLE', 'CUSTOM'])
    .default('AMERICAN'),

  // Intereses
  interestType: z.enum(['FIXED_AMOUNT', 'PERCENTAGE_MONTHLY', 'PERCENTAGE_ANNUAL']),
  interestRate: z.number().min(0, 'Tasa debe ser positiva'),
  fixedInterestAmount: z.number().optional().nullable(),

  // Plazo y frecuencia
  termMonths: z.number().int().min(1, 'Plazo mínimo: 1 mes').max(120, 'Plazo máximo: 120 meses'),
  paymentFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY']),

  // Fechas
  disbursementDate: z.string().optional(),
  firstDueDate: z.string(),

  // Configuración de pagos
  allowSaturdayPayments: z.boolean().default(true),
  allowSundayPayments: z.boolean().default(true),

  // Garantías y avales
  hasGuarantor: z.boolean().default(false),
  guarantorName: z.string().optional().nullable(),
  guarantorTaxId: z.string().optional().nullable(),
  guarantorPhone: z.string().optional().nullable(),
  guarantorAddress: z.string().optional().nullable(),
  collateralType: z.string().optional().nullable(),
  collateralValue: z.number().optional().nullable(),
  collateralNotes: z.string().optional().nullable(),

  // Notas e instrucciones
  notes: z.string().optional().nullable(),
  clientInstructions: z.string().optional().nullable(),

  // Configuración de comunicación
  sendEmailOnCreate: z.boolean().default(true),
})

export type LoanFormData = z.infer<typeof loanSchema>
