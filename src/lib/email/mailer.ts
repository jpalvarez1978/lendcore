import nodemailer from 'nodemailer'
import { BRAND, BRAND_COLORS } from '@/lib/constants/brand'

/**
 * Configuración del servidor SMTP
 *
 * IMPORTANTE: Configura las variables de entorno en .env.local:
 *
 * SMTP_HOST=smtp.gmail.com
 * SMTP_PORT=587
 * SMTP_USER=tu-email@gmail.com
 * SMTP_PASS=tu-contraseña-de-app
 * SMTP_FROM=JEAN PAUL Servicios Financieros <noreply@tu-dominio.com>
 */

// Crear transportador reutilizable
const createTransporter = () => {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || '587')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    console.warn('⚠️  SMTP no configurado. Los emails no se enviarán.')
    console.warn('   Configura SMTP_HOST, SMTP_USER, SMTP_PASS en .env.local')
    return null
  }

  return nodemailer.createTransporter({
    host,
    port,
    secure: port === 465, // true para 465, false para otros puertos
    auth: {
      user,
      pass,
    },
  })
}

export interface EmailOptions {
  to: string
  subject: string
  text: string
  html?: string
  attachments?: Array<{
    filename: string
    content: Buffer
    contentType?: string
  }>
}

/**
 * Enviar email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const transporter = createTransporter()

  if (!transporter) {
    console.log('📧 [MODO DEMO] Email no enviado (SMTP no configurado):')
    console.log(`   Para: ${options.to}`)
    console.log(`   Asunto: ${options.subject}`)
    return false
  }

  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER

    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
      attachments: options.attachments,
    })

    console.log('✅ Email enviado:', info.messageId)
    return true
  } catch (error) {
    console.error('❌ Error enviando email:', error)
    return false
  }
}

/**
 * Enviar recibo de pago por email
 */
export async function sendPaymentReceipt(
  to: string,
  clientName: string,
  loanNumber: string,
  amount: number,
  pdfBuffer: Buffer
): Promise<boolean> {
  const subject = `Recibo de Pago - Préstamo ${loanNumber}`

  const text = `
Estimado/a ${clientName},

Adjunto encontrará el recibo de su pago realizado por el monto de €${amount.toFixed(2)}.

Préstamo: ${loanNumber}
Fecha: ${new Date().toLocaleDateString('es-ES')}

Gracias por su pago.

Atentamente,
${BRAND.name}
  `.trim()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, ${BRAND_COLORS.navy} 0%, ${BRAND_COLORS.navySoft} 72%, ${BRAND_COLORS.goldDeep} 100%); color: white; padding: 20px; text-align: center; border-radius: 18px; }
    .content { background-color: #f9fafb; padding: 20px; margin-top: 20px; }
    .detail { margin: 10px 0; }
    .label { font-weight: bold; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Recibo de Pago</h1>
    </div>
    <div class="content">
      <p>Estimado/a <strong>${clientName}</strong>,</p>
      <p>Adjunto encontrará el recibo de su pago realizado.</p>

      <div class="detail">
        <span class="label">Préstamo:</span> ${loanNumber}
      </div>
      <div class="detail">
        <span class="label">Monto Pagado:</span> €${amount.toFixed(2)}
      </div>
      <div class="detail">
        <span class="label">Fecha:</span> ${new Date().toLocaleDateString('es-ES')}
      </div>

      <p style="margin-top: 20px;">Gracias por su pago.</p>
    </div>
    <div class="footer">
      <p>Este es un mensaje automático del sistema ${BRAND.name}.</p>
      <p>Por favor, no responda a este correo.</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  return await sendEmail({
    to,
    subject,
    text,
    html,
    attachments: [
      {
        filename: `recibo-${loanNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  })
}
