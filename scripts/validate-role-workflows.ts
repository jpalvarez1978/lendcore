import bcrypt from 'bcryptjs'
import { ApplicationStatus, PrismaClient, UserRole, UserStatus } from '@prisma/client'
import { ApplicationService } from '../src/services/applicationService'

const prisma = new PrismaClient()
const BASE_URL = process.env.APP_BASE_URL || 'http://127.0.0.1:3001'

type TestStatus = 'PASS' | 'FAIL'

interface TestResult {
  area: string
  check: string
  status: TestStatus
  detail: string
}

interface RoleCredentials {
  role: UserRole
  email: string
  password: string
}

interface RoleSession extends RoleCredentials {
  cookie: string
}

const results: TestResult[] = []

function record(area: string, check: string, status: TestStatus, detail: string) {
  results.push({ area, check, status, detail })
}

function assertCondition(condition: unknown, area: string, check: string, detail: string) {
  if (!condition) {
    record(area, check, 'FAIL', detail)
    throw new Error(`${area} :: ${check} -> ${detail}`)
  }

  record(area, check, 'PASS', detail)
}

async function extractSetCookies(headers: Headers) {
  if ('getSetCookie' in headers && typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie()
  }

  const single = headers.get('set-cookie')
  return single ? [single] : []
}

function mergeCookies(existing: string, setCookies: string[]) {
  const jar = new Map<string, string>()

  for (const part of existing.split(/;\s*/).filter(Boolean)) {
    const [name, ...value] = part.split('=')
    if (name && value.length > 0) {
      jar.set(name, value.join('='))
    }
  }

  for (const raw of setCookies) {
    const pair = raw.split(';')[0]
    const [name, ...value] = pair.split('=')
    if (name && value.length > 0) {
      jar.set(name, value.join('='))
    }
  }

  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
}

async function login(credentials: RoleCredentials): Promise<string> {
  let cookie = ''

  const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`, {
    redirect: 'manual',
  })
  cookie = mergeCookies(cookie, await extractSetCookies(csrfResponse.headers))

  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string }
  const body = new URLSearchParams({
    email: credentials.email,
    password: credentials.password,
    csrfToken,
    callbackUrl: `${BASE_URL}/dashboard`,
    json: 'true',
  })

  const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials?json=true`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      cookie,
    },
    body,
  })

  cookie = mergeCookies(cookie, await extractSetCookies(loginResponse.headers))

  const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { cookie },
    redirect: 'manual',
  })
  const session = (await sessionResponse.json()) as { user?: { role?: UserRole } }

  assertCondition(
    session.user?.role === credentials.role,
    'Autenticación',
    `Login ${credentials.role}`,
    `Sesión iniciada correctamente para ${credentials.email}`
  )

  return cookie
}

async function request(
  session: RoleSession,
  path: string,
  init?: RequestInit
) {
  const headers = new Headers(init?.headers)
  headers.set('cookie', session.cookie)

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
    redirect: 'manual',
  })

  const text = await response.text()

  return {
    status: response.status,
    text,
  }
}

function assertPageAccess(
  session: RoleSession,
  pageName: string,
  result: { status: number; text: string },
  options: { shouldAllow: boolean; allowMarker?: string; denyMarker: string }
) {
  const allowed =
    result.status === 200 &&
    !result.text.includes(options.denyMarker) &&
    !/Iniciar sesión|Bienvenido/i.test(result.text) &&
    (options.allowMarker ? result.text.includes(options.allowMarker) : true)
  const denied = result.status === 200 && result.text.includes(options.denyMarker)

  if (options.shouldAllow) {
    assertCondition(
      allowed && !denied,
      `Páginas ${session.role}`,
      pageName,
      `${session.role} puede entrar en ${pageName}`
    )
    return
  }

  assertCondition(
    denied && !allowed,
    `Páginas ${session.role}`,
    pageName,
    `${session.role} queda bloqueado en ${pageName}`
  )
}

function assertApiPermission(
  session: RoleSession,
  apiName: string,
  result: { status: number; text: string },
  shouldAllow: boolean
) {
  if (shouldAllow) {
    assertCondition(
      result.status !== 401 && result.status !== 403,
      `APIs ${session.role}`,
      apiName,
      `${session.role} supera la validación de permisos en ${apiName} (status ${result.status})`
    )
    return
  }

  assertCondition(
    result.status === 403,
    `APIs ${session.role}`,
    apiName,
    `${session.role} recibe 403 en ${apiName}`
  )
}

async function createTempViewer() {
  const email = `viewer-role-check-${Date.now()}@lendcore.com`
  const password = 'Viewer123!'

  const viewer = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      name: 'Viewer Role Check',
      firstName: 'Viewer',
      lastName: 'Role Check',
      role: UserRole.VIEWER,
      status: UserStatus.ACTIVE,
    },
  })

  return {
    userId: viewer.id,
    credentials: {
      role: UserRole.VIEWER,
      email,
      password,
    } satisfies RoleCredentials,
  }
}

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    select: { id: true },
  })
  const analyst = await prisma.user.findFirst({
    where: { role: UserRole.ANALYST, status: UserStatus.ACTIVE },
    select: { id: true },
  })
  const collector = await prisma.user.findFirst({
    where: { role: UserRole.COLLECTION, status: UserStatus.ACTIVE },
    select: { id: true },
  })
  const activeLoan = await prisma.loan.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })
  const client = await prisma.client.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  })

  assertCondition(Boolean(admin), 'Setup', 'Admin disponible', 'Existe un usuario ADMIN activo')
  assertCondition(Boolean(analyst), 'Setup', 'Analyst disponible', 'Existe un usuario ANALYST activo')
  assertCondition(Boolean(collector), 'Setup', 'Collector disponible', 'Existe un usuario COLLECTION activo')
  assertCondition(Boolean(activeLoan), 'Setup', 'Préstamo activo disponible', 'Existe un préstamo activo para validar rutas')
  assertCondition(Boolean(client), 'Setup', 'Cliente disponible', 'Existe un cliente para validar edición')

  const tempViewer = await createTempViewer()
  const tempApplication = await ApplicationService.create(
    {
      clientId: client!.id,
      requestedAmount: 3200,
      purpose: 'VALIDACION DE ROLES',
      termMonths: 6,
      proposedRate: 1.4,
      paymentFrequency: 'MONTHLY',
    },
    admin!.id
  )
  await ApplicationService.submit(tempApplication.id, admin!.id)

  const credentials: RoleCredentials[] = [
    { role: UserRole.ADMIN, email: 'admin@lendcore.com', password: 'Admin123!' },
    { role: UserRole.ANALYST, email: 'analyst@lendcore.com', password: 'Analyst123!' },
    { role: UserRole.COLLECTION, email: 'collector@lendcore.com', password: 'Collector123!' },
    tempViewer.credentials,
  ]

  try {
    const sessions: RoleSession[] = []
    for (const credential of credentials) {
      sessions.push({
        ...credential,
        cookie: await login(credential),
      })
    }

    const paymentPage = `/dashboard/pagos/nuevo?loanId=${activeLoan!.id}`
    const extendPage = `/dashboard/prestamos/${activeLoan!.id}/prorrogar`
    const editClientPage = `/dashboard/clientes/${client!.id}/editar`
    const newApplicationPage = '/dashboard/solicitudes/nuevo'

    for (const session of sessions) {
      assertPageAccess(
        session,
        'Nueva solicitud',
        await request(session, newApplicationPage),
        {
          shouldAllow: session.role === UserRole.ADMIN || session.role === UserRole.ANALYST,
          allowMarker: 'Nueva Solicitud',
          denyMarker: 'Solo los perfiles autorizados pueden registrar nuevas solicitudes.',
        }
      )

      assertPageAccess(
        session,
        'Registrar pago',
        await request(session, paymentPage),
        {
          shouldAllow:
            session.role === UserRole.ADMIN ||
            session.role === UserRole.ANALYST ||
            session.role === UserRole.COLLECTION,
          denyMarker: 'Tu rol no tiene permisos para registrar pagos.',
        }
      )

      assertPageAccess(
        session,
        'Prorrogar préstamo',
        await request(session, extendPage),
        {
          shouldAllow: session.role === UserRole.ADMIN || session.role === UserRole.ANALYST,
          denyMarker: 'Tu rol no tiene permisos para prorrogar préstamos.',
        }
      )

      assertPageAccess(
        session,
        'Editar cliente',
        await request(session, editClientPage),
        {
          shouldAllow: session.role === UserRole.ADMIN || session.role === UserRole.ANALYST,
          denyMarker: 'Tu rol no tiene permisos para editar clientes.',
        }
      )
    }

    for (const session of sessions) {
      assertApiPermission(
        session,
        'POST /api/applications',
        await request(session, '/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
        session.role === UserRole.ADMIN || session.role === UserRole.ANALYST
      )

      assertApiPermission(
        session,
        'POST /api/applications/[id]/status approve',
        await request(session, `/api/applications/${tempApplication.id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'approve',
            approvalNotes: 'Validación de permisos',
          }),
        }),
        session.role === UserRole.ADMIN
      )

      assertApiPermission(
        session,
        'POST /api/payments',
        await request(session, '/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            loanId: activeLoan!.id,
          }),
        }),
        session.role === UserRole.ADMIN ||
          session.role === UserRole.ANALYST ||
          session.role === UserRole.COLLECTION
      )

      assertApiPermission(
        session,
        'POST /api/loans/[id]/extend',
        await request(session, `/api/loans/${activeLoan!.id}/extend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            additionalMonths: 0,
            newInterestRate: -1,
          }),
        }),
        session.role === UserRole.ADMIN || session.role === UserRole.ANALYST
      )

      assertApiPermission(
        session,
        'PUT /api/clients/[id]',
        await request(session, `/api/clients/${client!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creditLimit: -1,
          }),
        }),
        session.role === UserRole.ADMIN || session.role === UserRole.ANALYST
      )
    }

    const approvedApplication = await prisma.creditApplication.findUnique({
      where: { id: tempApplication.id },
      select: { status: true },
    })

    assertCondition(
      approvedApplication?.status === ApplicationStatus.APPROVED,
      'Workflow',
      'Aprobación ADMIN',
      `La solicitud temporal quedó en ${approvedApplication?.status}`
    )
  } finally {
    await prisma.auditLog.deleteMany({
      where: {
        entityId: {
          in: [tempApplication.id, tempViewer.userId],
        },
      },
    })
    await prisma.creditApplication.deleteMany({
      where: { id: tempApplication.id },
    })
    await prisma.user.deleteMany({
      where: { id: tempViewer.userId },
    })
    await prisma.$disconnect()
  }

  console.log('ROLE WORKFLOW VALIDATION')
  console.log('========================')

  for (const result of results) {
    console.log(`[${result.status}] ${result.area} :: ${result.check} -> ${result.detail}`)
  }

  const passCount = results.filter(result => result.status === 'PASS').length
  const failCount = results.filter(result => result.status === 'FAIL').length

  console.log('------------------------')
  console.log(`PASS: ${passCount}`)
  console.log(`FAIL: ${failCount}`)

  if (failCount > 0) {
    process.exit(1)
  }
}

main().catch(async error => {
  console.error('ROLE WORKFLOW VALIDATION FAILED')
  console.error(error instanceof Error ? error.message : error)
  await prisma.$disconnect()
  process.exit(1)
})
