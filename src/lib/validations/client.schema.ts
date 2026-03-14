import { z } from 'zod'

// Validación de DNI español
const dniRegex = /^[0-9]{8}[A-Z]$/
const nieRegex = /^[XYZ][0-9]{7}[A-Z]$/
const cifRegex = /^[A-Z][0-9]{8}$/

export const validateDNI = (dni: string): boolean => {
  if (!dniRegex.test(dni)) return false
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE'
  const number = parseInt(dni.substring(0, 8), 10)
  const letter = dni.charAt(8)
  return letters.charAt(number % 23) === letter
}

export const validateNIE = (nie: string): boolean => {
  if (!nieRegex.test(nie)) return false
  const niePrefix = { X: 0, Y: 1, Z: 2 }
  const prefix = niePrefix[nie.charAt(0) as 'X' | 'Y' | 'Z']
  const number = parseInt(prefix + nie.substring(1, 8), 10)
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE'
  const letter = nie.charAt(8)
  return letters.charAt(number % 23) === letter
}

export const validateCIF = (cif: string): boolean => {
  if (!cifRegex.test(cif)) return false

  // Extraer letra de control y dígitos
  const controlChar = cif.charAt(cif.length - 1)
  const cifDigits = cif.substring(1, cif.length - 1)

  // Calcular suma ponderada
  let sum = 0
  for (let i = 0; i < cifDigits.length; i++) {
    const digit = parseInt(cifDigits[i], 10)

    if (i % 2 === 0) {
      // Posiciones impares (0, 2, 4, 6): multiplicar por 2
      const doubled = digit * 2
      sum += doubled > 9 ? doubled - 9 : doubled
    } else {
      // Posiciones pares (1, 3, 5, 7): sumar directamente
      sum += digit
    }
  }

  // Obtener dígito de control
  const controlDigit = (10 - (sum % 10)) % 10

  // Letras de control (según dígito calculado)
  const controlLetters = 'JABCDEFGHI'
  const expectedLetter = controlLetters[controlDigit]

  // El CIF puede terminar en letra o número según el tipo de organización
  // Aceptamos ambos formatos
  return controlChar === expectedLetter || controlChar === controlDigit.toString()
}

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value

  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

const nanToUndefined = (value: unknown) => {
  if (typeof value === 'number' && Number.isNaN(value)) {
    return undefined
  }

  return value
}

const optionalTextField = (maxLength = 255) =>
  z.preprocess(emptyStringToUndefined, z.string().trim().max(maxLength).optional().nullable())

const optionalDocumentField = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .min(2, 'El documento debe tener al menos 2 caracteres')
    .max(40, 'El documento debe tener máximo 40 caracteres')
    .optional()
    .nullable()
)

const optionalNumberField = z.preprocess(
  nanToUndefined,
  z.number().min(0, 'El valor debe ser positivo').optional().nullable()
)

// Schema base de cliente
const baseClientSchema = z.object({
  email: z.preprocess(
    emptyStringToUndefined,
    z.string().trim().email('Email inválido').optional().nullable()
  ),
  phone: z.string().trim().min(6, 'Teléfono debe tener al menos 6 caracteres'),
  address: optionalTextField(),
  city: optionalTextField(120),
  postalCode: optionalTextField(20),
  creditLimit: z.preprocess(
    value => {
      if (typeof value === 'number' && Number.isNaN(value)) return 0
      return value
    },
    z.number().min(0, 'El cupo debe ser positivo').default(0)
  ),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  internalScore: z.preprocess(
    nanToUndefined,
    z.number().min(0).max(100).optional().nullable()
  ),
})

// Schema para persona física
export const individualClientSchema = z.object({
  type: z.literal('INDIVIDUAL'),
  firstName: z.string().trim().min(2, 'Nombre debe tener al menos 2 caracteres'),
  lastName: z.string().trim().min(2, 'Apellidos debe tener al menos 2 caracteres'),
  taxId: optionalDocumentField,
  dateOfBirth: optionalTextField(40),
  occupation: optionalTextField(120),
  income: optionalNumberField,
  reference1Name: optionalTextField(120),
  reference1Phone: optionalTextField(40),
  reference2Name: optionalTextField(120),
  reference2Phone: optionalTextField(40),
}).merge(baseClientSchema)

// Schema para empresa
export const businessClientSchema = z.object({
  type: z.literal('BUSINESS'),
  businessName: z.string().trim().min(2, 'Razón social debe tener al menos 2 caracteres'),
  taxId: optionalDocumentField,
  legalRepName: z.string().trim().min(2, 'Nombre del representante requerido'),
  legalRepTaxId: optionalDocumentField,
  industry: optionalTextField(120),
  annualRevenue: optionalNumberField,
  employeeCount: z.preprocess(
    nanToUndefined,
    z.number().int().min(0, 'El valor debe ser positivo').optional().nullable()
  ),
}).merge(baseClientSchema)

// Schema unificado
export const clientSchema = z.discriminatedUnion('type', [
  individualClientSchema,
  businessClientSchema,
])

// Type inference
export type ClientFormData = z.infer<typeof clientSchema>
export type IndividualClientData = z.infer<typeof individualClientSchema>
export type BusinessClientData = z.infer<typeof businessClientSchema>
