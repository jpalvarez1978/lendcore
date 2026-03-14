# 🔒 Guía de Seguridad - JEAN PAUL Servicios Financieros

Este documento explica las medidas de seguridad implementadas en el sistema y cómo configurarlas.

---

## 📋 Tabla de Contenidos

1. [Rate Limiting](#rate-limiting)
2. [Auditoría de Seguridad](#auditoría-de-seguridad)
3. [Encriptación de Datos](#encriptación-de-datos)
4. [Configuración](#configuración)
5. [Dashboard de Seguridad](#dashboard-de-seguridad)
6. [Mejores Prácticas](#mejores-prácticas)

---

## 1. Rate Limiting

### ¿Qué es?
Limita el número de peticiones que un usuario o IP puede hacer en un período de tiempo para prevenir ataques de fuerza bruta y abuso de APIs.

### Configuraciones Predefinidas

| Acción | Límite | Ventana | Bloqueo |
|--------|--------|---------|---------|
| **Login** | 5 intentos | 15 minutos | 30 minutos |
| **API General** | 100 requests | 1 minuto | - |
| **Crear Recursos** | 20 por hora | 1 hora | - |
| **Exportación** | 10 por hora | 1 hora | 10 minutos |
| **SMS/Email** | 5 por hora | 1 hora | 1 hora |
| **Cambio de Contraseña** | 3 intentos | 1 hora | 2 horas |

### Uso en APIs

```typescript
import { withLoginRateLimit, withExportRateLimit, withCreateRateLimit } from '@/lib/security/rateLimitMiddleware'

// En tu API route:
export async function POST(request: NextRequest) {
  // Rate limiting para login
  const rateLimitResponse = await withLoginRateLimit(request, email)
  if (rateLimitResponse) {
    return rateLimitResponse // 429 Too Many Requests
  }

  // Tu lógica aquí...
}
```

### Respuesta cuando se excede el límite

```json
{
  "error": "Demasiadas peticiones. Bloqueado por 30 minutos",
  "retryAfter": "2024-03-15T14:30:00.000Z",
  "blockedUntil": "2024-03-15T14:30:00.000Z"
}
```

Headers HTTP:
```
Status: 429 Too Many Requests
Retry-After: 1800
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2024-03-15T14:30:00.000Z
```

---

## 2. Auditoría de Seguridad

### Eventos Registrados Automáticamente

#### ✅ Login Exitoso
```typescript
SecurityService.logLoginSuccess(userId, email, ipAddress, userAgent)
```

**Registra:**
- ID de usuario
- Email
- IP del cliente
- User-Agent (navegador)
- Timestamp

#### ❌ Login Fallido
```typescript
SecurityService.logLoginFailed(email, ipAddress, reason, userAgent)
```

**Registra:**
- Email que intentó acceder
- Razón del fallo: "Contraseña incorrecta", "Usuario no encontrado", "Usuario INACTIVE"
- Contador de intentos fallidos recientes
- IP y User-Agent

**Severidad automática:**
- 1-2 intentos: `INFO`
- 3-4 intentos: `WARNING`
- 5+ intentos: `ALERT` (envía notificación)

#### 🔑 Cambio de Contraseña
```typescript
SecurityService.logPasswordChange(userId, email, ipAddress)
```

#### 👤 Cambio de Permisos
```typescript
SecurityService.logPermissionChange(
  adminId, adminEmail,
  targetUserId, targetEmail,
  oldRole, newRole,
  ipAddress
)
```

#### 🚨 Actividad Sospechosa

El sistema detecta automáticamente:
- **Múltiples IPs**: Más de 3 IPs diferentes en 1 hora
- **Actividad excesiva**: Más de 50 acciones en 1 hora
- **Cambios geográficos imposibles**: Login desde Madrid y 10 min después desde Tokio

```typescript
SecurityService.logSuspiciousActivity(
  userId,
  email,
  ipAddress,
  'Múltiples IPs en corto tiempo',
  { ipCount: 5, ips: ['1.2.3.4', '5.6.7.8', ...] }
)
```

#### 📊 Exportación Masiva
```typescript
SecurityService.logMassExport(userId, email, ipAddress, 1500, 'clientes')
```

- Si exporta >1000 registros → Severidad `WARNING`

#### 🔒 Acceso No Autorizado
```typescript
SecurityService.logUnauthorizedAccess(
  userId,
  email,
  ipAddress,
  '/api/admin/users',
  'ADMIN_ONLY'
)
```

### Ver Logs de Seguridad

**API Endpoint:**
```bash
GET /api/security/logs?limit=50&severity=ALERT
```

**Filtros disponibles:**
- `limit`: Número de registros (default: 50)
- `severity`: INFO | WARNING | ALERT | CRITICAL

**Estadísticas:**
```bash
GET /api/security/stats?days=7
```

Retorna:
```json
{
  "totalEvents": 1234,
  "failedLogins": 45,
  "suspiciousActivities": 3,
  "rateLimitExceeded": 12,
  "daysAnalyzed": 7
}
```

---

## 3. Encriptación de Datos

### ¿Qué datos se encriptan?

| Campo | Modelo | Encriptación |
|-------|--------|--------------|
| DNI/NIE/CIF | Client | AES-256-GCM |
| Teléfono | Client | AES-256-GCM |
| Email | Client (opcional) | AES-256-GCM |
| IBAN | Client | AES-256-GCM |
| Dirección | Client | AES-256-GCM |

### Algoritmo

- **AES-256-GCM**: Encriptación simétrica con autenticación
- **PBKDF2**: Derivación de clave con 100,000 iteraciones
- **Salt único**: Cada valor encriptado tiene su propio salt
- **IV aleatorio**: Initialization Vector único por operación
- **Auth Tag**: Verifica integridad del dato

### Formato de dato encriptado

```
[Salt 64 bytes] + [IV 16 bytes] + [Auth Tag 16 bytes] + [Encrypted Data]
Todo codificado en Base64
```

### Uso en el Código

#### Encriptar

```typescript
import { encryptDNI, encryptPhone, encryptIBAN, encryptAddress } from '@/lib/security/encryption'

await prisma.client.create({
  data: {
    dni: encryptDNI('12345678A'),
    phone: encryptPhone('612345678'),
    iban: encryptIBAN('ES79 2100 0813 6101 2345 6789'),
    address: encryptAddress('Calle Mayor 15, Madrid'),
  }
})
```

#### Desencriptar

```typescript
import { decryptDNI, decryptPhone, decryptIBAN, decryptAddress } from '@/lib/security/encryption'

const client = await prisma.client.findUnique({ where: { id } })

const dniPlainText = decryptDNI(client.dni)           // "12345678A"
const phonePlainText = decryptPhone(client.phone)     // "612345678"
const ibanPlainText = decryptIBAN(client.iban)        // "ES79210008136101234567"
```

#### Enmascarar (para mostrar en UI)

```typescript
import { maskDNI, maskPhone, maskIBAN, maskEmail } from '@/lib/security/encryption'

// En la UI, mostrar datos enmascarados:
const dniMasked = maskDNI('12345678A')         // "*****678A"
const phoneMasked = maskPhone('612345678')     // "*****5678"
const ibanMasked = maskIBAN('ES79...')         // "ES79***************6789"
const emailMasked = maskEmail('juan@ex.com')   // "j***@ex.com"
```

### Migración de Datos Existentes

Si tienes datos en **texto plano** en la BD, usa `encryptIfNeeded`:

```typescript
import { encryptIfNeeded } from '@/lib/security/encryption'

// Encripta solo si NO está ya encriptado
const encryptedDNI = encryptIfNeeded(client.dni)
```

---

## 4. Configuración

### Variables de Entorno Requeridas

Copia `.env.example` a `.env` y configura:

```bash
# Security - Encryption (CRÍTICO)
ENCRYPTION_KEY="tu-clave-aqui"
```

### Generar Clave de Encriptación

```bash
# En macOS/Linux:
openssl rand -base64 32

# Resultado (ejemplo):
# kX9mN2pQ4wR5tY6uI8oP0aS1dF3gH7jK9lZ2xC4vB5nM1

# Copia ese valor a .env:
ENCRYPTION_KEY="kX9mN2pQ4wR5tY6uI8oP0aS1dF3gH7jK9lZ2xC4vB5nM1"
```

⚠️ **IMPORTANTE:**
- **NUNCA** subas `.env` a Git
- **Cambia la clave** en producción (diferente a desarrollo)
- **Guarda un backup** de la clave en un lugar seguro (ej: 1Password)
- Si pierdes la clave, **NO podrás desencriptar** los datos

### Actualizar Schema de Prisma

Ejecuta la migración para agregar el modelo `SecurityLog`:

```bash
npx prisma migrate dev --name add_security_logging
```

---

## 5. Dashboard de Seguridad

### Componente

```tsx
import { SecurityDashboard } from '@/components/security/SecurityDashboard'

// En tu página de administración:
export default function SecurityPage() {
  return (
    <div className="p-6">
      <h1>Seguridad del Sistema</h1>
      <SecurityDashboard />
    </div>
  )
}
```

### Características

- **KPI Cards**: Total eventos, logins fallidos, actividad sospechosa, rate limits
- **Tabla de Logs**: Filtrable por severidad
- **Refresh automático**
- **Filtros**: INFO, WARNING, ALERT, CRITICAL

### Permisos

Solo usuarios con rol `ADMIN` pueden acceder.

---

## 6. Mejores Prácticas

### ✅ DO (Hacer)

1. **Rotar claves periódicamente** (cada 6-12 meses)
2. **Monitorear logs de seguridad** al menos semanalmente
3. **Revisar alertas CRITICAL** inmediatamente
4. **Hacer backups encriptados** de la BD
5. **Usar HTTPS** en producción (siempre)
6. **Limitar acceso por IP** en entornos críticos
7. **Habilitar logs de auditoría** para todas las operaciones financieras

### ❌ DON'T (No hacer)

1. **NO** uses la misma clave en desarrollo y producción
2. **NO** guardes claves en el código
3. **NO** ignores alertas de severidad `ALERT` o `CRITICAL`
4. **NO** desactives rate limiting en producción
5. **NO** muestres datos desencriptados en logs
6. **NO** permitas exportaciones masivas sin supervisión
7. **NO** reutilices contraseñas entre sistemas

---

## 📞 Soporte

Si detectas una vulnerabilidad de seguridad:
1. **NO** la publiques públicamente
2. Contacta a: seguridad@lendcore.es
3. Incluye detalles técnicos y pasos para reproducir
4. Recibirás respuesta en <48 horas

---

## 📚 Referencias

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Crypto Docs](https://nodejs.org/api/crypto.html)
- [GDPR Compliance](https://gdpr.eu/)
- [PCI DSS](https://www.pcisecuritystandards.org/)

---

**Última actualización:** 2024-03-15
**Versión:** 1.0
