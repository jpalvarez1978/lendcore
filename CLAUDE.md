# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LendCore** is a private loan management system for Bilbao, Spain. It manages clients (individuals and businesses), loan applications, active loans with installment schedules, payments with automatic allocation, collections, and comprehensive auditing.

**Stack:** Next.js 15 (App Router) + React 19 + TypeScript + Prisma ORM + PostgreSQL + NextAuth v5 + Tailwind CSS + shadcn/ui

**Development Port:** 3001 (configured in package.json)

---

## Essential Commands

### Development
```bash
npm run dev              # Start development server on port 3001
npm run build            # Build for production
npm run start            # Start production server on port 3001
npm run lint             # Run ESLint
```

### Database
```bash
npm run db:push          # Sync schema to database (development)
npm run db:migrate       # Create migration (production)
npm run db:studio        # Open Prisma Studio on http://localhost:5555
npm run db:seed          # Seed database with test data
npx prisma generate      # Regenerate Prisma client after schema changes
```

### Security & Deployment
```bash
npm run security:generate                       # Generate ENCRYPTION_KEY and NEXTAUTH_SECRET
npm run security:validate-env                   # Validate environment configuration
npx tsx scripts/security-check.ts               # Run security validation
curl http://localhost:3001/api/health/security  # Check security health endpoint
vercel deploy --prod                            # Deploy to Vercel production
```

---

## Architecture Overview

### 1. Database Layer (Prisma)

**Location:** `prisma/schema.prisma`

The database uses a comprehensive schema with 20+ models organized into logical groups:

- **Users & Auth:** Role-based access (ADMIN, ANALYST, COLLECTION, VIEWER)
- **Clients:** Polymorphic structure supporting INDIVIDUAL and BUSINESS types with separate profile tables
- **Loan Lifecycle:** CreditApplication → Loan → Installment → Payment → PaymentAllocation
- **Collections:** CollectionAction, PaymentPromise with status tracking
- **Security:** SecurityLog for security events, AuditLog for business operations
- **Configuration:** SystemParameter with ParameterChangeLog for runtime configuration

**Key Design Patterns:**
- Polymorphic relationships using type discriminators (ClientType, EntityType)
- Separate tables for payment allocation to track principal vs interest vs penalty
- Comprehensive audit trail with separate security logging
- Encrypted sensitive fields (DNI, phone, address) at application level

### 2. Service Layer

**Location:** `src/services/`

Services encapsulate business logic and database operations. Each service corresponds to a major entity:

- `clientService.ts` - Client CRUD, encryption/decryption of sensitive data
- `loanService.ts` - Loan creation, installment generation
- `paymentService.ts` - Payment processing with automatic allocation
- `applicationService.ts` - Credit application workflow
- `collectionDashboardService.ts` - Collection statistics and overdue loans
- `reportService.ts` - Portfolio, aging, and collection reports
- `auditService.ts` - Business operation logging
- `securityService.ts` - Security event logging (login, failed attempts, etc.)
- `parameterService.ts` - System configuration management
- `promiseService.ts` - Payment promise tracking

**Pattern:** Services use Prisma client directly and handle transactions when needed.

**Servicios Adicionales Clave**:
- `collectionDashboardService.ts` - Métricas de cobranza, priorización con scoring (40% días + 30% monto + 20% intentos + 10% promesas)
- `collectorService.ts` - KPIs de cobradores (15+ métricas), asignación de préstamos, rankings de performance
- `promiseService.ts` - Gestión de promesas de pago, validación de límites, tracking de cumplimiento
- `parameterService.ts` - Configuración del sistema sin código, categorías FINANCIAL/RISK/OPERATIONAL/LIMITS
- `reportService.ts` - 4 tipos de reportes (Portfolio, Aging, Collection, Profitability)
- `creditLimitService.ts` - Gestión de límites de crédito por cliente

### 3. Calculation Layer

**Location:** `src/lib/calculations/`

Pure calculation functions with no database dependencies:

- `installments.ts` - Generate payment schedules based on loan terms
- `interest.ts` - Calculate interest amounts (fixed, monthly %, annual %)
- `penalties.ts` - Calculate late payment penalties
- `allocation.ts` - Allocate payments to principal/interest/penalties (FIFO waterfall)

**Pattern:** These are pure functions that take loan terms and return calculations. They're imported by services.

### 4. API Layer

**Location:** `src/app/api/`

Next.js 15 App Router API routes organized by resource:

```
api/
├── auth/
│   ├── [...nextauth]/          # NextAuth authentication
│   └── change-password/        # Change password endpoint
├── clients/                    # Client CRUD
├── loans/
│   ├── route.ts                # List/create loans
│   └── [id]/
│       ├── route.ts            # Get/update/delete loan
│       └── extend/route.ts     # Extend loan (prórroga)
├── applications/               # Credit applications workflow
│   └── [id]/status/            # Approve/reject applications
├── payments/                   # Payment processing with allocation
│   └── [id]/receipt/           # Generate payment receipt PDF
├── collection/
│   └── quick-action/           # Quick collection actions
├── collectors/                 # Collector management
│   ├── assign/                 # Assign/unassign loans to collectors
│   ├── performance/            # Performance rankings
│   ├── unassigned-loans/       # Loans without collector
│   └── [id]/
│       ├── kpis/               # Collector KPIs
│       └── loans/              # Loans assigned to collector
├── promises/                   # Payment promises CRUD
├── reports/                    # Reporting endpoints
│   ├── portfolio/              # Portfolio summary
│   ├── aging/                  # Aging analysis
│   ├── collection/             # Collection report by collector
│   └── profitability/          # Loan profitability
├── audit/                      # Audit log retrieval
│   ├── export/                 # Export audit logs to CSV
│   └── stats/                  # Audit statistics
├── security/                   # Security monitoring
│   ├── logs/                   # Security event logs
│   └── stats/                  # Security statistics
├── parameters/                 # System parameters configuration
│   └── [key]/                  # Get/update specific parameter
├── dashboard/
│   └── alerts/                 # Dynamic alerts by role
├── search/                     # Global multi-type search
└── health/security/            # Security health check
```

**Pattern:** API routes use services, apply rate limiting middleware, and handle NextAuth session validation.

**Key Endpoints Documentados**:

- `POST /api/loans/[id]/extend` - Prórroga de préstamos (additionalMonths, newInterestRate opcional)
- `POST /api/collection/quick-action` - Registro rápido de gestión de cobranza (actionType, result, notes)
- `GET /api/dashboard/alerts` - Alertas dinámicas filtradas por rol del usuario
- `GET /api/search?q=...` - Búsqueda global en clientes, préstamos, pagos, solicitudes, promesas
- `GET /api/parameters?category=...` - Listar parámetros configurables (FINANCIAL, RISK, OPERATIONAL, LIMITS)
- `GET /api/health/security` - Health check con 6 validaciones de seguridad
- `POST /api/collectors/assign` - Asignar préstamos a cobrador
- `GET /api/collectors/performance` - Ranking de cobradores por período
- `GET /api/reports/profitability` - Rentabilidad por préstamo con interés proyectado vs cobrado

### 5. UI Layer

**Location:** `src/app/(dashboard)/ and src/components/`

- **Layout:** `src/components/layout/` - Sidebar, Header with role-based navigation
- **Base UI:** `src/components/ui/` - shadcn/ui components (button, card, input, etc.)
- **Shared:** `src/components/shared/` - StatusBadge, GlobalSearch, NotificationCenter, DataPagination
- **Domain:** `src/components/clients/`, `src/components/dashboard/`, `src/components/collection/`

**Pattern:** Components use React Server Components where possible, Client Components marked with 'use client'.

### 6. Security Implementation

**Key Security Features:**
- **AES-256-GCM Encryption:** Sensitive data (DNI/CIF, phone, address) encrypted at rest using `src/lib/security/encryption.ts`
- **Rate Limiting:** Applied via middleware in `src/lib/security/rateLimitMiddleware.ts` with different limits for login, API, exports
- **Security Logging:** All security events logged to SecurityLog table via SecurityService
- **WAF Headers:** CSP, HSTS, X-Frame-Options configured in `src/middleware.ts`
- **Session Management:** JWT-based sessions with NextAuth v5 (30-minute timeout, 5-minute activity renewal)
- **Inactivity Detection:** Client-side auto-logout after 30 minutes of inactivity with 2-minute warning
- **Password Security:** Strong password requirements (8+ chars, uppercase, lowercase, number), bcrypt hashing, audit logging

**Environment Variables Required:**
- `ENCRYPTION_KEY` - 32-byte base64 key for AES-256-GCM (generate with `openssl rand -base64 32`)
- `NEXTAUTH_SECRET` - NextAuth secret key
- `DATABASE_URL` - PostgreSQL connection string (use `sslmode=require` in production)

### 7. Sistema de Encriptación (AES-256-GCM)

**Ubicación**: `/src/lib/security/encryption.ts`

**Algoritmo**: AES-256-GCM con PBKDF2 (100,000 iteraciones)

#### Campos Encriptados Automáticamente
- `Client.phone` - Números de teléfono
- `IndividualProfile.taxId` - DNI/NIE/Pasaporte
- `BusinessProfile.taxId` - CIF/Tax ID empresarial
- `Client.address` - Direcciones completas

#### Funciones Principales

**Encriptación/Desencriptación Básica**:
```typescript
import { EncryptionService } from '@/lib/security/encryption'

// Encriptar
const encrypted = EncryptionService.encrypt(plaintext)

// Desencriptar
const plaintext = EncryptionService.decrypt(encrypted)

// Desencriptar seguro (no lanza error si falla)
const plaintext = EncryptionService.decryptSafe(encrypted)
```

**Helpers Específicos por Tipo de Dato**:
```typescript
// DNI/Tax IDs
const encryptedDNI = EncryptionService.encryptDNI(dni)
const dni = EncryptionService.decryptDNI(encryptedDNI)

// Teléfonos
const encryptedPhone = EncryptionService.encryptPhone(phone)
const phone = EncryptionService.decryptPhone(encryptedPhone)

// IBAN
const encryptedIBAN = EncryptionService.encryptIBAN(iban)
const iban = EncryptionService.decryptIBAN(encryptedIBAN)

// Direcciones
const encryptedAddress = EncryptionService.encryptAddress(address)
const address = EncryptionService.decryptAddress(encryptedAddress)
```

**Funciones de Máscara (Para UI)**:
```typescript
// Máscara genérica
EncryptionService.maskData('1234567890', 4) // → "******7890"

// Máscaras específicas
EncryptionService.maskDNI('12345678Z')      // → "****5678Z"
EncryptionService.maskPhone('+34612345678') // → "****5678"
EncryptionService.maskIBAN('ES1234567890')  // → "ES****7890"
EncryptionService.maskEmail('user@example.com') // → "us***@example.com"
```

**Hashing One-Way (Para Comparaciones)**:
```typescript
// Generar hash
const hash = await EncryptionService.hash(data)

// Comparar
const isMatch = await EncryptionService.compareHash(data, hash)

// Token seguro aleatorio
const token = EncryptionService.generateSecureToken(32) // 32 bytes
```

#### Patrón de Uso en Servicios

**IMPORTANTE**: Nunca acceder campos encriptados directamente desde Prisma. Siempre usar servicios:

```typescript
// ❌ INCORRECTO - Campos encriptados no legibles
const client = await prisma.client.findUnique({ where: { id } })
console.log(client.phone) // → "base64_encrypted_data..."

// ✅ CORRECTO - ClientService desencripta automáticamente
const client = await clientService.getById(id)
console.log(client.phone) // → "+34 612 34 56 78"
```

#### Seguridad y Consideraciones

**⚠️ CRÍTICO - ENCRYPTION_KEY es INMUTABLE**:
- Cambiar `ENCRYPTION_KEY` invalida TODOS los datos encriptados existentes
- No hay forma de recuperar datos si se pierde la key
- Almacenar en vault seguro (AWS Secrets Manager, 1Password, Azure Key Vault)
- NUNCA commitear a Git
- NUNCA regenerar en producción

**Generación Segura**:
```bash
# Generar ENCRYPTION_KEY (32 bytes base64)
openssl rand -base64 32

# O usar el script del proyecto
npm run security:generate
```

**Formato de Datos Encriptados**:
```
base64(salt[64 bytes] + iv[16 bytes] + authTag[16 bytes] + encryptedData)
```

**Performance**:
- PBKDF2 iterations: 100,000 (balancea seguridad/velocidad)
- Cache de claves derivadas en memoria durante la sesión
- Operaciones son síncronas (no async) para simplificar uso

### 8. Rate Limiting y Control de Tráfico

**Ubicación**: `/src/lib/security/rateLimiter.ts`

**Implementación**: In-memory para desarrollo, Redis-ready para producción

#### Configuraciones Predefinidas

| Nombre | Límite | Ventana | Uso |
|--------|--------|---------|-----|
| `LOGIN` | 5 intentos | 15 min | Login attempts |
| `API_GENERAL` | 100 requests | 15 min | APIs generales |
| `CREATE_RESOURCE` | 20 creaciones | 1 hora | POST/PUT endpoints |
| `EXPORT` | 10 exportaciones | 1 hora | Exportar datos |
| `COMMUNICATION` | 50 mensajes | 1 hora | Envío de emails/SMS |
| `PASSWORD_CHANGE` | 3 cambios | 1 hora | Cambio de contraseña |

#### Uso en Código

```typescript
import { RateLimiterConfig, checkRateLimit } from '@/lib/security/rateLimiter'

// En API route
export async function POST(request: NextRequest) {
  const ip = getClientIP(request)

  // Verificar rate limit
  const { allowed, remaining, resetTime } = await checkRateLimit(
    RateLimiterConfig.LOGIN,
    ip
  )

  if (!allowed) {
    return NextResponse.json(
      {
        error: 'Too many attempts',
        retryAfter: resetTime
      },
      { status: 429 }
    )
  }

  // Continuar con lógica normal
}
```

#### Rate Limiting por Identificador

```typescript
// Por IP
checkRateLimit(config, ip)

// Por email (para prevenir ataques distribuidos)
checkRateLimit(config, email)

// Por userId (después de autenticación)
checkRateLimit(config, userId)
```

#### Configuración para Producción (Redis)

**⚠️ IMPORTANTE - Multi-Instancia**:
La implementación in-memory NO funciona con múltiples instancias de la aplicación. Cada instancia tiene su propio store en memoria.

**Solución: Redis Adapter**

```env
# .env.production
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
# O con autenticación
REDIS_URL=redis://username:password@host:port/db
```

**Pattern Preparado**:
El código ya tiene el patrón de adapter preparado para Redis:
```typescript
class RateLimiterAsync {
  // Implementación lista para Redis
  // Ubicación: src/lib/security/rateLimiter.ts
}
```

#### Obtener IP Real del Cliente

```typescript
import { getClientIP } from '@/lib/security/rateLimiter'

const ip = getClientIP(request)
// Maneja: x-forwarded-for, x-real-ip, x-client-ip
// Fallback: connection.remoteAddress
```

#### Monitoreo y Alertas

Los límites excedidos se registran automáticamente en `SecurityLog`:
```typescript
SecurityService.logEvent({
  eventType: 'RATE_LIMIT_EXCEEDED',
  severity: 'WARNING',
  ipAddress: ip,
  description: `Rate limit exceeded for ${config.name}`
})
```

### 9. Sistemas de Amortización (5 Tipos)

**Ubicación**: `/src/lib/calculations/`

LendCore soporta 5 sistemas de amortización diferentes. El tipo **AMERICAN es el más usado** (99% de casos).

#### Tipo 1: AMERICAN (Default - 99% de casos)

**Archivo**: `amortization-american.ts`

**Características**:
- **Cuotas 1 a n-1**: Solo intereses (capital = €0)
- **Cuota n (última)**: Todo el capital + intereses del último período
- **Ventaja**: Pagos mensuales muy bajos durante el plazo

**Ejemplo**:
```
Préstamo: €10,000 a 12 meses, 2% mensual
Cuota 1-11: €200 (solo interés)
Cuota 12: €10,200 (capital + interés final)
```

**Uso**:
```typescript
import { calculateAmericanAmortization } from '@/lib/calculations/amortization-american'

const schedule = calculateAmericanAmortization({
  principal: 10000,
  monthlyRate: 0.02,
  termMonths: 12,
  firstDueDate: new Date('2026-04-01')
})
```

#### Tipo 2: FRENCH (Cuotas Fijas)

**Archivo**: `amortization-french.ts`

**Características**:
- **Todas las cuotas**: Monto igual
- **Distribución**: Al inicio más interés, al final más capital
- **Ventaja**: Cuota predecible mensualmente

**Fórmula**:
```
Cuota = Principal × [r(1+r)^n] / [(1+r)^n - 1]
```

**Ejemplo**:
```
Préstamo: €10,000 a 12 meses, 2% mensual
Todas las cuotas: €946.54
```

#### Tipo 3: GERMAN (Cuotas Decrecientes)

**Archivo**: `amortization-german.ts`

**Características**:
- **Capital**: Fijo en cada cuota (Principal / n)
- **Intereses**: Decrecientes sobre saldo pendiente
- **Ventaja**: Menor interés total pagado

**Ejemplo**:
```
Préstamo: €10,000 a 12 meses, 2% mensual
Cuota 1: €1,033.33 (€833.33 capital + €200 interés)
Cuota 12: €850.00 (€833.33 capital + €16.67 interés)
```

#### Tipo 4: SIMPLE (Una Sola Cuota)

**Características**:
- Una sola cuota al vencimiento
- Todo el capital + intereses al final
- Para préstamos muy cortos (1-3 meses)

#### Tipo 5: CUSTOM (Personalizado)

**Características**:
- Configuración manual de cada cuota
- Permite cronogramas irregulares
- Útil para casos especiales

#### Orquestador Universal

**Archivo**: `amortization.ts`

```typescript
import { calculateLoanSummary } from '@/lib/calculations/amortization'

const { installments, summary } = calculateLoanSummary({
  principalAmount: 10000,
  amortizationType: 'AMERICAN', // o FRENCH, GERMAN, SIMPLE, CUSTOM
  interestType: 'PERCENTAGE_MONTHLY',
  interestRate: 0.02, // 2% mensual
  termMonths: 12,
  paymentFrequency: 'MONTHLY',
  firstDueDate: new Date('2026-04-01')
})

// installments: Array de cuotas con principal, interest, totalPayment
// summary: { totalInterest, totalPayment, effectiveRate }
```

#### Tipos de Interés Soportados

```typescript
enum InterestType {
  FIXED_AMOUNT = 'FIXED_AMOUNT',           // Monto fijo (€100)
  PERCENTAGE_MONTHLY = 'PERCENTAGE_MONTHLY', // % mensual (2%)
  PERCENTAGE_ANNUAL = 'PERCENTAGE_ANNUAL'    // % anual (24%)
}
```

#### Frecuencias de Pago

```typescript
enum PaymentFrequency {
  WEEKLY = 'WEEKLY',       // Semanal
  BIWEEKLY = 'BIWEEKLY',   // Quincenal
  MONTHLY = 'MONTHLY',     // Mensual (más común)
  QUARTERLY = 'QUARTERLY'  // Trimestral
}
```

#### Prórroga de Préstamos

**Endpoint**: `POST /api/loans/[id]/extend`

```typescript
// Request
{
  additionalMonths: 6,
  newInterestRate: 0.025 // opcional, mantiene tasa actual si no se especifica
}

// Response
{
  success: true,
  loan: { ... },
  newInstallments: [ ... ]
}
```

**Proceso**:
1. Valida que el préstamo esté ACTIVE
2. Reasigna capital pendiente de última cuota
3. Genera nuevas cuotas con el capital reasignado
4. Aplica nueva tasa de interés si se especifica
5. Todo en transacción atómica
6. Auditoría automática del cambio

**Uso desde servicio**:
```typescript
import { loanService } from '@/services/loanService'

await loanService.extend(loanId, 6, 0.025)
```

### 10. Algoritmo de Asignación de Pagos (Waterfall FIFO)

**Ubicación**: `/src/lib/calculations/allocation.ts`

El sistema usa un algoritmo **Waterfall FIFO** para asignar pagos a las cuotas pendientes.

#### Prioridad de Aplicación (Waterfall)

1. **Penalties** (Penalizaciones por mora) - Primera prioridad
2. **Interest** (Intereses devengados) - Segunda prioridad
3. **Principal** (Capital del préstamo) - Tercera prioridad

#### Orden de Cuotas (FIFO)

Las cuotas se procesan en orden de vencimiento (First In, First Out):
- Cuota más antigua primero
- Luego la siguiente más antigua
- Y así sucesivamente

#### Flujo del Algoritmo

```typescript
// 1. Obtener cuotas no pagadas completamente, ordenadas por vencimiento
const unpaidInstallments = await prisma.installment.findMany({
  where: {
    loanId,
    status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] }
  },
  orderBy: { dueDate: 'asc' } // FIFO
})

let remainingPayment = paymentAmount

// 2. Para cada cuota (en orden cronológico)
for (const installment of unpaidInstallments) {
  if (remainingPayment <= 0) break

  // A. Aplicar a penalización primero
  if (installment.pendingPenalty > 0) {
    const penaltyPayment = Math.min(remainingPayment, installment.pendingPenalty)
    await allocateToPenalty(installment.id, penaltyPayment)
    remainingPayment -= penaltyPayment
  }

  // B. Luego aplicar a interés
  if (remainingPayment > 0 && installment.pendingInterest > 0) {
    const interestPayment = Math.min(remainingPayment, installment.pendingInterest)
    await allocateToInterest(installment.id, interestPayment)
    remainingPayment -= interestPayment
  }

  // C. Finalmente aplicar a capital
  if (remainingPayment > 0 && installment.pendingPrincipal > 0) {
    const principalPayment = Math.min(remainingPayment, installment.pendingPrincipal)
    await allocateToPrincipal(installment.id, principalPayment)
    remainingPayment -= principalPayment
  }

  // D. Actualizar estado de la cuota
  await updateInstallmentStatus(installment.id)
}

// 3. Si queda dinero, se considera sobrepago
if (remainingPayment > 0) {
  await handleOverpayment(loanId, remainingPayment)
}
```

#### Registro de Asignación

Cada componente del pago se registra en `PaymentAllocation`:

```typescript
await prisma.paymentAllocation.create({
  data: {
    paymentId,
    installmentId,
    principalAmount,  // Cuánto se aplicó a capital
    interestAmount,   // Cuánto se aplicó a interés
    penaltyAmount     // Cuánto se aplicó a penalizaciones
  }
})
```

#### Actualización de Estados

Después de cada asignación, el estado de la cuota se actualiza:

```typescript
if (pendingPrincipal === 0 && pendingInterest === 0 && pendingPenalty === 0) {
  status = 'PAID'
} else if (paidPrincipal > 0 || paidInterest > 0 || paidPenalty > 0) {
  status = 'PARTIAL'
} else if (dueDate < today) {
  status = 'OVERDUE'
} else {
  status = 'PENDING'
}
```

#### Ejemplo Completo

```typescript
// Préstamo con 3 cuotas:
// Cuota 1 (vencida): €100 capital + €10 interés + €5 penalización = €115
// Cuota 2 (vencida): €100 capital + €10 interés + €2 penalización = €112
// Cuota 3 (pendiente): €100 capital + €10 interés = €110

// Pago de €150

// Asignación:
// Cuota 1: €5 penalty + €10 interest + €100 principal = €115 → PAID
// Cuota 2: €2 penalty + €10 interest + €23 principal = €35 → PARTIAL
// Cuota 3: €0 (no se toca hasta que Cuota 2 esté PAID)

// Total usado: €150
// Cuota 1: PAID
// Cuota 2: PARTIAL (quedan €77 de principal pendiente)
```

#### Transaccionalidad

**CRÍTICO**: Todo el proceso de asignación ocurre en una transacción Prisma:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Crear Payment
  const payment = await tx.payment.create({ ... })

  // 2. Crear PaymentAllocations
  for (const allocation of allocations) {
    await tx.paymentAllocation.create({ ... })
  }

  // 3. Actualizar Installments
  for (const installment of installments) {
    await tx.installment.update({ ... })
  }

  // 4. Actualizar Loan totals
  await tx.loan.update({ ... })

  // 5. Crear AuditLog
  await tx.auditLog.create({ ... })
})
```

Si cualquier paso falla, se hace rollback automático.

---

## Key Patterns & Conventions

### Loan Amortization Types (NUEVO - Marzo 2026)

**IMPORTANTE:** El cliente usa préstamos tipo AMERICANO en el 99% de los casos.

**5 tipos de amortización disponibles:**

1. **AMERICAN** (Default - 99% de casos):
   - Cuotas 1 a n-1: Solo intereses (capital = 0)
   - Cuota n (última): Todo el capital + intereses
   - Ventaja: Cuotas muy bajas durante el plazo
   - Archivo: `src/lib/calculations/amortization-american.ts`

2. **FRENCH** (Cuotas fijas):
   - Todas las cuotas iguales
   - Al inicio más interés, al final más capital
   - Archivo: `src/lib/calculations/amortization-french.ts`

3. **GERMAN** (Cuotas decrecientes):
   - Capital fijo, intereses decrecientes
   - Menos interés total
   - Archivo: `src/lib/calculations/amortization-german.ts`

4. **SIMPLE** (Una sola cuota):
   - Todo al final
   - Para préstamos muy cortos

5. **CUSTOM** (Personalizado):
   - Configuración manual

**Uso en código:**
```typescript
import { calculateLoanSummary } from '@/lib/calculations/amortization'

const { installments, summary } = calculateLoanSummary({
  principalAmount: 1000,
  amortizationType: 'AMERICAN', // Default
  interestType: 'PERCENTAGE_MONTHLY',
  interestRate: 0.01,
  termMonths: 2,
  paymentFrequency: 'MONTHLY',
  firstDueDate: new Date(),
})
```

**Componentes UI disponibles:**
- `LoanTypeSelector` - Selector visual de tipos
- `LoanSchedulePreview` - Preview del cronograma en tiempo real

### Spanish Locale

All dates, currency, and validations use Spanish formats:
- **Currency:** EUR (€) formatted with `formatCurrency()` from `src/lib/formatters/currency.ts`
- **Dates:** dd/mm/yyyy using date-fns with es-ES locale
- **Tax IDs:** DNI/NIE validation for individuals, CIF for businesses

### Data Flow for Core Operations

**Creating a Loan:**
1. Client submits CreditApplication (status: DRAFT)
2. Analyst reviews, changes status to UNDER_REVIEW
3. Admin approves (APPROVED) or rejects (REJECTED)
4. If approved, loanService creates Loan and generates Installments
5. Application status → DISBURSED

**Processing a Payment:**
1. Payment record created with amount and method
2. paymentService calls allocation algorithm
3. Allocation applies waterfall: penalties → interest → principal (FIFO on installments)
4. PaymentAllocation records created for each allocation type
5. Installment balances updated (paidPrincipal, paidInterest, paidPenalty)
6. Loan totals updated (totalPaid, outstandingPrincipal)

**Collection Workflow:**
1. System identifies overdue loans (installments past due date)
2. CollectionAction created with type (CALL, EMAIL, VISIT, etc.)
3. Collector updates action with result (PROMISE_MADE, NO_ANSWER, etc.)
4. If promise made, PaymentPromise created
5. System tracks promise fulfillment (KEPT, BROKEN, RENEGOTIATED)

### Role-Based Permissions

**Location:** `src/lib/constants/permissions.ts`

- **ADMIN:** Full access, user management, parameter configuration
- **ANALYST:** Create clients/loans, approve applications, view reports
- **COLLECTION:** Register payments, collection actions, view overdue accounts
- **VIEWER:** Read-only access to dashboard and reports

**Pattern:** Check permissions in API routes using `checkPermission()` helper.

### Form Validation

All forms use Zod schemas:
- **Location:** `src/lib/validations/`
- **Pattern:** Define schema → use with react-hook-form → validate on client and server
- **Examples:** `client.schema.ts`, `loan.schema.ts`, `application.schema.ts`

### Encrypted Fields Pattern

**Fields requiring encryption:** taxId (DNI/CIF), phone, address

**Pattern:**
```typescript
// Before saving
const encryptedData = EncryptionService.encrypt(plaintext)
await prisma.client.create({ data: { phone: encryptedData } })

// After reading
const decryptedData = EncryptionService.decrypt(encryptedData)
```

**Note:** clientService handles encryption/decryption automatically in its methods.

---

## Test Credentials (Development Only)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@lendcore.com | Admin123! |
| Analyst | analyst@lendcore.com | Analyst123! |
| Collection | collector@lendcore.com | Collector123! |

**Warning:** These credentials are seeded by `prisma/seed.ts` and should NEVER be used in production.

---

## Important Notes

### Before Making Changes

1. **Database schema changes:** Always create a migration with `npx prisma migrate dev --name description` after modifying `schema.prisma`
2. **Security-sensitive changes:** Review SECURITY.md and ensure rate limiting and logging are maintained
3. **Encrypted fields:** Never directly access encrypted fields without using EncryptionService
4. **Audit trail:** All write operations should create AuditLog entries via auditService
5. **Password changes:** Always log to AuditLog with `PASSWORD_CHANGED` action
6. **Production deployments:** Migrations run automatically via `postinstall` hook (`prisma migrate deploy`)

### Testing Database Changes

1. Make changes to `schema.prisma`
2. Run `npm run db:push` (development only - direct sync)
3. OR run `npm run db:migrate` to create a migration
4. Verify with `npm run db:studio`

### Common Pitfalls

- **Port conflicts:** Project runs on port 3001, not 3000
- **Missing Prisma client:** Run `npx prisma generate` if you see "PrismaClient not found"
- **Encryption errors:** Ensure ENCRYPTION_KEY is set in .env (must be 32-byte base64 string)
- **Date formatting:** Always use formatDate() from `src/lib/formatters/date.ts` to ensure Spanish format
- **Production enum errors:** After adding enum values to Prisma schema, migrations must be deployed to production DB
- **Session timeout:** Users are auto-logged out after 30 minutes of inactivity (configurable in `src/lib/auth.ts`)
- **Toast notifications:** Must have `<Toaster />` in root layout for success/error messages to display

---

## Testing y QA

### Scripts de Testing Disponibles

```bash
npm run smoke:real                # Test de sistema completo end-to-end
npm run validate:roles:flows      # Validación de permisos por rol
npm run qa:ui:delivery            # Tests E2E con Playwright
```

### Smoke Tests (`smoke-real-system.ts`)

**Propósito**: Validar el sistema completo con un flujo realista de datos.

**Qué hace**:
1. Crea clientes (individuales + empresas)
2. Genera solicitudes de crédito (aprobadas + rechazadas)
3. Crea préstamos con diferentes tipos de amortización
4. Registra pagos y prueba asignación automática
5. Simula cobranza (acciones + promesas de pago)
6. Genera todos los tipos de reportes
7. Valida trazabilidad de auditoría

**Ejecución**:
```bash
npm run smoke:real

# Mantener datos para inspección
KEEP_SMOKE_DATA=1 npm run smoke:real
```

**Cleanup**: Por defecto, los datos se limpian automáticamente. Usar `KEEP_SMOKE_DATA=1` para mantenerlos.

### Tests de Roles (`validate-role-workflows.ts`)

**Propósito**: Validar permisos y restricciones por rol.

**Roles Probados**:
- ADMIN - Acceso completo
- ANALYST - Crear clientes/préstamos, aprobar solicitudes
- COLLECTION - Registrar pagos, gestión de cobranza
- VIEWER - Solo lectura

**Qué valida**:
- Permisos de creación/edición/eliminación
- Restricciones de acceso a endpoints
- Workflows específicos por rol

### UI E2E Tests (`ui-delivery-qa.ts`)

**Propósito**: Tests end-to-end con Playwright.

**Requiere**: App corriendo en `http://localhost:3001`

**Ejecución**:
```bash
# Asegurar que la app está corriendo
npm run dev

# En otra terminal
npm run qa:ui:delivery
```

**Genera**:
```
artifacts/ui-delivery-qa/[timestamp]/
├── screenshots/     # Capturas de cada paso
├── downloads/       # PDFs/reportes descargados
└── report.md        # Reporte markdown de resultados
```

**Configuración**:
- Headless mode por defecto
- Cambiar a visual: Modificar `headless: false` en el script

---

## Formatters Avanzados

**Ubicación**: `/src/lib/formatters/`

### Currency Formatters

```typescript
import { formatCurrency, formatCurrencyCompact, parseEuropeanNumber } from '@/lib/formatters/currency'

// Standard
formatCurrency(1234.56)           // → "1.234,56 €"

// Compact (para gráficos)
formatCurrencyCompact(1200000)    // → "1,2M €"
formatCurrencyCompact(45000)      // → "45K €"

// Parsing de input europeo
parseEuropeanNumber("1.234,56")   // → 1234.56
parseEuropeanNumber("1.234.567,89") // → 1234567.89

// Porcentajes
formatPercentage(0.035)           // → "3,5%"
formatPercentage(3.5)             // → "3,5%" (detecta automáticamente)
```

### Date Formatters

```typescript
import {
  formatDate,
  formatDateLong,
  formatRelativeDate,
  parseSpanishDate
} from '@/lib/formatters/date'

// Formatos estándar
formatDate(new Date())            // → "15/03/2026"
formatDateLong(new Date())        // → "15 de marzo de 2026"
formatDateTime(new Date())        // → "15/03/2026 14:30"

// Fechas relativas
formatRelativeDate(yesterday)     // → "Ayer"
formatRelativeDate(twoDaysAgo)    // → "hace 2 días"
formatRelativeDate(tomorrow)      // → "Mañana"
formatRelativeDate(inThreeDays)   // → "en 3 días"

// Parsing desde input
parseSpanishDate("15/03/2026")    // → Date object
parseSpanishDate("31/02/2026")    // → null (inválido)

// Para inputs HTML
formatForInput(new Date())        // → "2026-03-15" (formato YYYY-MM-DD)
```

### Number Formatters

```typescript
import { formatNumber } from '@/lib/formatters/currency'

formatNumber(1234567.89)          // → "1.234.567,89"
```

**Importante**: Todos usan locale `es-ES` para consistencia.

---

## Sistema de Notificaciones (Zustand)

**Ubicación**: `/src/lib/notifications/notificationStore.ts`

### Uso Básico

```typescript
import { notify } from '@/lib/notifications/notificationStore'

// Notificaciones genéricas
notify.success('Operación completada exitosamente')
notify.error('Error al procesar la solicitud')
notify.warning('Atención: límite de crédito cerca del máximo')
notify.info('Nueva actualización disponible')
```

### Notificaciones Contextuales de Dominio

```typescript
// Pago recibido
notify.paymentReceived(1500, 'Juan Pérez', 'client-123')
// → "Pago recibido: €1.500,00 de Juan Pérez" + enlace al cliente

// Préstamo vencido
notify.loanOverdue('LOAN-001', 15, 'client-456')
// → "Préstamo LOAN-001 vencido hace 15 días" + enlace al préstamo

// Promesa rota
notify.promiseBroken('María López', 800, 'client-789')
// → "Promesa de pago rota: María López (€800,00)" + enlace al cliente

// Solicitud pendiente
notify.applicationPending('Carlos García', 'app-012')
// → "Nueva solicitud de Carlos García pendiente de revisión" + enlace
```

### Tipos de Notificación

| Tipo | Color | Icono | Duración |
|------|-------|-------|----------|
| `success` | Verde | ✓ | 5s |
| `error` | Rojo | ✗ | 7s |
| `warning` | Amarillo | ⚠ | 6s |
| `info` | Azul | ℹ | 5s |

### Características

- **Auto-dismiss**: Se cierran automáticamente después de X segundos
- **Click to dismiss**: Click en la notificación para cerrar
- **Enlaces contextuales**: Notificaciones de dominio incluyen enlaces a la entidad
- **Stack unlimited**: Sin límite de notificaciones simultáneas
- **Persistencia**: No persisten entre recargas (solo en sesión actual)

### Configuración del Store

```typescript
// Acceder al store directamente
import { useNotificationStore } from '@/lib/notifications/notificationStore'

const { notifications, addNotification, removeNotification, clearAll } = useNotificationStore()
```

---

## Sistema de Vistas Guardadas (Zustand)

**Ubicación**: `/src/lib/filters/savedViewsStore.ts`

### Contextos Soportados

El sistema soporta vistas guardadas para diferentes módulos:

- `clients` - Vistas de clientes
- `loans` - Vistas de préstamos
- `payments` - Vistas de pagos
- `collection` - Vistas de cobranza
- `applications` - Vistas de solicitudes

### Operadores de Filtro

```typescript
type FilterOperator =
  | 'equals'        // Igualdad exacta
  | 'contains'      // Contiene texto
  | 'greaterThan'   // Mayor que
  | 'lessThan'      // Menor que
  | 'between'       // Entre dos valores
  | 'in'            // En lista de valores
```

### Uso del Store

```typescript
import { useSavedViewsStore, buildQueryFromFilters } from '@/lib/filters/savedViewsStore'

const {
  views,           // Todas las vistas del contexto
  activeView,      // Vista actualmente activa
  setActiveView,   // Activar una vista
  saveView,        // Guardar nueva vista
  updateView,      // Actualizar vista existente
  deleteView       // Eliminar vista
} = useSavedViewsStore()

// Guardar una vista nueva
saveView('clients', {
  name: 'Clientes High Risk',
  filters: [
    { field: 'riskLevel', operator: 'equals', value: 'HIGH' },
    { field: 'creditLimit', operator: 'greaterThan', value: 10000 }
  ],
  sorting: { field: 'creditLimit', direction: 'desc' }
})

// Activar una vista
setActiveView('clients', viewId)

// Construir query params desde filtros
const filters = [
  { field: 'status', operator: 'equals', value: 'ACTIVE' }
]
const queryParams = buildQueryFromFilters(filters)
// → "?status=ACTIVE"
```

### Vistas Predefinidas del Sistema

El sistema incluye vistas predefinidas para cobranza:

```typescript
// Cobranza Crítica (>90 días)
{
  name: 'Casos Críticos',
  filters: [
    { field: 'daysOverdue', operator: 'greaterThan', value: 90 }
  ],
  isSystemView: true
}

// Cobranza Alta (31-90 días)
{
  name: 'Prioridad Alta',
  filters: [
    { field: 'daysOverdue', operator: 'between', value: [31, 90] }
  ],
  isSystemView: true
}
```

### Persistencia

- **LocalStorage**: Las vistas se guardan en localStorage
- **Por usuario**: Cada usuario tiene sus propias vistas
- **Sincronización**: Se cargan al iniciar sesión

---

## Configuración Avanzada

### Variables de Entorno (Completo)

#### Requeridas para Desarrollo

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/lendcore?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="your-secret-here-min-32-chars"

# Encryption
ENCRYPTION_KEY="your-base64-key-32-bytes"

# App
NODE_ENV="development"
PORT="3001"
```

#### Requeridas para Producción

```env
# Database (con SSL)
DATABASE_URL="postgresql://user:pass@host:5432/lendcore?sslmode=require"

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="production-secret-different-from-dev"

# Encryption (NUNCA cambiar después del primer deploy)
ENCRYPTION_KEY="production-key-store-in-vault"

# App
NODE_ENV="production"

# Security Alerts
SECURITY_ALERT_ENABLED="true"
SECURITY_ALERT_EMAIL="admin@your-domain.com"

# SMTP (para alertas)
SMTP_HOST="smtp.your-provider.com"
SMTP_PORT="587"
SMTP_USER="noreply@your-domain.com"
SMTP_PASSWORD="your-smtp-password"
SMTP_FROM="LendCore <noreply@your-domain.com>"
```

#### Opcionales (Recomendadas para Producción)

```env
# Rate Limiting con Redis (multi-instancia)
REDIS_ENABLED="true"
REDIS_URL="redis://username:password@host:6379/0"

# Analytics (si se implementa)
ANALYTICS_ENABLED="false"
```

### Scripts de Seguridad

#### Generar Secrets Seguros

```bash
npm run security:generate
```

**Genera**:
- `ENCRYPTION_KEY` - 32 bytes en base64
- `NEXTAUTH_SECRET` - 32+ caracteres aleatorios
- Instrucciones para almacenar en vault

**Output**:
```
🔐 Security Keys Generated Successfully
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ENCRYPTION_KEY=AbCd1234... (base64, 32 bytes)
NEXTAUTH_SECRET=XyZ9876... (32+ chars)

⚠️  CRITICAL: Store these in a secure vault!
   - AWS Secrets Manager
   - Azure Key Vault
   - 1Password / LastPass
   - NEVER commit to Git
```

#### Validar Configuración

```bash
npm run security:validate-env
```

**Valida**:
- ✓ Formato de DATABASE_URL (postgresql://)
- ✓ ENCRYPTION_KEY es base64 válido y 32+ bytes
- ✓ NEXTAUTH_SECRET tiene 32+ caracteres
- ✗ Detecta valores de ejemplo (REPLACE, EXAMPLE, changeme)
- ✓ Si SECURITY_ALERT_ENABLED=true, valida SMTP completo
- ✓ Si REDIS_ENABLED=true, valida REDIS_URL

**Uso en CI/CD**:
```bash
# Fallar build si configuración inválida
NODE_ENV=production npm run security:validate-env || exit 1
```

### Configuración TypeScript

**⚠️ RECOMENDACIÓN**: El proyecto actualmente tiene `strict: false` en `tsconfig.json`.

Para mejor type safety en producción:

```json
{
  "compilerOptions": {
    "strict": true,  // Cambiar de false a true
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Impacto**: Requerirá arreglar tipos en ~30-40 archivos, pero previene bugs.

### Deployment en Vercel

#### Postinstall Hook Automático

```json
{
  "scripts": {
    "postinstall": "prisma generate && prisma migrate deploy"
  }
}
```

**Qué hace en cada deploy**:
1. Regenera Prisma Client con el schema actual
2. Aplica migraciones pendientes a la base de datos
3. Falla el deploy si las migraciones fallan (safe by default)

#### Checklist Pre-Deploy

- [ ] `npm run build` pasa localmente sin errores
- [ ] `npm run security:validate-env` pasa en producción
- [ ] `ENCRYPTION_KEY` almacenado en vault seguro (AWS Secrets, 1Password)
- [ ] `DATABASE_URL` usa `sslmode=require`
- [ ] Variables de entorno configuradas en Vercel Dashboard
- [ ] Migraciones commiteadas a Git en `/prisma/migrations/`
- [ ] Health check funciona: `curl https://domain.com/api/health/security`
- [ ] Redis configurado si se espera multi-instancia
- [ ] SMTP configurado para alertas de seguridad

#### Post-Deploy Verification

```bash
# 1. Verificar health endpoint
curl https://your-domain.com/api/health/security

# Respuesta esperada:
# {
#   "status": "healthy",
#   "checks": {
#     "encryptionKey": true,
#     "database": true,
#     "securityLog": true,
#     ...
#   }
# }

# 2. Verificar que las migraciones se aplicaron
# Revisar logs de deployment en Vercel

# 3. Test de login
# Intentar login y verificar que SecurityLog registra el evento

# 4. Test de rate limiting
# Intentar 6 logins fallidos y verificar bloqueo
```

---

## Additional Documentation

- **README.md** - Setup, installation, deployment guide, and security checklist
- **SECURITY.md** - Detailed security implementation
- **ACCESSIBILITY.md** - WCAG 2.1 AA compliance details
- **DESIGN-SYSTEM.md** - UI design guidelines and color palette
- **DEVELOPMENT.md** - Development environment setup
- **PRODUCTION-SECURITY-CHECKLIST.md** - Pre-deployment security checklist

## Recent Updates (March 2026)

### Major CLAUDE.md Documentation Overhaul
- ✅ **Section 7: Sistema de Encriptación (AES-256-GCM)** - Comprehensive encryption documentation with code examples, security warnings, and patterns
- ✅ **Section 8: Rate Limiting y Control de Tráfico** - Complete rate limiting guide with Redis-ready patterns for production
- ✅ **Section 9: Sistemas de Amortización (5 Tipos)** - Detailed documentation of all 5 amortization types (AMERICAN, FRENCH, GERMAN, SIMPLE, CUSTOM) with examples and loan extension patterns
- ✅ **Section 10: Algoritmo de Asignación de Pagos (Waterfall FIFO)** - Full payment allocation algorithm documentation with transaction patterns
- ✅ **Expanded Service Layer** - Added documentation for collectionDashboardService, collectorService, promiseService, parameterService, reportService, creditLimitService
- ✅ **Expanded API Layer** - Complete endpoint tree with 40+ documented endpoints including quick-action, promises, parameters, health checks, and search
- ✅ **Testing & QA Section** - Comprehensive guide for smoke tests, role validation, and UI E2E tests with Playwright
- ✅ **Formatters Avanzados** - Complete formatter documentation for currency (standard + compact), dates (multiple formats), and European number parsing
- ✅ **Sistema de Notificaciones (Zustand)** - Full notification system documentation with generic and contextual domain notifications
- ✅ **Sistema de Vistas Guardadas (Zustand)** - Saved views system with filter operators and multi-context support
- ✅ **Configuración Avanzada** - Complete environment variables for dev/prod, security scripts, TypeScript config recommendations, and deployment checklists

### Security Enhancements
- ✅ 30-minute session timeout with activity-based renewal
- ✅ Client-side inactivity detection with 2-minute warning dialog
- ✅ Password change functionality with strong validation (8+ chars, uppercase, lowercase, number)
- ✅ Password changes audited to AuditLog with `PASSWORD_CHANGED` action
- ✅ Toast notification system integrated globally via `<Toaster />` in root layout
- ✅ Automatic database migrations on Vercel deployments via `postinstall` hook

### Technical Improvements
- ✅ Transactional password updates with audit logging
- ✅ Improved error handling in API routes with `success` flag validation
- ✅ Login page shows timeout message when redirected after session expiration
- ✅ Loading state with spinner during login process

### Documentation Quality
- ✅ Silicon Valley professional-level documentation standards
- ✅ Code examples for all critical patterns
- ✅ Security warnings (⚠️) for critical operations
- ✅ Cross-referenced sections for better navigation
- ✅ Production-ready checklists and validation scripts
