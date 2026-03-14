# 🚀 Plan de Mejoras - LendCore
## UI/UX y Seguridad

**Fecha:** 15 de Marzo 2024
**Basado en:** Análisis exhaustivo de 45+ archivos
**Priorizado por:** Impacto en seguridad y experiencia de usuario

---

## 📊 **Resumen Ejecutivo**

| Categoría | Estado Actual | Objetivo |
|-----------|---------------|----------|
| **Seguridad** | ⭐⭐ (2/5) | ⭐⭐⭐⭐⭐ (5/5) |
| **UX/UI** | ⭐⭐⭐ (3/5) | ⭐⭐⭐⭐⭐ (5/5) |
| **Accesibilidad** | ⭐ (1/5) | ⭐⭐⭐⭐⭐ (5/5) |
| **Performance** | ⭐⭐⭐ (3/5) | ⭐⭐⭐⭐ (4/5) |

**Total de Tareas:** 11
**Tiempo Estimado:** 3-4 semanas
**Prioridad:** CRÍTICA antes de producción

---

## 🎯 **FASE 1: Seguridad Crítica** (2-3 días)

**Objetivo:** Cerrar vulnerabilidades CRÍTICAS antes de cualquier despliegue

### Task #19: Eliminar credenciales de test ⚠️ CRÍTICO
```diff
- <p>Admin: admin@lendcore.com / admin123</p>
- <p>Analista: ana.rodriguez@lendcore.com / analyst123</p>
+ <!-- Mover a .env.local solo en desarrollo -->
```

**Impacto:** Previene acceso no autorizado
**Esfuerzo:** 15 minutos
**Archivo:** `src/app/(auth)/login/page.tsx`

---

### Task #20: Implementar rate limiting ⚠️ CRÍTICO
```typescript
// ANTES: Sin protección
export async function POST(request: NextRequest) {
  const body = await request.json()
  // ...
}

// DESPUÉS: Con rate limiting
import { withCreateRateLimit } from '@/lib/security/rateLimitMiddleware'

export async function POST(request: NextRequest) {
  const session = await auth()

  // Rate limiting
  const rateLimitResponse = await withCreateRateLimit(request, session.user.id)
  if (rateLimitResponse) return rateLimitResponse

  const body = await request.json()
  // ...
}
```

**Rutas a proteger:**
- `/api/clients` → `withCreateRateLimit`
- `/api/loans` → `withCreateRateLimit`
- `/api/payments` → `withCreateRateLimit`
- `/api/auth/[...nextauth]` → Requiere customización especial

**Impacto:** Previene ataques de fuerza bruta, DDoS
**Esfuerzo:** 2-3 horas
**Archivos:** Todas las rutas API

---

### Task #21: Activar encriptación ⚠️ CRÍTICO
```typescript
// ANTES: ClientService.create()
await prisma.client.create({
  data: {
    dni: clientData.dni,           // ❌ Plaintext
    phone: clientData.phone,       // ❌ Plaintext
    // ...
  }
})

// DESPUÉS: Con encriptación
import { encryptDNI, encryptPhone, encryptIBAN } from '@/lib/security/encryption'

await prisma.client.create({
  data: {
    dni: encryptDNI(clientData.dni),         // ✅ Encriptado
    phone: encryptPhone(clientData.phone),   // ✅ Encriptado
    iban: encryptIBAN(clientData.iban),      // ✅ Encriptado
    // ...
  }
})

// Al leer:
import { decryptDNI, maskDNI } from '@/lib/security/encryption'

const client = await prisma.client.findUnique({ where: { id } })
const dniPlain = decryptDNI(client.dni)      // Para edición
const dniMasked = maskDNI(dniPlain)          // Para mostrar: "*****678A"
```

**Impacto:** Protege datos sensibles según RGPD
**Esfuerzo:** 4-6 horas
**Archivos:**
- `src/services/clientService.ts`
- `src/components/clients/ClientForm.tsx`
- `src/app/(dashboard)/dashboard/clientes/[id]/page.tsx`

---

### Task #22: Corregir validación CIF ⚠️ ALTA
```typescript
// ANTES: Siempre válido
export const validateCIF = (cif: string): boolean => {
  if (!cifRegex.test(cif)) return false
  return true  // ❌ Sin checksum
}

// DESPUÉS: Con checksum correcto
export const validateCIF = (cif: string): boolean => {
  if (!cifRegex.test(cif)) return false

  const controlDigit = cif.charAt(cif.length - 1)
  const cifNumber = cif.substring(1, cif.length - 1)

  // Cálculo de suma ponderada
  let sum = 0
  for (let i = 0; i < cifNumber.length; i++) {
    const digit = parseInt(cifNumber[i])
    if (i % 2 === 0) {
      const doubled = digit * 2
      sum += doubled > 9 ? doubled - 9 : doubled
    } else {
      sum += digit
    }
  }

  const calculatedControl = (10 - (sum % 10)) % 10
  const controlLetter = 'JABCDEFGHI'[calculatedControl]

  // Verificar control (letra o número según tipo)
  return controlDigit === controlLetter.toString() ||
         controlDigit === calculatedControl.toString()
}
```

**Impacto:** Integridad de datos, evita CIFs inválidos
**Esfuerzo:** 1 hora
**Archivo:** `src/lib/validations/client.schema.ts`

---

## 🎨 **FASE 2: UX Esencial** (3-4 días)

### Task #23: Agregar breadcrumbs
```tsx
// src/components/layout/Breadcrumbs.tsx
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/dashboard">Dashboard</Link>
      {segments.map((segment, i) => (
        <div key={i} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          <Link href={`/${segments.slice(0, i + 1).join('/')}`}>
            {segment.charAt(0).toUpperCase() + segment.slice(1)}
          </Link>
        </div>
      ))}
    </nav>
  )
}
```

**Impacto:** Orientación del usuario, navegación rápida
**Esfuerzo:** 2 horas
**Archivo:** `src/components/layout/Header.tsx`

---

### Task #24: Implementar paginación
```typescript
// Modificar Services
export class ClientService {
  static async getAll(filters?: {
    status?: ClientStatus
    take?: number    // ✅ Nuevo
    skip?: number    // ✅ Nuevo
  }) {
    const { take = 50, skip = 0, ...where } = filters || {}

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.client.count({ where })
    ])

    return {
      data: clients,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        pageSize: take,
        totalPages: Math.ceil(total / take)
      }
    }
  }
}
```

```tsx
// Componente de paginación
import { Pagination } from '@/components/ui/pagination'

<Pagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
/>
```

**Impacto:** Performance con >100 registros
**Esfuerzo:** 4-6 horas
**Archivos:**
- Services: `clientService.ts`, `loanService.ts`, etc.
- Páginas: Todos los listados

---

### Task #26: Skeleton loaders + Empty states
```tsx
// src/components/ui/TableSkeleton.tsx
export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  )
}

// src/components/ui/EmptyState.tsx
export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6">{description}</p>
      {action}
    </div>
  )
}
```

**Uso en Server Components:**
```tsx
// src/app/(dashboard)/dashboard/clientes/page.tsx
import { Suspense } from 'react'

export default function ClientsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ClientsList />
    </Suspense>
  )
}

async function ClientsList() {
  const clients = await ClientService.getAll()

  if (clients.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No hay clientes todavía"
        description="Comienza agregando tu primer cliente"
        action={
          <Link href="/dashboard/clientes/nuevo">
            <Button>+ Nuevo Cliente</Button>
          </Link>
        }
      />
    )
  }

  return <ClientsTable data={clients} />
}
```

**Impacto:** Mejor percepción de velocidad, UX profesional
**Esfuerzo:** 3-4 horas
**Archivos:** Todos los listados y Server Components

---

## ♿ **FASE 3: Accesibilidad** (2 días)

### Task #25: WCAG 2.1 AA Compliance
```tsx
// ANTES: Sin accesibilidad
<button onClick={() => setExpanded(!expanded)}>
  {item.name}
</button>

// DESPUÉS: Con accesibilidad completa
<button
  onClick={() => setExpanded(!expanded)}
  aria-expanded={expanded}
  aria-controls={`submenu-${item.name}`}
  aria-label={`${item.name} menu`}
  className="..."
>
  {item.name}
</button>

<div
  id={`submenu-${item.name}`}
  role="menu"
  aria-hidden={!expanded}
>
  {/* Submenú */}
</div>
```

**Checklist de accesibilidad:**
- [ ] aria-label en todos los botones sin texto
- [ ] aria-expanded en menús colapsables
- [ ] role="search" en búsqueda global
- [ ] aria-describedby en inputs con errores
- [ ] aria-label en StatusBadges (colores)
- [ ] Keyboard navigation (Tab, Enter, Esc)
- [ ] Focus visible (outline o ring)
- [ ] Skip links ("Saltar al contenido")
- [ ] Landmarks (header, main, nav, footer)
- [ ] Contraste mínimo 4.5:1

**Herramientas de testing:**
```bash
npm install -D axe-core @axe-core/react
npm install -D eslint-plugin-jsx-a11y
```

**Impacto:** Inclusión, cumplimiento legal
**Esfuerzo:** 6-8 horas
**Archivos:** Todos los componentes interactivos

---

## 🚀 **FASE 4: Funcionalidades Completas** (1 semana)

### Task #27: Completar páginas faltantes

**1. Dashboard Principal**
```tsx
// src/app/(dashboard)/dashboard/page.tsx
export default async function DashboardPage() {
  const [stats, recentLoans, alerts] = await Promise.all([
    getGeneralStats(),
    getRecentLoans(5),
    getSystemAlerts()
  ])

  return (
    <div className="grid gap-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard title="Total Clientes" value={stats.totalClients} icon={Users} />
        <KPICard title="Préstamos Activos" value={stats.activeLoans} icon={CreditCard} />
        <KPICard title="Cartera Total" value={formatCurrency(stats.portfolio)} icon={DollarSign} />
        <KPICard title="Tasa de Mora" value={`${stats.defaultRate}%`} icon={TrendingUp} />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && <AlertsSection alerts={alerts} />}

      {/* Recent Activity */}
      <RecentLoansTable loans={recentLoans} />
    </div>
  )
}
```

**2. Crear Préstamo**
```tsx
// src/app/(dashboard)/dashboard/prestamos/nuevo/page.tsx
export default function NewLoanPage() {
  return <LoanForm mode="create" />
}

// src/components/loans/LoanForm.tsx
export function LoanForm({ mode = 'create', initialData }: LoanFormProps) {
  const form = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: initialData || defaultLoanValues
  })

  return (
    <Form {...form}>
      <FormField name="clientId" ... />
      <FormField name="principalAmount" ... />
      <FormField name="interestRate" ... />
      <FormField name="termMonths" ... />
      <FormField name="firstDueDate" ... />
      {/* ... */}
    </Form>
  )
}
```

**3. Detalle de Préstamo**
```tsx
// src/app/(dashboard)/dashboard/prestamos/[id]/page.tsx
export default async function LoanDetailPage({ params }: { params: { id: string } }) {
  const loan = await LoanService.getById(params.id)
  const installments = await InstallmentService.getByLoanId(params.id)

  return (
    <div className="grid gap-6">
      <LoanHeader loan={loan} />
      <Tabs defaultValue="installments">
        <TabsList>
          <TabsTrigger value="installments">Cuotas</TabsTrigger>
          <TabsTrigger value="payments">Pagos</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="installments">
          <InstallmentsTable installments={installments} />
        </TabsContent>
        {/* ... */}
      </Tabs>
    </div>
  )
}
```

**4. Registrar Pago**
```tsx
// src/app/(dashboard)/dashboard/pagos/nuevo/page.tsx
export default function NewPaymentPage({ searchParams }: { searchParams: { loanId?: string } }) {
  return <PaymentForm preselectedLoanId={searchParams.loanId} />
}

// src/components/payments/PaymentForm.tsx
export function PaymentForm({ preselectedLoanId }: PaymentFormProps) {
  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      loanId: preselectedLoanId,
      amount: 0,
      paymentDate: new Date(),
      method: 'TRANSFER'
    }
  })

  // Auto-calcular distribución:
  // - Principal
  // - Intereses
  // - Penalidades

  return <Form ... />
}
```

**Impacto:** Sistema funcional completo
**Esfuerzo:** 20-24 horas
**Archivos:** 10+ páginas y componentes nuevos

---

## 🔐 **FASE 5: Autenticación Avanzada** (3-4 días)

### Task #28: Implementar 2FA

**1. Modelo de BD**
```prisma
model User {
  id                 String    @id @default(uuid())
  email              String    @unique
  passwordHash       String

  // 2FA
  twoFactorEnabled   Boolean   @default(false)  // ✅ Nuevo
  twoFactorSecret    String?                     // ✅ Nuevo
  backupCodes        Json?                       // ✅ Nuevo

  // ...
}
```

**2. Setup Endpoint**
```typescript
// src/app/api/auth/2fa/setup/route.ts
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Generar secret
  const secret = authenticator.generateSecret()

  // Generar códigos de backup
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex')
  )

  // Generar QR code
  const otpauth = authenticator.keyuri(
    session.user.email,
    'LendCore',
    secret
  )
  const qrCode = await QRCode.toDataURL(otpauth)

  // Guardar secret (no activar todavía)
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorSecret: secret,
      backupCodes: backupCodes
    }
  })

  return NextResponse.json({
    secret,
    qrCode,
    backupCodes
  })
}
```

**3. Verify Endpoint**
```typescript
// src/app/api/auth/2fa/verify/route.ts
export async function POST(request: NextRequest) {
  const session = await auth()
  const { code } = await request.json()

  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  })

  const isValid = authenticator.verify({
    token: code,
    secret: user.twoFactorSecret!
  })

  if (isValid) {
    // Activar 2FA
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true }
    })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
}
```

**4. Login Flow con 2FA**
```typescript
// src/lib/auth.ts - Modificar authorize()
async authorize(credentials, req) {
  // ... validación de email/password

  if (user.twoFactorEnabled) {
    // NO retornar el user, retornar pendiente 2FA
    return {
      id: user.id,
      email: user.email,
      require2FA: true
    }
  }

  return { id: user.id, email: user.email, ... }
}
```

**5. UI de Setup**
```tsx
// src/app/(dashboard)/dashboard/perfil/page.tsx
export default function ProfilePage() {
  const [qrCode, setQrCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  const handleEnable2FA = async () => {
    const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
    const data = await res.json()
    setQrCode(data.qrCode)
    setBackupCodes(data.backupCodes)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Autenticación de Dos Factores</CardTitle>
        <CardDescription>
          Agrega una capa extra de seguridad a tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!session.user.twoFactorEnabled ? (
          <Button onClick={handleEnable2FA}>Activar 2FA</Button>
        ) : (
          <Badge variant="success">✓ 2FA Activo</Badge>
        )}

        {qrCode && (
          <div>
            <img src={qrCode} alt="QR Code" />
            <p>Escanea con Google Authenticator</p>

            <div className="mt-4">
              <h4>Códigos de Backup (guarda en lugar seguro):</h4>
              {backupCodes.map(code => <code key={code}>{code}</code>)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

**Impacto:** Seguridad de nivel bancario
**Esfuerzo:** 12-16 horas
**Dependencias:** `npm install otplib qrcode`

---

## 🎨 **FASE 6: Mejoras de UX Avanzadas** (2-3 días)

### Task #29: Mensajes y confirmaciones

**1. Mensajes de error específicos**
```typescript
// ANTES:
throw new Error('Error al crear cliente')

// DESPUÉS:
if (existingClient) {
  throw new Error(`El DNI ${dni} ya está registrado en el sistema para el cliente ${existingClient.name}`)
}

if (amount < 100 || amount > 50000) {
  throw new Error(`El monto debe estar entre ${formatCurrency(100)} y ${formatCurrency(50000)}`)
}

if (!isValidEmail(email)) {
  throw new Error(`El email "${email}" no es válido. Formato esperado: usuario@dominio.com`)
}
```

**2. Confirmaciones con AlertDialog**
```tsx
// src/components/ui/ConfirmDialog.tsx
export function ConfirmDialog({
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  onConfirm,
  children
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm()
              setOpen(false)
            }}
            variant={variant}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

**Uso:**
```tsx
<ConfirmDialog
  title="¿Eliminar cliente?"
  description={`¿Estás seguro de eliminar a ${client.name}? Esta acción no se puede deshacer.`}
  confirmText="Sí, eliminar"
  variant="destructive"
  onConfirm={handleDelete}
>
  <Button variant="destructive">
    <Trash2 className="mr-2 h-4 w-4" />
    Eliminar
  </Button>
</ConfirmDialog>
```

**Impacto:** Menos errores del usuario, mayor confianza
**Esfuerzo:** 4-6 horas
**Archivos:** Todas las acciones destructivas

---

## 📈 **Métricas de Éxito**

### Antes de Implementación
- ❌ 5 vulnerabilidades críticas
- ❌ 0/100 en WCAG
- ❌ Sin paginación (timeout con >1000 registros)
- ❌ Mensajes genéricos
- ❌ 40% de páginas incompletas

### Después de Implementación
- ✅ 0 vulnerabilidades críticas
- ✅ 90+/100 en WCAG 2.1 AA
- ✅ Paginación eficiente (<200ms cualquier listado)
- ✅ Errores específicos y accionables
- ✅ 100% de funcionalidades core completas

---

## 🗓️ **Timeline Recomendado**

```
Semana 1: FASE 1 + FASE 2
├─ Día 1-2: Seguridad crítica (Tasks #19-22)
└─ Día 3-5: UX esencial (Tasks #23-24, #26)

Semana 2: FASE 3 + FASE 4
├─ Día 1-2: Accesibilidad (Task #25)
└─ Día 3-5: Páginas faltantes (Task #27)

Semana 3: FASE 5 + FASE 6
├─ Día 1-3: 2FA (Task #28)
└─ Día 4-5: Mensajes/confirmaciones (Task #29)

Semana 4: Testing y Refinamiento
├─ Testing de seguridad
├─ Testing de accesibilidad
├─ Testing de performance
└─ Bug fixes
```

---

## ✅ **Checklist de Validación**

### Seguridad
- [ ] Rate limiting funcionando en todas las APIs
- [ ] Datos sensibles encriptados en BD
- [ ] Sin credenciales hardcodeadas
- [ ] CIF validation correcta
- [ ] 2FA funcionando para ADMIN
- [ ] Security headers presentes
- [ ] Logs de seguridad registrando eventos

### UX/UI
- [ ] Breadcrumbs en todas las páginas
- [ ] Paginación en todos los listados
- [ ] Skeleton loaders en cargas async
- [ ] Empty states cuando no hay datos
- [ ] Confirmaciones en acciones destructivas
- [ ] Mensajes de error específicos
- [ ] Loading states en botones

### Accesibilidad
- [ ] aria-labels en elementos interactivos
- [ ] Navegación por teclado funcional
- [ ] Contraste mínimo 4.5:1
- [ ] Focus visible en elementos
- [ ] Screen reader compatible
- [ ] Score >90 en Lighthouse Accessibility

### Funcionalidades
- [ ] Dashboard principal con KPIs
- [ ] Crear préstamo completo
- [ ] Detalle de préstamo
- [ ] Registrar pago
- [ ] Listado de pagos
- [ ] Todas las rutas existentes funcionales

---

## 🚀 **¿Listo para Empezar?**

**Comando para ver tareas:**
```bash
# En Claude Code:
/tasks
```

**Orden recomendado:**
1. Task #19 (15 min) ← Empezar AHORA
2. Task #20 (2-3h)
3. Task #21 (4-6h)
4. Task #22 (1h)
5. ... seguir según prioridad

---

**Última actualización:** 15 de Marzo 2024
