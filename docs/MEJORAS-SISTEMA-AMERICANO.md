# 🚀 MEJORAS URGENTES PARA LENDCORE
## Análisis del Sistema Actual + Implementación Préstamo Americano

**Fecha:** 10 Marzo 2026
**Cliente:** JEAN PAUL - Bilbao, España
**Requerimiento crítico:** 99% de préstamos son tipo AMERICANO

---

## 📋 FUNCIONALIDADES DEL SISTEMA ACTUAL QUE FALTAN EN LENDCORE

### ✅ ALTA PRIORIDAD (Implementar YA)

| # | Funcionalidad | Tiene Sistema Actual | Tiene LendCore | Prioridad | Estimación |
|---|---------------|---------------------|----------------|-----------|------------|
| 1 | **Préstamo Tipo Americano** | ✅ Sí | ❌ No | 🔴 CRÍTICA | 4 horas |
| 2 | **Préstamo Tipo Francés** | ✅ Sí | ❌ No | 🟡 Media | 3 horas |
| 3 | **Préstamo Tipo Alemán** | ✅ Sí | ❌ No | 🟡 Media | 3 horas |
| 4 | **Generación de Contratos PDF** | ✅ Sí | ❌ No | 🔴 CRÍTICA | 5 horas |
| 5 | **Exportar Cronograma a Excel** | ✅ Sí | ⚠️ Parcial | 🟠 Alta | 2 horas |
| 6 | **Campo de Garantes estructurado** | ✅ Sí | ⚠️ Parcial | 🟠 Alta | 3 horas |
| 7 | **Envío de email automático al crear préstamo** | ✅ Sí | ❌ No | 🟠 Alta | 4 horas |
| 8 | **Configuración días de pago (Sábado/Domingo)** | ✅ Sí | ❌ No | 🟡 Media | 2 horas |
| 9 | **Vista de "Total Intereses" destacada** | ✅ Sí | ⚠️ Existe pero no visible | 🟢 Baja | 1 hora |
| 10 | **Campo de Observaciones prominente** | ✅ Sí | ⚠️ Existe pero oculto | 🟢 Baja | 1 hora |

**Total estimado:** 28 horas de desarrollo

---

## 🎯 PRÉSTAMO TIPO AMERICANO - ESPECIFICACIÓN TÉCNICA

### ¿Qué es el Préstamo Americano?

**Definición:** Sistema de amortización donde:
- Durante el plazo del préstamo: **Solo se pagan INTERESES**
- Al final del plazo: **Se paga TODO EL CAPITAL de una vez**

**Ventaja para el cliente:** Cuotas bajas durante el plazo
**Desventaja:** Última cuota muy grande

### Ejemplo Real del Sistema Actual

**Visto en las imágenes:**
```
Cliente: Daniel Humberto Suarez Gonzalez
Monto: 1,000.00€
Plazo: 2 cuotas mensuales
Tasa: 1.00% mensual
Tipo: AMERICANO

CRONOGRAMA:
┌─────┬────────────┬──────────┬──────────┬──────────┬────────────┐
│ Nro │ Día Pago   │ Capital  │ Interés  │ Cuota    │ Saldo      │
├─────┼────────────┼──────────┼──────────┼──────────┼────────────┤
│  1  │ 09-ABR-2026│    0.00  │   10.00  │   10.00  │ 1,000.00   │
│  2  │ 11-MAY-2026│ 1,000.00 │   10.00  │ 1,010.00 │     0.00   │
└─────┴────────────┴──────────┴──────────┴──────────┴────────────┘

Total de Intereses: 20.00€
Total a Pagar: 1,020.00€
```

### Fórmula de Cálculo

**Interés por cuota (todas excepto la última):**
```
Interés = Capital × Tasa
```

**Cuota periódica (todas excepto la última):**
```
Cuota = Interés  (Capital = 0)
```

**Última cuota:**
```
Cuota = Capital Total + Interés
```

---

## 💻 IMPLEMENTACIÓN EN LENDCORE

### Paso 1: Actualizar Schema de Prisma

**Archivo:** `prisma/schema.prisma`

```prisma
// Agregar nuevo enum para tipos de amortización
enum AmortizationType {
  AMERICAN      // Solo intereses, capital al final
  FRENCH        // Cuotas fijas (sistema francés)
  GERMAN        // Cuotas de capital fijas, intereses decrecientes
  SIMPLE        // Capital + interés en una sola cuota
  CUSTOM        // Manual/Personalizado
}

model Loan {
  id                  String            @id @default(uuid())
  loanNumber          String            @unique
  clientId            String

  // Monto principal
  principalAmount     Decimal           @db.Decimal(15, 2)
  outstandingPrincipal Decimal          @db.Decimal(15, 2)

  // NUEVO: Tipo de amortización
  amortizationType    AmortizationType  @default(AMERICAN)

  // Interés
  interestType        InterestType
  interestRate        Decimal           @db.Decimal(5, 4)
  fixedInterestAmount Decimal?          @db.Decimal(15, 2)

  // Términos
  termMonths          Int
  paymentFrequency    PaymentFrequency

  // NUEVO: Configuración de días de pago
  allowSaturdayPayments Boolean          @default(true)
  allowSundayPayments   Boolean          @default(true)

  // Fechas
  disbursementDate    DateTime
  firstDueDate        DateTime
  finalDueDate        DateTime

  // Estado
  status              LoanStatus        @default(ACTIVE)

  // Tracking financiero
  totalInterest       Decimal           @default(0) @db.Decimal(15, 2)
  totalPaid           Decimal           @default(0) @db.Decimal(15, 2)
  totalPenalty        Decimal           @default(0) @db.Decimal(15, 2)

  // NUEVO: Garantía estructurada
  hasGuarantor        Boolean           @default(false)
  guarantorName       String?
  guarantorTaxId      String?           // DNI del garante
  guarantorPhone      String?
  guarantorAddress    String?

  collateralType      String?
  collateralValue     Decimal?          @db.Decimal(15, 2)
  collateralNotes     String?

  // NUEVO: Observaciones
  notes               String?           // Notas internas
  clientInstructions  String?           // Instrucciones específicas del cliente

  // NUEVO: Envío de documentos
  sendEmailOnCreate   Boolean           @default(true)
  contractGenerated   Boolean           @default(false)
  contractUrl         String?

  // Responsable
  createdBy           String

  // Metadata
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  // Relaciones
  client              Client            @relation(fields: [clientId], references: [id])
  creator             User              @relation("CreatedBy", fields: [createdBy], references: [id])
  installments        Installment[]
  payments            Payment[]

  @@map("loans")
}
```

---

### Paso 2: Crear Función de Cálculo para Préstamo Americano

**Archivo:** `src/lib/calculations/amortization-american.ts`

```typescript
import { PaymentFrequency, InterestType } from '@prisma/client'
import { getNextDueDate, calculateInstallmentInterest } from './installments'

export interface AmericanLoanTerms {
  principalAmount: number
  interestType: InterestType
  interestRate: number
  fixedInterestAmount?: number
  termMonths: number
  paymentFrequency: PaymentFrequency
  firstDueDate: Date
}

export interface AmericanInstallmentData {
  installmentNumber: number
  dueDate: Date
  principalAmount: number
  interestAmount: number
  totalAmount: number
  pendingAmount: number
  isLastInstallment: boolean
}

/**
 * Generar cronograma de préstamo tipo AMERICANO
 *
 * Características:
 * - Cuotas 1 a n-1: Solo intereses (capital = 0)
 * - Cuota n (última): Todo el capital + intereses
 *
 * @param terms Términos del préstamo
 * @returns Array de cuotas
 */
export function generateAmericanSchedule(
  terms: AmericanLoanTerms
): AmericanInstallmentData[] {
  const {
    principalAmount,
    interestType,
    interestRate,
    fixedInterestAmount,
    termMonths,
    paymentFrequency,
    firstDueDate,
  } = terms

  // Calcular número de cuotas
  const numberOfInstallments = calculateNumberOfInstallments(termMonths, paymentFrequency)

  const installments: AmericanInstallmentData[] = []

  for (let i = 1; i <= numberOfInstallments; i++) {
    const isLastInstallment = i === numberOfInstallments

    // Calcular fecha de vencimiento
    const dueDate = getNextDueDate(firstDueDate, paymentFrequency, i - 1)

    // Calcular interés (siempre sobre el capital total)
    const interestAmount = calculateInstallmentInterest(
      principalAmount, // Siempre sobre el capital total, no el restante
      interestType,
      interestRate,
      fixedInterestAmount
    )

    // En préstamo americano:
    // - Cuotas normales: Capital = 0, solo interés
    // - Última cuota: Capital = todo + interés
    const principalThisInstallment = isLastInstallment ? principalAmount : 0
    const totalAmount = principalThisInstallment + interestAmount

    installments.push({
      installmentNumber: i,
      dueDate,
      principalAmount: Number(principalThisInstallment.toFixed(2)),
      interestAmount: Number(interestAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      pendingAmount: Number(totalAmount.toFixed(2)),
      isLastInstallment,
    })
  }

  return installments
}

/**
 * Calcular resumen del préstamo americano
 */
export function calculateAmericanSummary(terms: AmericanLoanTerms) {
  const installments = generateAmericanSchedule(terms)

  const totalInterest = installments.reduce(
    (sum, inst) => sum + inst.interestAmount,
    0
  )

  const totalToPay = terms.principalAmount + totalInterest

  // Encontrar la última cuota (la más grande)
  const lastInstallment = installments[installments.length - 1]

  return {
    installments,
    summary: {
      principalAmount: terms.principalAmount,
      totalInterest: Number(totalInterest.toFixed(2)),
      totalToPay: Number(totalToPay.toFixed(2)),
      numberOfInstallments: installments.length,
      regularInstallmentAmount: installments[0]?.totalAmount || 0, // Cuota normal (solo interés)
      lastInstallmentAmount: lastInstallment.totalAmount, // Cuota final (capital + interés)
      averageInstallmentAmount: Number((totalToPay / installments.length).toFixed(2)),
    },
  }
}

/**
 * Calcular número de cuotas basado en frecuencia
 */
function calculateNumberOfInstallments(
  termMonths: number,
  frequency: PaymentFrequency
): number {
  switch (frequency) {
    case 'WEEKLY':
      return Math.ceil((termMonths * 30) / 7)
    case 'BIWEEKLY':
      return Math.ceil((termMonths * 30) / 14)
    case 'MONTHLY':
      return termMonths
    case 'QUARTERLY':
      return Math.ceil(termMonths / 3)
    default:
      return termMonths
  }
}
```

---

### Paso 3: Crear Función de Cálculo para Préstamo Francés

**Archivo:** `src/lib/calculations/amortization-french.ts`

```typescript
import { PaymentFrequency, InterestType } from '@prisma/client'
import { getNextDueDate } from './installments'

export interface FrenchLoanTerms {
  principalAmount: number
  interestRate: number // Tasa mensual (ej: 0.01 = 1%)
  termMonths: number
  paymentFrequency: PaymentFrequency
  firstDueDate: Date
}

/**
 * Generar cronograma de préstamo tipo FRANCÉS
 *
 * Características:
 * - Cuotas FIJAS durante todo el plazo
 * - Al inicio se paga más interés, al final más capital
 * - Usa fórmula de anualidad
 *
 * @param terms Términos del préstamo
 * @returns Array de cuotas
 */
export function generateFrenchSchedule(terms: FrenchLoanTerms) {
  const {
    principalAmount,
    interestRate,
    termMonths,
    paymentFrequency,
    firstDueDate,
  } = terms

  const numberOfInstallments = calculateNumberOfInstallments(termMonths, paymentFrequency)

  // Calcular cuota fija usando fórmula de anualidad
  const fixedPayment = calculateFixedPayment(
    principalAmount,
    interestRate,
    numberOfInstallments
  )

  const installments = []
  let remainingPrincipal = principalAmount

  for (let i = 1; i <= numberOfInstallments; i++) {
    const dueDate = getNextDueDate(firstDueDate, paymentFrequency, i - 1)

    // Calcular interés sobre saldo restante
    const interestAmount = remainingPrincipal * interestRate

    // Capital = Cuota fija - Interés
    let principalAmount = fixedPayment - interestAmount

    // En la última cuota, ajustar para evitar errores de redondeo
    if (i === numberOfInstallments) {
      principalAmount = remainingPrincipal
    }

    const totalAmount = principalAmount + interestAmount

    installments.push({
      installmentNumber: i,
      dueDate,
      principalAmount: Number(principalAmount.toFixed(2)),
      interestAmount: Number(interestAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      pendingAmount: Number(totalAmount.toFixed(2)),
      remainingPrincipal: Number((remainingPrincipal - principalAmount).toFixed(2)),
    })

    remainingPrincipal -= principalAmount
  }

  return installments
}

/**
 * Calcular cuota fija del sistema francés
 * Fórmula: C = P * [r * (1 + r)^n] / [(1 + r)^n - 1]
 *
 * Donde:
 * C = Cuota fija
 * P = Principal
 * r = Tasa de interés
 * n = Número de cuotas
 */
function calculateFixedPayment(
  principal: number,
  rate: number,
  periods: number
): number {
  if (rate === 0) {
    return principal / periods
  }

  const numerator = rate * Math.pow(1 + rate, periods)
  const denominator = Math.pow(1 + rate, periods) - 1
  const payment = principal * (numerator / denominator)

  return payment
}

function calculateNumberOfInstallments(
  termMonths: number,
  frequency: PaymentFrequency
): number {
  switch (frequency) {
    case 'WEEKLY':
      return Math.ceil((termMonths * 30) / 7)
    case 'BIWEEKLY':
      return Math.ceil((termMonths * 30) / 14)
    case 'MONTHLY':
      return termMonths
    case 'QUARTERLY':
      return Math.ceil(termMonths / 3)
    default:
      return termMonths
  }
}
```

---

### Paso 4: Crear Función de Cálculo para Préstamo Alemán

**Archivo:** `src/lib/calculations/amortization-german.ts`

```typescript
import { PaymentFrequency } from '@prisma/client'
import { getNextDueDate } from './installments'

export interface GermanLoanTerms {
  principalAmount: number
  interestRate: number
  termMonths: number
  paymentFrequency: PaymentFrequency
  firstDueDate: Date
}

/**
 * Generar cronograma de préstamo tipo ALEMÁN
 *
 * Características:
 * - Cuotas de CAPITAL fijas
 * - Intereses decrecientes (sobre saldo restante)
 * - Cuota total decreciente
 *
 * @param terms Términos del préstamo
 * @returns Array de cuotas
 */
export function generateGermanSchedule(terms: GermanLoanTerms) {
  const {
    principalAmount,
    interestRate,
    termMonths,
    paymentFrequency,
    firstDueDate,
  } = terms

  const numberOfInstallments = calculateNumberOfInstallments(termMonths, paymentFrequency)

  // Capital fijo por cuota
  const fixedPrincipal = principalAmount / numberOfInstallments

  const installments = []
  let remainingPrincipal = principalAmount

  for (let i = 1; i <= numberOfInstallments; i++) {
    const dueDate = getNextDueDate(firstDueDate, paymentFrequency, i - 1)

    // Interés sobre saldo restante
    const interestAmount = remainingPrincipal * interestRate

    // Capital es fijo (excepto última cuota por redondeo)
    const principalThisInstallment =
      i === numberOfInstallments ? remainingPrincipal : fixedPrincipal

    const totalAmount = principalThisInstallment + interestAmount

    installments.push({
      installmentNumber: i,
      dueDate,
      principalAmount: Number(principalThisInstallment.toFixed(2)),
      interestAmount: Number(interestAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      pendingAmount: Number(totalAmount.toFixed(2)),
      remainingPrincipal: Number((remainingPrincipal - principalThisInstallment).toFixed(2)),
    })

    remainingPrincipal -= principalThisInstallment
  }

  return installments
}

function calculateNumberOfInstallments(
  termMonths: number,
  frequency: PaymentFrequency
): number {
  switch (frequency) {
    case 'WEEKLY':
      return Math.ceil((termMonths * 30) / 7)
    case 'BIWEEKLY':
      return Math.ceil((termMonths * 30) / 14)
    case 'MONTHLY':
      return termMonths
    case 'QUARTERLY':
      return Math.ceil(termMonths / 3)
    default:
      return termMonths
  }
}
```

---

### Paso 5: Actualizar loanService para soportar tipos de amortización

**Archivo:** `src/services/loanService.ts`

```typescript
import { generateAmericanSchedule, calculateAmericanSummary } from '@/lib/calculations/amortization-american'
import { generateFrenchSchedule } from '@/lib/calculations/amortization-french'
import { generateGermanSchedule } from '@/lib/calculations/amortization-german'
import { generateInstallmentSchedule } from '@/lib/calculations/installments'
import { AmortizationType } from '@prisma/client'

/**
 * Crear préstamo con tipo de amortización específico
 */
export async function createLoanWithAmortization(data: CreateLoanInput) {
  const {
    amortizationType,
    principalAmount,
    interestRate,
    termMonths,
    paymentFrequency,
    firstDueDate,
    ...rest
  } = data

  let installments

  // Generar cronograma según tipo de amortización
  switch (amortizationType) {
    case 'AMERICAN':
      const americanSchedule = generateAmericanSchedule({
        principalAmount,
        interestType: data.interestType,
        interestRate,
        fixedInterestAmount: data.fixedInterestAmount,
        termMonths,
        paymentFrequency,
        firstDueDate,
      })
      installments = americanSchedule
      break

    case 'FRENCH':
      installments = generateFrenchSchedule({
        principalAmount,
        interestRate,
        termMonths,
        paymentFrequency,
        firstDueDate,
      })
      break

    case 'GERMAN':
      installments = generateGermanSchedule({
        principalAmount,
        interestRate,
        termMonths,
        paymentFrequency,
        firstDueDate,
      })
      break

    case 'SIMPLE':
      // Préstamo simple: Todo en una cuota
      installments = [{
        installmentNumber: 1,
        dueDate: firstDueDate,
        principalAmount,
        interestAmount: principalAmount * interestRate * termMonths,
        totalAmount: principalAmount + (principalAmount * interestRate * termMonths),
        pendingAmount: principalAmount + (principalAmount * interestRate * termMonths),
      }]
      break

    default:
      // CUSTOM o default: Usar el sistema actual
      installments = generateInstallmentSchedule({
        principalAmount,
        interestType: data.interestType,
        interestRate,
        fixedInterestAmount: data.fixedInterestAmount,
        termMonths,
        paymentFrequency,
        firstDueDate,
      })
  }

  // Crear préstamo en base de datos
  const loan = await prisma.loan.create({
    data: {
      ...rest,
      principalAmount,
      outstandingPrincipal: principalAmount,
      interestRate,
      termMonths,
      paymentFrequency,
      firstDueDate,
      finalDueDate: installments[installments.length - 1].dueDate,
      amortizationType,
      totalInterest: installments.reduce((sum, i) => sum + i.interestAmount, 0),
      installments: {
        create: installments.map(inst => ({
          installmentNumber: inst.installmentNumber,
          dueDate: inst.dueDate,
          principalAmount: inst.principalAmount,
          interestAmount: inst.interestAmount,
          totalAmount: inst.totalAmount,
          pendingAmount: inst.pendingAmount,
        })),
      },
    },
    include: {
      installments: true,
      client: true,
    },
  })

  // Si está configurado, enviar email al cliente
  if (data.sendEmailOnCreate) {
    await sendLoanCreatedEmail(loan)
  }

  // Si está configurado, generar contrato
  if (data.contractGenerated) {
    const contractUrl = await generateLoanContract(loan)
    await prisma.loan.update({
      where: { id: loan.id },
      data: { contractUrl },
    })
  }

  return loan
}
```

---

## 📧 GENERACIÓN DE CONTRATOS Y EMAILS

### Paso 6: Crear servicio de generación de contratos

**Archivo:** `src/services/contractService.ts`

```typescript
import { Loan, Client } from '@prisma/client'
import PDFDocument from 'pdfkit'
import { formatCurrency } from '@/lib/formatters/currency'
import { formatDate } from '@/lib/formatters/date'

export async function generateLoanContract(
  loan: Loan & { client: Client; installments: any[] }
): Promise<string> {
  // Crear PDF
  const doc = new PDFDocument({ size: 'A4', margin: 50 })

  // Header
  doc
    .fontSize(20)
    .text('CONTRATO DE PRÉSTAMO', { align: 'center' })
    .moveDown()

  doc
    .fontSize(12)
    .text(`Número de Préstamo: ${loan.loanNumber}`)
    .text(`Fecha: ${formatDate(loan.createdAt)}`)
    .moveDown()

  // Datos del prestamista
  doc
    .fontSize(14)
    .text('PRESTAMISTA:', { underline: true })
    .fontSize(10)
    .text('JEAN PAUL - Servicios Financieros')
    .text('Bilbao, España')
    .moveDown()

  // Datos del prestatario
  doc
    .fontSize(14)
    .text('PRESTATARIO:', { underline: true })
    .fontSize(10)
    .text(`Nombre: ${loan.client.name}`)
    .text(`DNI/CIF: ${loan.client.taxId}`)
    .text(`Dirección: ${loan.client.address || 'N/A'}`)
    .moveDown()

  // Condiciones del préstamo
  doc
    .fontSize(14)
    .text('CONDICIONES DEL PRÉSTAMO:', { underline: true })
    .fontSize(10)
    .text(`Tipo de Préstamo: ${loan.amortizationType}`)
    .text(`Monto del Préstamo: ${formatCurrency(loan.principalAmount)}`)
    .text(`Tasa de Interés: ${(loan.interestRate * 100).toFixed(2)}% mensual`)
    .text(`Plazo: ${loan.termMonths} meses`)
    .text(`Frecuencia de Pago: ${loan.paymentFrequency}`)
    .text(`Fecha de Desembolso: ${formatDate(loan.disbursementDate)}`)
    .text(`Primera Cuota: ${formatDate(loan.firstDueDate)}`)
    .text(`Última Cuota: ${formatDate(loan.finalDueDate)}`)
    .text(`Total de Intereses: ${formatCurrency(loan.totalInterest)}`)
    .text(`Total a Pagar: ${formatCurrency(loan.principalAmount + loan.totalInterest)}`)
    .moveDown()

  // Cronograma de pagos
  doc
    .fontSize(14)
    .text('CRONOGRAMA DE PAGOS:', { underline: true })
    .moveDown()

  // Tabla
  const tableTop = doc.y
  const colWidths = [40, 100, 80, 80, 80, 80]

  // Headers
  doc
    .fontSize(9)
    .text('Nro', 50, tableTop)
    .text('Fecha', 90, tableTop)
    .text('Capital', 190, tableTop)
    .text('Interés', 270, tableTop)
    .text('Cuota', 350, tableTop)
    .text('Saldo', 430, tableTop)

  let y = tableTop + 20

  loan.installments.forEach((inst, index) => {
    const saldo =
      loan.principalAmount -
      loan.installments
        .slice(0, index + 1)
        .reduce((sum, i) => sum + i.principalAmount, 0)

    doc
      .fontSize(8)
      .text(inst.installmentNumber.toString(), 50, y)
      .text(formatDate(inst.dueDate), 90, y)
      .text(formatCurrency(inst.principalAmount), 190, y)
      .text(formatCurrency(inst.interestAmount), 270, y)
      .text(formatCurrency(inst.totalAmount), 350, y)
      .text(formatCurrency(saldo), 430, y)

    y += 15
  })

  // Firmas
  doc
    .moveDown(3)
    .fontSize(10)
    .text('_________________________', 100)
    .text('Firma del Prestamista', 100)
    .text('_________________________', 350)
    .text('Firma del Prestatario', 350)

  // Guardar PDF en storage (S3, Vercel Blob, etc.)
  const pdfBuffer = await streamToBuffer(doc)
  const url = await uploadToStorage(pdfBuffer, `contracts/loan-${loan.loanNumber}.pdf`)

  return url
}

// Helper para convertir stream a buffer
function streamToBuffer(doc: PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

// Helper para subir a storage (implementar según tu solución)
async function uploadToStorage(buffer: Buffer, path: string): Promise<string> {
  // Implementar según tu solución de storage
  // Ejemplo con Vercel Blob:
  // const blob = await put(path, buffer, { access: 'public' })
  // return blob.url

  return `https://storage.lendcore.app/${path}`
}
```

---

### Paso 7: Crear servicio de email

**Archivo:** `src/services/emailService.ts`

```typescript
import nodemailer from 'nodemailer'
import { formatCurrency } from '@/lib/formatters/currency'
import { formatDate } from '@/lib/formatters/date'

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function sendLoanCreatedEmail(loan: any) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #303854; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f4f4f4; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #303854; color: white; }
        .highlight { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Préstamo Aprobado</h1>
          <p>Tu préstamo ha sido procesado exitosamente</p>
        </div>

        <div class="content">
          <h2>Hola ${loan.client.name},</h2>
          <p>Tu préstamo <strong>#${loan.loanNumber}</strong> ha sido aprobado y desembolsado.</p>

          <div class="highlight">
            <h3>Resumen del Préstamo:</h3>
            <ul>
              <li><strong>Monto Prestado:</strong> ${formatCurrency(loan.principalAmount)}</li>
              <li><strong>Tasa de Interés:</strong> ${(loan.interestRate * 100).toFixed(2)}% mensual</li>
              <li><strong>Total de Intereses:</strong> ${formatCurrency(loan.totalInterest)}</li>
              <li><strong>Total a Pagar:</strong> ${formatCurrency(loan.principalAmount + loan.totalInterest)}</li>
              <li><strong>Número de Cuotas:</strong> ${loan.installments.length}</li>
              <li><strong>Primera Cuota:</strong> ${formatDate(loan.firstDueDate)}</li>
            </ul>
          </div>

          <h3>Cronograma de Pagos:</h3>
          <table>
            <thead>
              <tr>
                <th>Cuota</th>
                <th>Fecha</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              ${loan.installments
                .map(
                  (inst: any) => `
                <tr>
                  <td>${inst.installmentNumber}</td>
                  <td>${formatDate(inst.dueDate)}</td>
                  <td>${formatCurrency(inst.totalAmount)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <p><strong>Importante:</strong> Por favor, asegúrate de realizar tus pagos puntualmente para evitar cargos por mora.</p>

          ${loan.contractUrl ? `<p><a href="${loan.contractUrl}">Descargar Contrato</a></p>` : ''}
        </div>

        <div class="footer">
          <p>JEAN PAUL - Servicios Financieros | Bilbao, España</p>
          <p>Este es un correo automático, por favor no responder.</p>
        </div>
      </div>
    </body>
    </html>
  `

  await transporter.sendMail({
    from: '"JEAN PAUL" <no-reply@jeanpaul.es>',
    to: loan.client.email,
    subject: `Préstamo Aprobado #${loan.loanNumber}`,
    html,
  })
}
```

---

## 🎨 UI/UX - COMPONENTES PARA SIMULADOR

### Paso 8: Componente de Selección de Tipo de Préstamo

**Archivo:** `src/components/loans/LoanTypeSelector.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, Calendar, Zap } from 'lucide-react'

const LOAN_TYPES = [
  {
    id: 'AMERICAN',
    name: 'Préstamo Americano',
    icon: DollarSign,
    description: 'Solo pagas intereses. Capital al final.',
    highlight: 'Más Popular',
    color: 'bg-blue-500',
    example: 'Ej: Cuotas de 50€, última 1,050€',
    pros: ['Cuotas bajas', 'Liquidez durante el plazo'],
    cons: ['Cuota final grande'],
  },
  {
    id: 'FRENCH',
    name: 'Préstamo Francés',
    icon: TrendingUp,
    description: 'Cuotas fijas todo el tiempo.',
    highlight: null,
    color: 'bg-green-500',
    example: 'Ej: Todas las cuotas 220€',
    pros: ['Cuotas predecibles', 'Fácil de presupuestar'],
    cons: ['Más interés total'],
  },
  {
    id: 'GERMAN',
    name: 'Préstamo Alemán',
    icon: Calendar,
    description: 'Cuotas decrecientes.',
    highlight: null,
    color: 'bg-purple-500',
    example: 'Ej: Cuota 1: 300€, Cuota 2: 250€...',
    pros: ['Menos interés total', 'Deuda baja rápido'],
    cons: ['Cuotas iniciales altas'],
  },
  {
    id: 'SIMPLE',
    name: 'Préstamo Simple',
    icon: Zap,
    description: 'Todo en una sola cuota.',
    highlight: null,
    color: 'bg-orange-500',
    example: 'Ej: Una cuota de 1,100€',
    pros: ['Sin cuotas mensuales'],
    cons: ['Requiere gran liquidez final'],
  },
]

export function LoanTypeSelector({ onSelect, selected }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {LOAN_TYPES.map((type) => {
        const Icon = type.icon
        const isSelected = selected === type.id

        return (
          <Card
            key={type.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              isSelected ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onSelect(type.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${type.color} bg-opacity-10`}>
                  <Icon className={`h-6 w-6 ${type.color.replace('bg-', 'text-')}`} />
                </div>
                {type.highlight && (
                  <Badge variant="secondary" className="text-xs">
                    {type.highlight}
                  </Badge>
                )}
              </div>

              <h3 className="font-semibold text-lg mb-2">{type.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{type.description}</p>
              <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">{type.example}</p>

              <div className="mt-4 space-y-2">
                <div>
                  <p className="text-xs font-medium text-green-700">Ventajas:</p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                    {type.pros.map((pro, i) => (
                      <li key={i}>{pro}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium text-orange-700">Desventajas:</p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                    {type.cons.map((con, i) => (
                      <li key={i}>{con}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
```

---

## 📊 COMPARATIVA DE TIPOS DE PRÉSTAMO (PARA EL CLIENTE)

### Ejemplo con 1,000€ a 10 meses al 1% mensual:

| Tipo | Cuota 1 | Cuota 5 | Cuota 10 | Total Intereses | Total a Pagar |
|------|---------|---------|----------|-----------------|---------------|
| **AMERICANO** 🏆 | 10€ | 10€ | **1,010€** | 100€ | 1,100€ |
| **FRANCÉS** | 105.58€ | 105.58€ | 105.58€ | 55.80€ | 1,055.80€ |
| **ALEMÁN** | 110€ | 105€ | 101€ | 55€ | 1,055€ |
| **SIMPLE** | 0€ | 0€ | **1,100€** | 100€ | 1,100€ |

**✅ Recomendación para el cliente:** Usar **AMERICANO** como predeterminado (99% de los casos)

---

## ⏱️ ESTIMACIÓN DE IMPLEMENTACIÓN

### Sprint 1 (8 horas):
- ✅ Actualizar schema con `AmortizationType`
- ✅ Crear funciones de cálculo para AMERICANO, FRANCÉS, ALEMÁN
- ✅ Actualizar `loanService` para soportar tipos
- ✅ Testing unitario

### Sprint 2 (8 horas):
- ✅ Componente `LoanTypeSelector`
- ✅ Actualizar formulario de creación de préstamos
- ✅ Vista previa de cronograma en tiempo real
- ✅ Testing de integración

### Sprint 3 (6 horas):
- ✅ Servicio de generación de contratos PDF
- ✅ Servicio de envío de emails
- ✅ API endpoints para contratos
- ✅ Testing E2E

### Sprint 4 (6 horas):
- ✅ Campo de garantes mejorado
- ✅ Configuración de días de pago
- ✅ Exportación de cronograma a Excel
- ✅ UI polish

**Total: 28 horas = ~4 días de desarrollo**

---

## 🎯 PRIORIDADES INMEDIATAS

### 🔴 CRÍTICO (Esta semana):
1. Implementar préstamo tipo AMERICANO
2. Generación de contratos PDF
3. Actualizar formulario de creación

### 🟠 IMPORTANTE (Próxima semana):
4. Préstamo tipo FRANCÉS y ALEMÁN
5. Envío de emails automáticos
6. Campo de garantes mejorado

### 🟡 NICE TO HAVE (Cuando haya tiempo):
7. Exportación avanzada a Excel
8. Configuración de días de pago
9. Calculadora interactiva en simulador

---

## 📝 NOTAS FINALES

**Para el cliente:**
- El sistema actual tiene 5 tipos de préstamos, pero usa principalmente AMERICANO (99%)
- LendCore debe priorizar la experiencia del préstamo americano
- Mantener compatibilidad con otros tipos para casos excepcionales

**Ventajas de nuestra implementación:**
- ✅ Cálculo automático (no botón "Calcular")
- ✅ Preview en tiempo real del cronograma
- ✅ Comparador visual de tipos de préstamo
- ✅ Contratos generados automáticamente
- ✅ Emails enviados sin intervención manual

**Próximo paso:**
¿Empezamos con la implementación del préstamo americano?
