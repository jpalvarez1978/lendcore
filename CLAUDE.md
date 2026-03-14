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

### Security & Testing
```bash
npx tsx scripts/security-check.ts              # Run security validation
curl http://localhost:3001/api/health/security # Check security health endpoint
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
├── auth/[...nextauth]/     # NextAuth authentication
├── clients/                # Client CRUD
├── loans/                  # Loan management
├── applications/           # Credit applications
├── payments/               # Payment processing
├── collection/             # Collection actions
├── promises/               # Payment promises
├── reports/                # Reports (portfolio, aging, collection)
├── audit/                  # Audit log retrieval
├── security/               # Security logs and stats
├── parameters/             # System parameters
├── search/                 # Global search
└── health/security/        # Security health check
```

**Pattern:** API routes use services, apply rate limiting middleware, and handle NextAuth session validation.

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
- **Session Management:** JWT-based sessions with NextAuth v5

**Environment Variables Required:**
- `ENCRYPTION_KEY` - 32-byte base64 key for AES-256-GCM (generate with `openssl rand -base64 32`)
- `NEXTAUTH_SECRET` - NextAuth secret key
- `DATABASE_URL` - PostgreSQL connection string

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

1. **Database schema changes:** Always create a migration with `npm run db:migrate` before modifying `schema.prisma`
2. **Security-sensitive changes:** Review SECURITY.md and ensure rate limiting and logging are maintained
3. **Encrypted fields:** Never directly access encrypted fields without using EncryptionService
4. **Audit trail:** All write operations should create AuditLog entries via auditService

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

---

## Additional Documentation

- **README.md** - Setup and installation
- **QUICK-START.md** - Fast startup guide
- **SECURITY.md** - Detailed security implementation
- **ACCESSIBILITY.md** - WCAG 2.1 AA compliance details
- **DESIGN-SYSTEM.md** - UI design guidelines and color palette
- **DEVELOPMENT.md** - Development environment setup
- **PRODUCTION-SECURITY-CHECKLIST.md** - Pre-deployment security checklist
