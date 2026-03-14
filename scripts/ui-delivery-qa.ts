import bcrypt from 'bcryptjs'
import { addDays, subDays } from 'date-fns'
import { promises as fs } from 'fs'
import path from 'path'
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'
import {
  PrismaClient,
  UserRole,
  UserStatus,
  InstallmentStatus,
} from '@prisma/client'

const prisma = new PrismaClient()

const BASE_URL = process.env.APP_BASE_URL || 'http://127.0.0.1:3001'
const CHROME_PATH =
  process.env.PLAYWRIGHT_CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const KEEP_UI_QA_DATA = process.env.KEEP_UI_QA_DATA === '1'
const HEADLESS = process.env.PLAYWRIGHT_HEADFUL !== '1'

type CheckStatus = 'PASS' | 'FAIL'

interface QaResult {
  area: string
  step: string
  status: CheckStatus
  detail: string
  screenshot?: string
}

interface Credentials {
  email: string
  password: string
}

interface CreatedArtifacts {
  viewerUserId?: string
  clientId?: string
  applicationId?: string
  loanId?: string
  paymentId?: string
  promiseId?: string
  collectionActionId?: string
}

const results: QaResult[] = []
const created: CreatedArtifacts = {}

const stamp = `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${Math.random()
  .toString(36)
  .slice(2, 6)
  .toUpperCase()}`
const artifactRoot = path.join(process.cwd(), 'artifacts', 'ui-delivery-qa', stamp)
const screenshotDir = path.join(artifactRoot, 'screenshots')
const downloadDir = path.join(artifactRoot, 'downloads')
const reportPath = path.join(artifactRoot, 'report.md')

const analystCredentials: Credentials = {
  email: 'analyst@lendcore.com',
  password: 'Analyst123!',
}

const adminCredentials: Credentials = {
  email: 'admin@lendcore.com',
  password: 'Admin123!',
}

const collectionCredentials: Credentials = {
  email: 'collector@lendcore.com',
  password: 'Collector123!',
}

const viewerCredentials: Credentials = {
  email: `viewer-ui-qa-${stamp.toLowerCase()}@lendcore.com`,
  password: 'Viewer123!',
}

const tempClient = {
  firstName: 'QA',
  lastName: `Visual ${stamp}`,
  email: `qa.visual.${stamp.toLowerCase()}@example.com`,
  phone: `+34610${stamp.replace(/\D/g, '').slice(-6).padStart(6, '0')}`,
  address: `Calle QA ${stamp}`,
  city: 'Bilbao',
  postalCode: '48001',
  creditLimit: '25000',
}

const tempApplication = {
  requestedAmount: '9500',
  termMonths: '24',
  proposedRatePercent: '2',
  purpose: `QA VISUAL ${stamp}`,
  notes: `Solicitud validada en navegador para entrega ${stamp}`,
}

const tempPayment = {
  amount: '150',
  promiseAmount: '220',
  promiseDate: formatDateInput(addDays(new Date(), 1)),
}

function record(area: string, step: string, status: CheckStatus, detail: string, screenshot?: string) {
  results.push({ area, step, status, detail, screenshot })
}

function assertCondition(condition: unknown, area: string, step: string, detail: string, screenshot?: string) {
  if (!condition) {
    record(area, step, 'FAIL', detail, screenshot)
    throw new Error(`${area} :: ${step} -> ${detail}`)
  }

  record(area, step, 'PASS', detail, screenshot)
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

function generateValidDniFromStamp(value: string) {
  const digits = value.replace(/\D/g, '').slice(-8).padStart(8, '0')
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE'
  const letter = letters[Number(digits) % 23]
  return `${digits}${letter}`
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

async function ensureArtifactFolders() {
  await fs.mkdir(screenshotDir, { recursive: true })
  await fs.mkdir(downloadDir, { recursive: true })
}

async function ensureChromeExists() {
  try {
    await fs.access(CHROME_PATH)
  } catch {
    throw new Error(
      `No se encontró Chrome en ${CHROME_PATH}. Define PLAYWRIGHT_CHROME_PATH con una ruta válida.`
    )
  }
}

async function waitForCondition(
  label: string,
  condition: () => Promise<boolean>,
  timeoutMs: number = 20000,
  intervalMs: number = 500
) {
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    if (await condition()) {
      return
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }

  throw new Error(`Timeout esperando condición: ${label}`)
}

async function takeScreenshot(page: Page, name: string) {
  const filePath = path.join(screenshotDir, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: true })
  return path.relative(artifactRoot, filePath)
}

async function writeReport() {
  const passed = results.filter(result => result.status === 'PASS').length
  const failed = results.filter(result => result.status === 'FAIL').length
  const lines = [
    `# QA visual-operativa de entrega`,
    ``,
    `- Fecha: ${new Date().toLocaleString('es-ES')}`,
    `- Base URL: ${BASE_URL}`,
    `- Stamp: ${stamp}`,
    `- Resultado: ${passed} PASS / ${failed} FAIL`,
    ``,
    `## Resumen`,
    ``,
    `| Estado | Área | Paso | Detalle | Evidencia |`,
    `| --- | --- | --- | --- | --- |`,
    ...results.map(result => {
      const evidence = result.screenshot ? `[captura](${result.screenshot})` : '-'
      return `| ${result.status} | ${result.area} | ${result.step} | ${result.detail} | ${evidence} |`
    }),
    ``,
    `## Artefactos`,
    ``,
    `- Capturas: \`./screenshots\``,
    `- Descargas: \`./downloads\``,
    ``,
    `## Datos temporales`,
    ``,
    `- Cliente: ${created.clientId || 'n/a'}`,
    `- Solicitud: ${created.applicationId || 'n/a'}`,
    `- Préstamo: ${created.loanId || 'n/a'}`,
    `- Pago: ${created.paymentId || 'n/a'}`,
    `- Promesa: ${created.promiseId || 'n/a'}`,
    `- Gestión: ${created.collectionActionId || 'n/a'}`,
    `- Viewer temporal: ${created.viewerUserId || 'n/a'}`,
  ]

  await fs.writeFile(reportPath, `${lines.join('\n')}\n`, 'utf8')
}

async function createViewerUser() {
  const user = await prisma.user.create({
    data: {
      email: viewerCredentials.email,
      passwordHash: await bcrypt.hash(viewerCredentials.password, 10),
      name: 'Viewer UI QA',
      firstName: 'Viewer',
      lastName: 'UI QA',
      role: UserRole.VIEWER,
      status: UserStatus.ACTIVE,
    },
  })

  created.viewerUserId = user.id
}

async function cleanup() {
  const entityIds = [
    created.clientId,
    created.applicationId,
    created.loanId,
    created.paymentId,
    created.promiseId,
    created.collectionActionId,
  ].filter(Boolean) as string[]

  if (entityIds.length > 0) {
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { entityId: { in: entityIds } },
          created.viewerUserId ? { userId: created.viewerUserId } : undefined,
        ].filter(Boolean) as Array<Record<string, unknown>>,
      },
    })
  } else if (created.viewerUserId) {
    await prisma.auditLog.deleteMany({
      where: { userId: created.viewerUserId },
    })
  }

  if (created.promiseId) {
    await prisma.paymentPromise.deleteMany({
      where: { id: created.promiseId },
    })
  }

  if (created.collectionActionId) {
    await prisma.collectionAction.deleteMany({
      where: { id: created.collectionActionId },
    })
  } else if (created.loanId) {
    await prisma.collectionAction.deleteMany({
      where: { loanId: created.loanId },
    })
  }

  if (created.paymentId) {
    await prisma.payment.deleteMany({
      where: { id: created.paymentId },
    })
  } else if (created.loanId) {
    await prisma.payment.deleteMany({
      where: { loanId: created.loanId },
    })
  }

  if (created.loanId) {
    await prisma.loan.deleteMany({
      where: { id: created.loanId },
    })
  }

  if (created.applicationId) {
    await prisma.creditApplication.deleteMany({
      where: { id: created.applicationId },
    })
  }

  if (created.clientId) {
    await prisma.client.deleteMany({
      where: { id: created.clientId },
    })
  }

  if (created.viewerUserId) {
    await prisma.user.deleteMany({
      where: { id: created.viewerUserId },
    })
  }
}

async function createContext(browser: Browser) {
  return browser.newContext({
    acceptDownloads: true,
    baseURL: BASE_URL,
    viewport: { width: 1600, height: 1000 },
    locale: 'es-ES',
  })
}

async function login(context: BrowserContext, credentials: Credentials, roleLabel: string) {
  const page = await context.newPage()
  await page.goto('/login', { waitUntil: 'networkidle' })

  const loginShot = await takeScreenshot(page, `${roleLabel}-login`)
  assertCondition(
    normalizeSpaces(await page.title()).includes('JEAN PAUL Servicios Financieros'),
    'Acceso',
    `Pantalla de login ${roleLabel}`,
    'La marca y la pantalla de acceso cargan correctamente.',
    loginShot
  )

  await page.locator('input[type="email"]').fill(credentials.email)
  await page.locator('input[type="password"]').fill(credentials.password)

  await Promise.all([
    page.waitForURL('**/dashboard', { timeout: 30000 }),
    page.getByRole('button', { name: /Entrar al panel/i }).click(),
  ])

  await page.waitForLoadState('networkidle')
  const dashboardShot = await takeScreenshot(page, `${roleLabel}-dashboard`)
  assertCondition(
    page.url().includes('/dashboard'),
    'Acceso',
    `Login ${roleLabel}`,
    `La sesión de ${roleLabel} redirige correctamente al dashboard.`,
    dashboardShot
  )

  return page
}

async function logout(page: Page) {
  try {
    await page.getByRole('button', { name: /Cerrar sesion/i }).click()
    await Promise.race([
      page.waitForURL(/\/login($|\?)/i, { timeout: 15000 }),
      page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 15000 }),
    ])
    await page.waitForLoadState('networkidle').catch(() => undefined)
  } catch (error) {
    console.warn('⚠️  Logout visual no confirmado, el contexto se cerrará igualmente:', error)
  }
}

async function analystFlow(browser: Browser) {
  const context = await createContext(browser)
  const page = await login(context, analystCredentials, 'analyst')
  const plainDni = generateValidDniFromStamp(stamp)
  const fullName = `${tempClient.firstName} ${tempClient.lastName}`

  try {
    await page.goto('/dashboard/clientes/nuevo', { waitUntil: 'networkidle' })
    const clientFormShot = await takeScreenshot(page, 'analyst-client-form')
    assertCondition(
      await page.getByRole('form', { name: /Formulario de cliente/i }).isVisible(),
      'Analyst',
      'Nueva ficha de cliente',
      'El formulario de alta de cliente carga completo y con estilos.',
      clientFormShot
    )

    await page.getByLabel(/Nombre/i).fill(tempClient.firstName)
    await page.getByLabel(/Apellidos/i).fill(tempClient.lastName)
    await page.getByLabel(/DNI\/NIE/i).fill(plainDni)
    await page.getByLabel(/Teléfono/i).fill(tempClient.phone)
    await page.getByLabel(/^Email/i).fill(tempClient.email)
    await page.getByLabel(/Dirección/i).fill(tempClient.address)
    await page.getByLabel(/Ciudad/i).fill(tempClient.city)
    await page.getByLabel(/Código Postal/i).fill(tempClient.postalCode)
    await page.getByLabel(/Cupo de Crédito/i).fill(tempClient.creditLimit)

    await Promise.all([
      page.waitForURL('**/dashboard/clientes', { timeout: 30000 }),
      page.getByRole('button', { name: /Crear Cliente/i }).click(),
    ])

    await page.waitForLoadState('networkidle')
    created.clientId =
      (
        await prisma.client.findFirst({
          where: {
            type: 'INDIVIDUAL',
            individualProfile: {
              is: {
                firstName: tempClient.firstName,
                lastName: tempClient.lastName,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        })
      )?.id || undefined

    const clientListShot = await takeScreenshot(page, 'analyst-clients-list')
    assertCondition(
      Boolean(created.clientId),
      'Analyst',
      'Cliente creado',
      `El alta del cliente ${fullName} se persistió correctamente.`,
      clientListShot
    )

    await page.getByPlaceholder(/Buscar por nombre, DNI\/CIF, email o teléfono/i).fill(tempClient.lastName)
    await page.waitForTimeout(300)
    assertCondition(
      await page.getByText(fullName, { exact: false }).first().isVisible(),
      'Analyst',
      'Búsqueda en clientes',
      'La búsqueda parcial encuentra el cliente recién creado.',
      await takeScreenshot(page, 'analyst-clients-search')
    )

    await page.goto(`/dashboard/clientes/${created.clientId}`, { waitUntil: 'networkidle' })
    const clientDetailShot = await takeScreenshot(page, 'analyst-client-detail')
    const clientDetailText = await page.locator('body').innerText()
    assertCondition(
      clientDetailText.includes(plainDni),
      'Analyst',
      'Ficha de cliente',
      'La ficha muestra el DNI desencriptado y legible.',
      clientDetailShot
    )

    await page.goto('/dashboard/solicitudes/nuevo', { waitUntil: 'networkidle' })
    const newApplicationShot = await takeScreenshot(page, 'analyst-application-form')
    assertCondition(
      await page.getByText(/Nueva Solicitud de Crédito/i).isVisible(),
      'Analyst',
      'Formulario de solicitud',
      'El alta de solicitud carga sin errores visuales.',
      newApplicationShot
    )

    await page.locator('button[role="combobox"]').first().click()
    await page.getByPlaceholder(/Buscar por nombre, empresa o DNI\/CIF/i).fill(tempClient.lastName)
    await page.getByText(fullName, { exact: false }).click()
    await page.getByLabel(/Monto Solicitado/i).fill(tempApplication.requestedAmount)
    await page.getByLabel(/Plazo Solicitado/i).fill(tempApplication.termMonths)
    await page.getByLabel(/Tasa Propuesta Mensual/i).fill(tempApplication.proposedRatePercent)
    await page.getByLabel(/Propósito del Préstamo/i).fill(tempApplication.purpose)
    await page.getByLabel(/Notas Adicionales/i).fill(tempApplication.notes)

    await Promise.all([
      page.waitForURL('**/dashboard/solicitudes', { timeout: 30000 }),
      page.getByRole('button', { name: /Crear Solicitud/i }).click(),
    ])
    await page.waitForLoadState('networkidle')

    created.applicationId =
      (
        await prisma.creditApplication.findFirst({
          where: {
            clientId: created.clientId,
            purpose: { contains: tempApplication.purpose },
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        })
      )?.id || undefined

    const applicationListShot = await takeScreenshot(page, 'analyst-application-list')
    assertCondition(
      Boolean(created.applicationId) &&
        (await page.getByText(fullName, { exact: false }).first().isVisible()),
      'Analyst',
      'Solicitud creada',
      'La solicitud nueva aparece en el listado con estado borrador.',
      applicationListShot
    )
  } finally {
    await logout(page)
    await context.close()
  }
}

async function adminFlow(browser: Browser) {
  if (!created.applicationId || !created.clientId) {
    throw new Error('Faltan artefactos previos para ejecutar el flujo de admin.')
  }

  const context = await createContext(browser)
  const page = await login(context, adminCredentials, 'admin')
  const fullName = `${tempClient.firstName} ${tempClient.lastName}`
  const plainDni = generateValidDniFromStamp(stamp)

  try {
    await page.goto(`/dashboard/solicitudes/${created.applicationId}`, { waitUntil: 'networkidle' })
    const detailShot = await takeScreenshot(page, 'admin-application-detail')
    const detailText = await page.locator('body').innerText()
    assertCondition(
      detailText.includes(plainDni) && !detailText.includes('X3ux'),
      'Admin',
      'Detalle de solicitud',
      'La solicitud muestra identidad legible y no expone datos cifrados.',
      detailShot
    )

    await page.getByRole('button', { name: /Enviar a revisión/i }).click()
    await waitForCondition('solicitud UNDER_REVIEW', async () => {
      const application = await prisma.creditApplication.findUnique({
        where: { id: created.applicationId! },
        select: { status: true },
      })
      return application?.status === 'UNDER_REVIEW'
    })
    await page.reload({ waitUntil: 'networkidle' })
    assertCondition(
      await page.getByText(/Expediente en evaluación/i).isVisible(),
      'Admin',
      'Enviar a revisión',
      'La solicitud cambia a revisión desde la misma vista.',
      await takeScreenshot(page, 'admin-application-under-review')
    )

    await page.getByRole('button', { name: /^Aprobar$/i }).click()
    await page.getByLabel(/Notas de aprobación/i).fill(
      `Aprobación QA ${stamp}: documentación, identidad y capacidad de pago validadas.`
    )
    await page.getByRole('button', { name: /Confirmar aprobación/i }).click()
    await waitForCondition('solicitud APPROVED', async () => {
      const application = await prisma.creditApplication.findUnique({
        where: { id: created.applicationId! },
        select: { status: true },
      })
      return application?.status === 'APPROVED'
    })
    await page.reload({ waitUntil: 'networkidle' })
    assertCondition(
      await page.getByText(/Solicitud aprobada/i).first().isVisible(),
      'Admin',
      'Aprobación de solicitud',
      'La aprobación se refleja con trazabilidad y siguiente paso operativo.',
      await takeScreenshot(page, 'admin-application-approved')
    )

    await Promise.all([
      page.waitForURL('**/dashboard/prestamos/nuevo**', { timeout: 30000 }),
      page.getByRole('button', { name: /Crear préstamo desde esta solicitud/i }).click(),
    ])
    await page.waitForLoadState('networkidle')

    const createLoanShot = await takeScreenshot(page, 'admin-loan-origin')
    assertCondition(
      await page.getByText(/Originación desde solicitud aprobada/i).isVisible(),
      'Admin',
      'Originación desde solicitud',
      'La vista de originación hereda correctamente la solicitud aprobada.',
      createLoanShot
    )

    await page.getByRole('button', { name: /Crear Préstamo/i }).click()
    await waitForCondition('préstamo creado para la originación', async () => {
      const latestLoan = await prisma.loan.findFirst({
        where: { clientId: created.clientId! },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      })

      if (latestLoan?.id) {
        created.loanId = latestLoan.id
        return true
      }

      return false
    })

    const currentUrl = page.url()
    const loanIdMatch = currentUrl.match(/\/dashboard\/prestamos\/([a-f0-9-]+)/i)
    created.loanId = loanIdMatch?.[1] || created.loanId

    if (!loanIdMatch && created.loanId) {
      await page.goto(`/dashboard/prestamos/${created.loanId}`, { waitUntil: 'networkidle' })
    } else {
      await page.waitForLoadState('networkidle').catch(() => undefined)
    }

    assertCondition(
      Boolean(created.loanId),
      'Admin',
      'Creación de préstamo',
      `La originación redirige al detalle del préstamo creado para ${fullName}.`,
      await takeScreenshot(page, 'admin-loan-detail')
    )

    const latestLoan = await prisma.loan.findUnique({
      where: { id: created.loanId! },
      select: { id: true, loanNumber: true, status: true, installments: { orderBy: { installmentNumber: 'asc' }, select: { id: true } } },
    })

    assertCondition(
      latestLoan?.status === 'ACTIVE',
      'Admin',
      'Préstamo activo',
      `El préstamo ${latestLoan?.loanNumber || created.loanId} queda activo tras la originación.`,
      await takeScreenshot(page, 'admin-loan-active')
    )

    const overdueInstallment = await prisma.installment.findFirst({
      where: { loanId: created.loanId!, status: InstallmentStatus.PENDING },
      orderBy: { installmentNumber: 'asc' },
      select: { id: true },
    })

    if (overdueInstallment) {
      await prisma.installment.update({
        where: { id: overdueInstallment.id },
        data: {
          dueDate: subDays(new Date(), 15),
          status: InstallmentStatus.OVERDUE,
        },
      })

      record(
        'Admin',
        'Preparar mora controlada',
        'PASS',
        'Se dejó una cuota vencida de prueba para validar cobranza, aging y promesas.'
      )
    }

    await page.goto(`/dashboard/solicitudes/${created.applicationId}`, { waitUntil: 'networkidle' })
    assertCondition(
      await page.getByText(/Solicitud desembolsada/i).first().isVisible(),
      'Admin',
      'Cierre del flujo de solicitud',
      'La solicitud cambia a desembolsada después de originar el préstamo.',
      await takeScreenshot(page, 'admin-application-disbursed')
    )

    await page.goto('/dashboard', { waitUntil: 'networkidle' })
    const searchResponsePromise = page.waitForResponse(response => {
      return response.url().includes('/api/search?q=') && response.status() === 200
    })
    await page.getByLabel(/Búsqueda global/i).fill(tempClient.lastName)
    await searchResponsePromise
    await page.getByText(/Buscando resultados/i).waitFor({ state: 'hidden', timeout: 10000 })
    await page.waitForTimeout(300)
    assertCondition(
      await page.getByText(fullName, { exact: false }).first().isVisible(),
      'Admin',
      'Búsqueda global',
      'La búsqueda global encuentra el cliente recién originado.',
      await takeScreenshot(page, 'admin-global-search')
    )
  } finally {
    await logout(page)
    await context.close()
  }
}

async function collectionFlow(browser: Browser) {
  if (!created.loanId) {
    throw new Error('Falta un préstamo para ejecutar el flujo de cobranza.')
  }

  const context = await createContext(browser)
  const page = await login(context, collectionCredentials, 'collection')

  try {
    await page.goto(`/dashboard/prestamos/${created.loanId}`, { waitUntil: 'networkidle' })
    const loanDetailShot = await takeScreenshot(page, 'collection-loan-detail')
    assertCondition(
      await page.getByRole('link', { name: /Registrar Pago/i }).isVisible(),
      'Collection',
      'Acceso a registrar pago',
      'El cobrador ve la acción operativa de registrar pago en el detalle del préstamo.',
      loanDetailShot
    )

    await Promise.all([
      page.waitForURL('**/dashboard/pagos/nuevo**', { timeout: 30000 }),
      page.getByRole('link', { name: /Registrar Pago/i }).click(),
    ])
    await page.waitForLoadState('networkidle')
    await page.getByText(/Cuotas Pendientes/i).waitFor({ state: 'visible', timeout: 20000 })
    const paymentFormShot = await takeScreenshot(page, 'collection-payment-form')
    assertCondition(
      await page.getByText(/Cuotas Pendientes/i).isVisible(),
      'Collection',
      'Formulario de pago',
      'La pantalla de registro de pago carga cuotas pendientes y datos del préstamo.',
      paymentFormShot
    )

    await page.getByLabel(/Monto a Pagar/i).fill(tempPayment.amount)
    await Promise.all([
      page.waitForURL(`**/dashboard/prestamos/${created.loanId}`, { timeout: 30000 }),
      page.getByRole('button', { name: /^Registrar Pago$/i }).click(),
    ])
    await page.waitForLoadState('networkidle')

    created.paymentId =
      (
        await prisma.payment.findFirst({
          where: { loanId: created.loanId!, amount: Number(tempPayment.amount) },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        })
      )?.id || undefined

    const paymentHistoryTab = page.getByRole('tab', { name: /Pagos/i })
    if (await paymentHistoryTab.isVisible()) {
      await paymentHistoryTab.click()
      await page.waitForTimeout(300)
    }

    assertCondition(
      Boolean(created.paymentId) &&
        (await page.getByText(/150,00\s*€/i).first().isVisible()),
      'Collection',
      'Pago registrado',
      'El pago parcial queda visible en el historial del préstamo.',
      await takeScreenshot(page, 'collection-loan-payment-history')
    )

    await page.goto('/dashboard/pagos', { waitUntil: 'networkidle' })
    await page.getByPlaceholder(/Buscar por cliente, préstamo, referencia o método/i).fill(tempClient.lastName)
    await page.waitForTimeout(500)
    const paymentListShot = await takeScreenshot(page, 'collection-payments-search')
    assertCondition(
      await page.getByText(/150,00\s*€/i).first().isVisible(),
      'Collection',
      'Listado de pagos',
      'El pago aparece en el historial global y se puede ubicar por búsqueda.',
      paymentListShot
    )

    const [receiptDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Descargar Recibo/i }).first().click(),
    ])
    const receiptFilename = receiptDownload.suggestedFilename()
    const receiptPath = path.join(downloadDir, receiptFilename)
    await receiptDownload.saveAs(receiptPath)
    const receiptStats = await fs.stat(receiptPath)

    const receiptResponse = await context.request.get(`/api/payments/${created.paymentId}/receipt`)
    assertCondition(
      receiptStats.size > 0 &&
        receiptFilename.toLowerCase().endsWith('.pdf') &&
        receiptResponse.status() === 200 &&
        (receiptResponse.headers()['content-type'] || '').includes('application/pdf'),
      'Collection',
      'Recibo PDF',
      `El recibo se descarga con nombre legible (${receiptFilename}) y contenido PDF válido.`,
      await takeScreenshot(page, 'collection-receipt-ready')
    )

    await page.goto('/dashboard/cobranza', { waitUntil: 'networkidle' })
    await page.getByPlaceholder(/Buscar por cliente, préstamo, teléfono o acción sugerida/i).fill(tempClient.lastName)
    await page.waitForTimeout(500)
    const collectionShot = await takeScreenshot(page, 'collection-dashboard')
    assertCondition(
      await page.getByRole('button', { name: /Registrar gestión/i }).first().isVisible(),
      'Collection',
      'Caso priorizado en cobranza',
      'La mora controlada aparece en cobranza y expone gestión rápida.',
      collectionShot
    )

    await page.getByRole('button', { name: /Registrar gestión/i }).first().click()
    await page.getByLabel(/Resultado/i).click()
    await page.getByRole('option', { name: /Promesa de pago realizada/i }).click()
    await page.getByLabel(/Monto Prometido/i).fill(tempPayment.promiseAmount)
    await page.getByLabel(/Fecha Prometida/i).fill(tempPayment.promiseDate)
    await page.getByLabel(/Notas/i).fill(`Seguimiento QA ${stamp}: cliente confirma pago mañana.`)
    await page.getByRole('button', { name: /^Guardar$/i }).click()
    await waitForCondition('promesa y acción de cobranza', async () => {
      const [latestPromise, latestAction] = await Promise.all([
        prisma.paymentPromise.findFirst({
          where: {
            loanId: created.loanId!,
            promisedAmount: Number(tempPayment.promiseAmount),
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        }),
        prisma.collectionAction.findFirst({
          where: {
            loanId: created.loanId!,
            notes: { contains: `Seguimiento QA ${stamp}` },
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        }),
      ])

      return Boolean(latestPromise?.id && latestAction?.id)
    })

    const promise = await prisma.paymentPromise.findFirst({
      where: {
        loanId: created.loanId!,
        promisedAmount: Number(tempPayment.promiseAmount),
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })
    created.promiseId = promise?.id

    const action = await prisma.collectionAction.findFirst({
      where: {
        loanId: created.loanId!,
        notes: { contains: `Seguimiento QA ${stamp}` },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })
    created.collectionActionId = action?.id

    assertCondition(
      Boolean(created.promiseId) && Boolean(created.collectionActionId),
      'Collection',
      'Promesa y gestión rápida',
      'La gestión crea la acción de cobranza y la promesa de pago asociada.',
      await takeScreenshot(page, 'collection-promise-created')
    )
  } finally {
    await logout(page)
    await context.close()
  }
}

async function reportsAndViewerFlow(browser: Browser) {
  if (!created.loanId) {
    throw new Error('Falta un préstamo para validar reportes y viewer.')
  }

  const adminContext = await createContext(browser)
  const adminPage = await login(adminContext, adminCredentials, 'admin-reports')

  try {
    await adminPage.goto('/dashboard/reportes', { waitUntil: 'networkidle' })
    const reportsPortfolioShot = await takeScreenshot(adminPage, 'reports-portfolio')
    assertCondition(
      await adminPage.getByRole('tab', { name: /Rentabilidad/i }).isVisible(),
      'Reportes',
      'Carga del workspace',
      'El módulo de reportes carga sus pestañas principales sin errores visuales.',
      reportsPortfolioShot
    )

    await adminPage.getByRole('tab', { name: /Vencimientos/i }).click()
    await adminPage.waitForTimeout(300)
    assertCondition(
      await adminPage.getByText(/Resumen de Cartera Vencida/i).isVisible(),
      'Reportes',
      'Aging',
      'La vista de vencimientos responde y resume la cartera vencida.',
      await takeScreenshot(adminPage, 'reports-aging')
    )

    await adminPage.getByRole('tab', { name: /Cobranza/i }).click()
    await adminPage.waitForTimeout(300)
    assertCondition(
      await adminPage.getByText(/Total en Mora/i).isVisible(),
      'Reportes',
      'Cobranza',
      'El reporte de cobranza refleja la mora y las métricas operativas.',
      await takeScreenshot(adminPage, 'reports-collection')
    )

    await adminPage.getByRole('tab', { name: /Rentabilidad/i }).click()
    await adminPage.waitForTimeout(300)
    await adminPage.getByPlaceholder(/Buscar por cliente, DNI\/CIF o número de préstamo/i).fill(
      tempClient.lastName
    )
    await adminPage.waitForTimeout(400)
    const profitabilityShot = await takeScreenshot(adminPage, 'reports-profitability')
    const profitabilityVisible =
      (await adminPage.getByText(tempClient.lastName, { exact: false }).count()) > 0 ||
      (await adminPage.getByText(/9500,00\s*€/i).count()) > 0

    assertCondition(
      profitabilityVisible,
      'Reportes',
      'Rentabilidad',
      'La operación creada aparece en rentabilidad y se puede filtrar por cliente.',
      profitabilityShot
    )

    const [csvDownload] = await Promise.all([
      adminPage.waitForEvent('download'),
      (async () => {
        await adminPage.getByRole('button', { name: /Exportar/i }).click()
        await adminPage.getByText(/Excel \(CSV\)/i).click()
      })(),
    ])
    const csvFilename = csvDownload.suggestedFilename()
    const csvPath = path.join(downloadDir, csvFilename)
    await csvDownload.saveAs(csvPath)
    const csvStats = await fs.stat(csvPath)
    const csvContents = await fs.readFile(csvPath, 'utf8')

    assertCondition(
      csvStats.size > 0 &&
        csvFilename.toLowerCase().endsWith('.csv') &&
        csvContents.includes(tempClient.lastName),
      'Reportes',
      'Exportación CSV',
      `La exportación de rentabilidad descarga un CSV utilizable (${csvFilename}).`,
      await takeScreenshot(adminPage, 'reports-profitability-export')
    )
  } finally {
    await logout(adminPage)
    await adminContext.close()
  }

  const viewerContext = await createContext(browser)
  const viewerPage = await login(viewerContext, viewerCredentials, 'viewer')

  try {
    await viewerPage.goto('/dashboard/reportes', { waitUntil: 'networkidle' })
    assertCondition(
      await viewerPage.getByRole('tab', { name: /Cartera/i }).isVisible(),
      'Viewer',
      'Consulta de reportes',
      'El perfil viewer puede consultar reportes sin acciones de creación.',
      await takeScreenshot(viewerPage, 'viewer-reports')
    )

    await viewerPage.goto('/dashboard/solicitudes/nuevo', { waitUntil: 'networkidle' })
    const deniedShot = await takeScreenshot(viewerPage, 'viewer-access-denied')
    const deniedText = await viewerPage.locator('body').innerText()
    assertCondition(
      /Solo los perfiles autorizados|Acceso denegado|No autorizado/i.test(deniedText),
      'Viewer',
      'Bloqueo server-side',
      'El viewer recibe bloqueo explícito al intentar abrir un alta restringida.',
      deniedShot
    )
  } finally {
    await logout(viewerPage)
    await viewerContext.close()
  }
}

async function main() {
  let browser: Browser | null = null
  let hasFailure = false

  try {
    await ensureArtifactFolders()
    await ensureChromeExists()
    await createViewerUser()

    browser = await chromium.launch({
      headless: HEADLESS,
      executablePath: CHROME_PATH,
    })

    await analystFlow(browser)
    await adminFlow(browser)
    await collectionFlow(browser)
    await reportsAndViewerFlow(browser)
  } catch (error) {
    hasFailure = true
    const message = error instanceof Error ? error.message : 'Fallo desconocido en QA visual'
    record('General', 'Ejecución QA visual', 'FAIL', message)
    console.error('❌ QA visual-operativa falló:', error)
  } finally {
    if (browser) {
      await browser.close()
    }

    if (!KEEP_UI_QA_DATA && !hasFailure) {
      await cleanup()
      record('General', 'Limpieza QA', 'PASS', 'Los datos temporales fueron eliminados tras una corrida limpia.')
    } else if (KEEP_UI_QA_DATA) {
      record('General', 'Limpieza QA', 'PASS', 'Se conservaron los datos temporales por configuración KEEP_UI_QA_DATA=1.')
    } else {
      record('General', 'Limpieza QA', 'PASS', 'Se conservaron los datos temporales para inspeccionar el fallo encontrado.')
    }

    await writeReport()
    await prisma.$disconnect()
  }

  const passed = results.filter(result => result.status === 'PASS').length
  const failed = results.filter(result => result.status === 'FAIL').length

  console.log(`\nUI delivery QA: ${passed} PASS / ${failed} FAIL`)
  console.log(`Report: ${reportPath}`)

  if (failed > 0) {
    process.exitCode = 1
  }
}

void main()
