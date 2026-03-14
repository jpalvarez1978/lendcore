# 🛡️ Patrón de Rate Limiting para APIs

## APIs con Rate Limiting Implementado

✅ `/api/clients` - GET (100/min), POST (20/hora)
✅ `/api/loans` - GET (100/min), POST (20/hora)
✅ `/api/collection/quick-action` - POST (20/hora)

## Patrón a Seguir

```typescript
// 1. Importar helpers
import { withCreateRateLimit, withAPIRateLimit, withExportRateLimit } from '@/lib/security/rateLimitMiddleware'

// 2. En GET (lectura):
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Rate limiting: 100 requests/min
  const rateLimitResponse = await withAPIRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  // Tu lógica...
}

// 3. En POST (creación):
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Rate limiting: 20 creaciones/hora
  const rateLimitResponse = await withCreateRateLimit(request, session.user.id)
  if (rateLimitResponse) return rateLimitResponse

  // Tu lógica...
}

// 4. Para exportaciones:
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Rate limiting: 10 exports/hora
  const rateLimitResponse = await withExportRateLimit(request, session.user.id)
  if (rateLimitResponse) return rateLimitResponse

  // Tu lógica...
}
```

## APIs Pendientes de Implementar

- [ ] `/api/payments/route.ts`
- [ ] `/api/applications/route.ts`
- [ ] `/api/promises/route.ts`
- [ ] `/api/search/route.ts`
- [ ] `/api/parameters/route.ts`
- [ ] `/api/reports/*` (usar withExportRateLimit)
- [ ] `/api/audit/export` (usar withExportRateLimit)

## Testing

```bash
# Test rate limiting
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/clients \
    -H "Content-Type: application/json" \
    -d '{"type":"INDIVIDUAL","firstName":"Test"}' \
    -w "\nStatus: %{http_code}\n"
done

# Esperado: 5 requests OK (201), 6to request bloqueado (429)
```
