import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { BRAND, BRAND_COLORS } from '@/lib/constants/brand'
import { hasPermission } from '@/lib/constants/permissions'
import { prisma } from '@/lib/prisma'
import { decryptSafe } from '@/lib/security/encryption'
import { permissionDeniedResponse } from '@/lib/security/apiRouteUtils'
import { withExportRateLimit } from '@/lib/security/rateLimitMiddleware'
import { getClientIP } from '@/lib/security/rateLimiter'
import { SecurityService } from '@/services/securityService'

const COLORS = {
  page: BRAND_COLORS.ivory,
  surface: '#FFFFFF',
  surfaceMuted: '#FBF7F0',
  border: BRAND_COLORS.line,
  ink: BRAND_COLORS.ink,
  muted: BRAND_COLORS.muted,
  accent: BRAND_COLORS.navy,
  accentSoft: BRAND_COLORS.goldSoft,
  accentDark: BRAND_COLORS.navySoft,
  successBg: BRAND_COLORS.successSoft,
  successText: BRAND_COLORS.success,
}

interface PdfTextOptions {
  align?: 'left' | 'center' | 'right' | 'justify'
  characterSpacing?: number
  lineGap?: number
  width?: number
}

interface PdfDocumentLike {
  page: {
    width: number
    height: number
  }
  circle(x: number, y: number, radius: number): PdfDocumentLike
  end(): void
  fill(color?: string): PdfDocumentLike
  fillAndStroke(fillColor: string, strokeColor: string): PdfDocumentLike
  fillColor(color: string): PdfDocumentLike
  font(fontName: string): PdfDocumentLike
  fontSize(size: number): PdfDocumentLike
  heightOfString(text: string, options?: PdfTextOptions): number
  lineTo(x: number, y: number): PdfDocumentLike
  lineWidth(width: number): PdfDocumentLike
  moveTo(x: number, y: number): PdfDocumentLike
  on(event: 'data', handler: (chunk: Uint8Array) => void): PdfDocumentLike
  on(event: 'end', handler: () => void): PdfDocumentLike
  on(event: 'error', handler: (error: unknown) => void): PdfDocumentLike
  rect(x: number, y: number, width: number, height: number): PdfDocumentLike
  restore(): PdfDocumentLike
  roundedRect(x: number, y: number, width: number, height: number, radius: number): PdfDocumentLike
  save(): PdfDocumentLike
  stroke(): PdfDocumentLike
  strokeColor(color: string): PdfDocumentLike
  text(text: string, x?: number, y?: number, options?: PdfTextOptions): PdfDocumentLike
  widthOfString(text: string): number
}

function formatCurrency(amount: number) {
  return `${amount.toFixed(2)}€`
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString('es-ES')
}

function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleString('es-ES')
}

function paymentMethodLabel(method: string) {
  switch (method) {
    case 'CASH':
      return 'Efectivo'
    case 'BANK_TRANSFER':
      return 'Transferencia'
    case 'CARD':
      return 'Tarjeta'
    case 'CHECK':
      return 'Cheque'
    default:
      return method
  }
}

function allocationLabel(type: string) {
  switch (type) {
    case 'PRINCIPAL':
      return 'Capital'
    case 'INTEREST':
      return 'Interés'
    case 'PENALTY':
      return 'Mora'
    default:
      return type
  }
}

function buildReceiptNumber(loanNumber: string, sequence: number) {
  return `REC-${loanNumber}-${sequence.toString().padStart(3, '0')}`
}

interface ReceiptItem {
  label: string
  value: string
  wrap?: boolean
  maxLines?: number
}

const INFO_CARD_LABEL_WIDTH = 86
const INFO_CARD_VALUE_FONT_SIZE = 10.25
const INFO_CARD_LINE_GAP = 1

function truncateText(doc: PdfDocumentLike, text: string, width: number) {
  if (doc.widthOfString(text) <= width) {
    return text
  }

  let candidate = text

  while (candidate.length > 1 && doc.widthOfString(`${candidate}...`) > width) {
    candidate = candidate.slice(0, -1)
  }

  return `${candidate.trimEnd()}...`
}

function getValueLineHeight(doc: PdfDocumentLike, width: number) {
  doc.font('Helvetica').fontSize(INFO_CARD_VALUE_FONT_SIZE)
  return doc.heightOfString('Ag', {
    width,
    lineGap: INFO_CARD_LINE_GAP,
  })
}

function clampWrappedText(
  doc: PdfDocumentLike,
  text: string,
  width: number,
  maxLines: number
) {
  const maxHeight = getValueLineHeight(doc, width) * maxLines + 0.5

  if (
    doc.heightOfString(text, {
      width,
      lineGap: INFO_CARD_LINE_GAP,
    }) <= maxHeight
  ) {
    return text
  }

  let candidate = text

  while (
    candidate.length > 1 &&
    doc.heightOfString(`${candidate}...`, {
      width,
      lineGap: INFO_CARD_LINE_GAP,
    }) > maxHeight
  ) {
    candidate = candidate.slice(0, -1)
  }

  return `${candidate.trimEnd()}...`
}

function getRenderedItemValue(doc: PdfDocumentLike, item: ReceiptItem, width: number) {
  doc.font('Helvetica').fontSize(INFO_CARD_VALUE_FONT_SIZE)

  if (item.wrap) {
    if (item.maxLines) {
      return clampWrappedText(doc, item.value, width, item.maxLines)
    }

    return item.value
  }

  return truncateText(doc, item.value, width)
}

function measureItemValueHeight(doc: PdfDocumentLike, item: ReceiptItem, width: number) {
  const value = getRenderedItemValue(doc, item, width)

  doc.font('Helvetica').fontSize(INFO_CARD_VALUE_FONT_SIZE)

  return doc.heightOfString(value, {
    width,
    lineGap: INFO_CARD_LINE_GAP,
  })
}

function drawCard(doc: PdfDocumentLike, x: number, y: number, width: number, height: number, fill: string) {
  doc
    .save()
    .roundedRect(x, y, width, height, 18)
    .fillAndStroke(fill, COLORS.border)
    .restore()
}

function drawTag(
  doc: PdfDocumentLike,
  x: number,
  y: number,
  text: string,
  fill: string,
  textColor: string
) {
  doc.font('Helvetica-Bold').fontSize(10)
  const textWidth = doc.widthOfString(text)
  const tagWidth = textWidth + 22

  doc
    .save()
    .roundedRect(x, y, tagWidth, 24, 12)
    .fill(fill)
    .restore()

  doc
    .fillColor(textColor)
    .text(text, x + 11, y + 7, {
      width: textWidth,
      align: 'center',
    })
}

function measureInfoCardHeight(doc: PdfDocumentLike, width: number, items: ReceiptItem[]) {
  const valueWidth = width - 40 - INFO_CARD_LABEL_WIDTH
  let height = 54

  for (const item of items) {
    height += Math.max(12, measureItemValueHeight(doc, item, valueWidth)) + 8
  }

  return Math.max(112, height)
}

function drawInfoCard(
  doc: PdfDocumentLike,
  {
    x,
    y,
    width,
    height,
    title,
    items,
  }: {
    x: number
    y: number
    width: number
    height: number
    title: string
    items: ReceiptItem[]
  }
) {
  drawCard(doc, x, y, width, height, COLORS.surface)

  doc
    .fillColor(COLORS.muted)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text(title.toUpperCase(), x + 20, y + 18, { characterSpacing: 1.1 })

  let currentY = y + 40
  const labelWidth = INFO_CARD_LABEL_WIDTH
  const valueWidth = width - 40 - labelWidth

  for (const item of items) {
    const value = getRenderedItemValue(doc, item, valueWidth)
    const valueHeight = Math.max(12, measureItemValueHeight(doc, item, valueWidth))

    doc
      .fillColor(COLORS.muted)
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(item.label.toUpperCase(), x + 20, currentY + 1, {
        characterSpacing: 0.8,
        width: labelWidth - 6,
      })

    doc
      .fillColor(COLORS.ink)
      .font('Helvetica')
      .fontSize(INFO_CARD_VALUE_FONT_SIZE)
      .text(value, x + 20 + labelWidth, currentY, {
        width: valueWidth,
        lineGap: INFO_CARD_LINE_GAP,
      })

    currentY += valueHeight + 8
  }
}

function drawHeaderCard(
  doc: PdfDocumentLike,
  {
    x,
    y,
    width,
    receiptNumber,
    amount,
    paymentMethod,
    paidAt,
  }: {
    x: number
    y: number
    width: number
    receiptNumber: string
    amount: number
    paymentMethod: string
    paidAt: Date
  }
) {
  const height = 126
  drawCard(doc, x, y, width, height, COLORS.surface)

  doc
    .save()
    .roundedRect(x, y, width, 10, 18)
    .fill(COLORS.accent)
    .restore()

  doc
    .save()
    .circle(x + 34, y + 42, 18)
    .fill(COLORS.accentSoft)
    .restore()

  doc
    .fillColor(COLORS.accentDark)
    .font('Helvetica-Bold')
    .fontSize(12)
    .text(BRAND.monogram, x + 24, y + 35, {
      width: 20,
      align: 'center',
    })

  doc
    .fillColor(COLORS.muted)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text(BRAND.name.toUpperCase(), x + 62, y + 24, { characterSpacing: 1.1 })

  doc
    .fillColor(COLORS.ink)
    .font('Helvetica-Bold')
    .fontSize(29)
    .text('RECIBO DE PAGO', x + 24, y + 50)

  doc
    .fillColor(COLORS.muted)
    .font('Helvetica')
    .fontSize(10)
    .text('Comprobante claro, compacto y listo para compartir.', x + 24, y + 82)

  drawTag(doc, x + 24, y + 96, receiptNumber, COLORS.accentSoft, COLORS.accentDark)

  const panelWidth = 188
  const panelHeight = 90
  const panelX = x + width - panelWidth - 22
  const panelY = y + 22

  doc
    .save()
    .roundedRect(panelX, panelY, panelWidth, panelHeight, 20)
    .fill(COLORS.accent)
    .restore()

  doc
    .fillColor(BRAND_COLORS.goldSoft)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text('MONTO RECIBIDO', panelX + 18, panelY + 18, { characterSpacing: 1 })

  doc
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .fontSize(24)
    .text(formatCurrency(amount), panelX + 18, panelY + 34, {
      width: panelWidth - 36,
    })

  doc
    .fillColor('#CCFBF1')
    .font('Helvetica')
    .fontSize(9)
    .text(paymentMethod, panelX + 18, panelY + 66)

  doc
    .font('Helvetica')
    .fontSize(9)
    .text(formatDate(paidAt), panelX + 18, panelY + 78)

  return height
}

function drawAllocationCard(
  doc: PdfDocumentLike,
  {
    x,
    y,
    width,
    height,
    title,
    allocations,
    totalAmount,
  }: {
    x: number
    y: number
    width: number
    height: number
    title: string
    allocations: Array<{ label: string; amount: number }>
    totalAmount: number
  }
) {
  drawCard(doc, x, y, width, height, COLORS.surface)

  doc
    .fillColor(COLORS.muted)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text(title.toUpperCase(), x + 20, y + 18, { characterSpacing: 1.1 })

  let currentY = y + 40
  const barWidth = width - 40

  if (allocations.length === 0) {
    doc
      .fillColor(COLORS.muted)
      .font('Helvetica')
      .fontSize(10.5)
      .text('No hay desglose disponible para este pago.', x + 20, currentY)
    return
  }

  for (const allocation of allocations) {
    const ratio = totalAmount > 0 ? allocation.amount / totalAmount : 0
    const filledWidth = Math.max(8, barWidth * ratio)

    doc
      .fillColor(COLORS.ink)
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .text(allocation.label, x + 20, currentY)

    doc
      .fillColor(COLORS.ink)
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .text(formatCurrency(allocation.amount), x + 20, currentY, {
        width: barWidth,
        align: 'right',
      })

    currentY += 15

    doc
      .save()
      .roundedRect(x + 20, currentY, barWidth, 8, 4)
      .fill(COLORS.surfaceMuted)
      .restore()

    doc
      .save()
      .roundedRect(x + 20, currentY, Math.min(filledWidth, barWidth), 8, 4)
      .fill(COLORS.accent)
      .restore()

    currentY += 18
  }
}

function drawPendingCard(
  doc: PdfDocumentLike,
  {
    x,
    y,
    width,
    totalPending,
    pendingInstallments,
  }: {
    x: number
    y: number
    width: number
    totalPending: number
    pendingInstallments: Array<{ installmentNumber: number; dueDate: Date; pendingAmount: number }>
  }
) {
  const isSettled = totalPending <= 0
  const fill = isSettled ? COLORS.successBg : COLORS.surface
  const valueColor = isSettled ? COLORS.successText : COLORS.ink
  const note = isSettled
    ? 'Préstamo liquidado en su totalidad.'
    : `${pendingInstallments.length} cuota(s) aún mantienen saldo pendiente.`

  drawCard(doc, x, y, width, 86, fill)

  doc
    .fillColor(COLORS.muted)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text('SALDO PENDIENTE', x + 20, y + 18, { characterSpacing: 1.1 })

  doc
    .fillColor(valueColor)
    .font('Helvetica-Bold')
    .fontSize(22)
    .text(formatCurrency(totalPending), x + 20, y + 34)

  doc
    .fillColor(COLORS.muted)
    .font('Helvetica')
    .fontSize(10)
    .text(note, x + 190, y + 38, {
      width: width - 210,
    })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!hasPermission(session.user.role, 'PAYMENTS_VIEW')) {
      return permissionDeniedResponse(
        request,
        session,
        'api/payments/[id]/receipt',
        'PAYMENTS_VIEW'
      )
    }

    const rateLimitResponse = await withExportRateLimit(request, session.user.id)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { id } = await params
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        loan: {
          include: {
            client: {
              include: {
                individualProfile: true,
                businessProfile: true,
              },
            },
            installments: { orderBy: { installmentNumber: 'asc' } },
          },
        },
        allocations: true,
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }

    const loanPayments = await prisma.payment.findMany({
      where: { loanId: payment.loanId },
      select: { id: true },
      orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    })

    const paymentSequence = loanPayments.findIndex(item => item.id === payment.id) + 1
    const receiptNumber = buildReceiptNumber(
      payment.loan.loanNumber,
      paymentSequence > 0 ? paymentSequence : 1
    )

    const pendingInstallments = payment.loan.installments.filter(
      installment => installment.status !== 'PAID'
    )
    const totalPending = pendingInstallments.reduce(
      (sum, installment) => sum + Number(installment.pendingAmount),
      0
    )

    const clientName =
      payment.loan.client.type === 'INDIVIDUAL'
        ? `${payment.loan.client.individualProfile?.firstName} ${payment.loan.client.individualProfile?.lastName}`
        : payment.loan.client.businessProfile?.businessName || 'Cliente'

    const taxId =
      payment.loan.client.type === 'INDIVIDUAL'
        ? payment.loan.client.individualProfile?.taxId
        : payment.loan.client.businessProfile?.taxId

    const clientItems: ReceiptItem[] = [
      { label: 'Cliente', value: clientName, wrap: true },
      { label: 'DNI / CIF', value: taxId ? decryptSafe(taxId) : 'N/A' },
      { label: 'Teléfono', value: decryptSafe(payment.loan.client.phone) },
    ]

    if (payment.loan.client.email) {
      clientItems.push({
        label: 'Email',
        value: decryptSafe(payment.loan.client.email),
        wrap: true,
        maxLines: 2,
      })
    }

    if (payment.loan.client.address) {
      clientItems.push({
        label: 'Dirección',
        value: decryptSafe(payment.loan.client.address),
        wrap: true,
      })
    }

    const loanItems: ReceiptItem[] = [
      { label: 'Número de préstamo', value: payment.loan.loanNumber },
      {
        label: 'Principal original',
        value: formatCurrency(Number(payment.loan.principalAmount)),
      },
      {
        label: 'Tasa de interés',
        value: `${Number(payment.loan.interestRate)}%`,
      },
      {
        label: 'Plazo',
        value: `${payment.loan.termMonths} meses`,
      },
    ]

    const paymentItems: ReceiptItem[] = [
      { label: 'Comprobante', value: receiptNumber, wrap: true },
      { label: 'Monto abonado', value: formatCurrency(Number(payment.amount)) },
      { label: 'Método', value: paymentMethodLabel(payment.paymentMethod) },
      { label: 'Fecha y hora', value: formatDateTime(payment.paidAt) },
      {
        label: 'Aplicación',
        value: 'Distribución automática sobre el cronograma del préstamo',
        wrap: true,
        maxLines: 2,
      },
    ]

    if (payment.reference) {
      paymentItems.push({
        label: 'Referencia',
        value: payment.reference,
      })
    }

    if (payment.notes) {
      paymentItems.push({
        label: 'Notas',
        value: payment.notes,
      })
    }

    const allocationItems = payment.allocations.map(allocation => ({
      label: allocationLabel(allocation.type),
      amount: Number(allocation.amount),
    }))

    const { default: PDFDocument } = await import('@react-pdf/pdfkit')

    const doc = new PDFDocument({
      margin: 40,
      size: 'A4',
    }) as PdfDocumentLike

    const chunks: Buffer[] = []
    const pdfReady = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk: Uint8Array) => chunks.push(Buffer.from(chunk)))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
    })

    doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.page)

    const pageMargin = 40
    const contentWidth = doc.page.width - pageMargin * 2
    const columnGap = 16
    const columnWidth = (contentWidth - columnGap) / 2
    let currentY = 40

    currentY += drawHeaderCard(doc, {
      x: pageMargin,
      y: currentY,
      width: contentWidth,
      receiptNumber,
      amount: Number(payment.amount),
      paymentMethod: paymentMethodLabel(payment.paymentMethod),
      paidAt: payment.paidAt,
    })

    currentY += 16

    const clientCardHeight = measureInfoCardHeight(doc, columnWidth, clientItems)
    const loanCardHeight = measureInfoCardHeight(doc, columnWidth, loanItems)
    const firstRowHeight = Math.max(clientCardHeight, loanCardHeight)

    drawInfoCard(doc, {
      x: pageMargin,
      y: currentY,
      width: columnWidth,
      height: firstRowHeight,
      title: 'Cliente',
      items: clientItems,
    })

    drawInfoCard(doc, {
      x: pageMargin + columnWidth + columnGap,
      y: currentY,
      width: columnWidth,
      height: firstRowHeight,
      title: 'Préstamo',
      items: loanItems,
    })

    currentY += firstRowHeight + 16

    const paymentCardHeight = measureInfoCardHeight(doc, columnWidth, paymentItems)
    const allocationCardHeight = Math.max(112, 48 + allocationItems.length * 32)
    const secondRowHeight = Math.max(paymentCardHeight, allocationCardHeight)

    drawInfoCard(doc, {
      x: pageMargin,
      y: currentY,
      width: columnWidth,
      height: secondRowHeight,
      title: 'Pago',
      items: paymentItems,
    })

    drawAllocationCard(doc, {
      x: pageMargin + columnWidth + columnGap,
      y: currentY,
      width: columnWidth,
      height: secondRowHeight,
      title: 'Distribución',
      allocations: allocationItems,
      totalAmount: Number(payment.amount),
    })

    currentY += secondRowHeight + 16

    drawPendingCard(doc, {
      x: pageMargin,
      y: currentY,
      width: contentWidth,
      totalPending,
      pendingInstallments: pendingInstallments.map(installment => ({
        installmentNumber: installment.installmentNumber,
        dueDate: installment.dueDate,
        pendingAmount: Number(installment.pendingAmount),
      })),
    })

    const footerY = currentY + 100

    doc
      .moveTo(pageMargin, footerY)
      .lineTo(pageMargin + contentWidth, footerY)
      .lineWidth(1)
      .strokeColor(COLORS.border)
      .stroke()

    doc
      .fillColor(COLORS.muted)
      .font('Helvetica')
      .fontSize(8.5)
      .text(`Número de comprobante: ${receiptNumber}`, pageMargin, footerY + 14)

    doc
      .text(`Emitido: ${formatDateTime(new Date())}`, pageMargin, footerY + 26)

    doc
      .text(
        BRAND.documentFooter,
        pageMargin,
        footerY + 42,
        {
          width: contentWidth,
        }
      )

    doc.end()

    const pdfBuffer = await pdfReady
    const pdfBytes = new Uint8Array(pdfBuffer)

    await SecurityService.logMassExport(
      session.user.id,
      session.user.email || 'usuario@desconocido.local',
      getClientIP(request),
      1,
      'payment-receipt-pdf'
    )

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="recibo-${receiptNumber}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('Error generating receipt:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error al generar recibo',
      },
      { status: 500 }
    )
  }
}
