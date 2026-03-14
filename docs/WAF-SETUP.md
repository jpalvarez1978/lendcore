# 🛡️ Configuración de WAF (Web Application Firewall)

Este documento explica cómo configurar un WAF para proteger LendCore contra ataques comunes.

---

## 📋 Índice

1. [Qué es un WAF](#qué-es-un-waf)
2. [Cloudflare WAF (Recomendado)](#cloudflare-waf-recomendado)
3. [AWS WAF](#aws-waf)
4. [Protecciones Implementadas en Código](#protecciones-implementadas-en-código)
5. [Testing](#testing)

---

## 🤔 Qué es un WAF

Un **Web Application Firewall** es un firewall que filtra, monitorea y bloquea tráfico HTTP/HTTPS malicioso antes de que llegue a tu aplicación.

### Protege contra:
- ✅ **SQL Injection** - Inyección de código SQL malicioso
- ✅ **XSS (Cross-Site Scripting)** - Inyección de scripts maliciosos
- ✅ **DDoS** - Ataques de denegación de servicio
- ✅ **Bot attacks** - Bots maliciosos, scrapers
- ✅ **CSRF** - Cross-Site Request Forgery
- ✅ **Path Traversal** - Acceso a archivos del sistema
- ✅ **Rate Limiting avanzado** - Control de tráfico por país/IP/patrón
- ✅ **Zero-day exploits** - Vulnerabilidades desconocidas

### Diferencia con protecciones en código:
| Protección | En Código | WAF Externo |
|------------|-----------|-------------|
| SQL Injection | ✅ Básica | ✅✅ Avanzada con ML |
| DDoS | ❌ Limitado | ✅✅ Red global |
| Bot Detection | ✅ Básica | ✅✅ Fingerprinting avanzado |
| Geo-blocking | ❌ | ✅✅ Por país/región |
| Performance | ⚠️ Consume recursos | ✅ Offload al WAF |

**Conclusión:** Combinar ambos es lo ideal.

---

## ☁️ Cloudflare WAF (Recomendado)

### ¿Por qué Cloudflare?
- ✅ **Fácil de configurar** (15 minutos)
- ✅ **Plan gratuito** con protecciones básicas
- ✅ **CDN incluido** (mejora velocidad)
- ✅ **200+ puntos de presencia** global
- ✅ **Reglas gestionadas** actualizadas automáticamente
- ✅ **DDoS protection** incluido

### Planes
| Plan | Precio | Ideal para |
|------|--------|------------|
| **Free** | 0€/mes | Desarrollo, pruebas |
| **Pro** | 20€/mes | Startups, empresas pequeñas |
| **Business** | 200€/mes | Empresas medianas (Recomendado para producción) |
| **Enterprise** | Custom | Bancos, fintech grandes |

---

## 📝 Setup Cloudflare WAF (Paso a Paso)

### **Paso 1: Crear Cuenta**

1. Ve a https://dash.cloudflare.com/sign-up
2. Crea cuenta con email corporativo
3. Verifica email

### **Paso 2: Agregar Dominio**

1. Click "Add a Site"
2. Ingresa tu dominio: `lendcore.es`
3. Selecciona plan (empieza con **Free**)
4. Click "Continue"

### **Paso 3: Cambiar DNS**

Cloudflare te mostrará 2 nameservers:
```
NAMESERVER 1: alice.ns.cloudflare.com
NAMESERVER 2: bob.ns.cloudflare.com
```

Ve a tu proveedor de dominio (ej: Namecheap, GoDaddy, IONOS) y cambia los nameservers:

**Ejemplo en Namecheap:**
1. Login → Domain List → Manage
2. Nameservers → Custom DNS
3. Pega los nameservers de Cloudflare
4. Save

⏱️ **Espera 5-30 minutos** para propagación DNS.

### **Paso 4: Configurar SSL/TLS**

1. En Cloudflare Dashboard → SSL/TLS
2. Selecciona modo: **Full (strict)** ✅
   - `Off` ❌ No usar
   - `Flexible` ❌ No seguro
   - `Full` ⚠️ OK pero no verifica certificado
   - `Full (strict)` ✅ **Recomendado** (requiere cert válido en servidor)

3. Edge Certificates → Habilitar:
   - ✅ Always Use HTTPS
   - ✅ Automatic HTTPS Rewrites
   - ✅ Opportunistic Encryption

### **Paso 5: Configurar Firewall Rules**

#### **5.1 Reglas Básicas (Free)**

1. Security → WAF
2. Click "Create rule"

**Regla 1: Bloquear países no deseados**
```
Field: Country
Operator: does not equal
Value: ES, FR, PT, IT, DE, GB
Action: Block
```
Esto solo permite tráfico desde España y países vecinos europeos.

**Regla 2: Bloquear bots conocidos**
```
Field: User Agent
Operator: contains
Value: sqlmap
Action: Block
```

**Regla 3: Proteger login**
```
Field: URI Path
Operator: equals
Value: /api/auth/callback/credentials
AND
Field: Request Count
Operator: greater than
Value: 5 requests per 10 minutes
Action: Block
```

#### **5.2 Reglas Avanzadas (Pro/Business)**

**Managed Rules (Solo Pro+):**
1. Security → WAF → Managed Rules
2. Habilitar:
   - ✅ **Cloudflare OWASP Core Ruleset** (Protección contra Top 10 OWASP)
   - ✅ **Cloudflare Managed Ruleset** (Protección general)
   - ✅ **Cloudflare Exposed Credentials Check** (Detecta credenciales filtradas)

**Rate Limiting Avanzado:**
1. Security → WAF → Rate limiting rules
2. Crear regla:
```yaml
Rule name: API Rate Limit
If incoming requests match:
  - URI Path contains "/api/"

When rate exceeds:
  - 100 requests per 1 minute

Then:
  - Block for 10 minutes
```

### **Paso 6: Configurar Page Rules (Optimización)**

1. Rules → Page Rules
2. Crear reglas:

**Regla 1: Cache de estáticos**
```
URL: lendcore.es/*.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: 1 week
```

**Regla 2: No cache en API**
```
URL: lendcore.es/api/*
Settings:
  - Cache Level: Bypass
```

**Regla 3: No cache en dashboard**
```
URL: lendcore.es/dashboard/*
Settings:
  - Cache Level: Bypass
  - Security Level: High
```

### **Paso 7: Configurar Bot Fight Mode**

1. Security → Bots
2. Free plan: Habilitar **Bot Fight Mode**
3. Pro+ plan: Habilitar **Super Bot Fight Mode**

Configuración recomendada:
- ✅ Definitely automated → Block
- ✅ Likely automated → Challenge (CAPTCHA)
- ⚠️ Verified bots (Google, Bing) → Allow

### **Paso 8: Habilitar DDoS Protection**

1. Security → DDoS
2. Ya viene habilitado por defecto ✅
3. En Business+: Configurar sensibilidad:
   - Sensitivity: **Medium** (Recomendado)
   - Override: Solo si tienes falsos positivos

### **Paso 9: Analytics y Monitoring**

1. Analytics → Security
2. Ver dashboard:
   - Requests blocked
   - Threats detected
   - Top attack types
   - Top attacking countries

3. Configurar alertas:
   - Notifications → Add
   - Tipo: Security Events
   - Email: seguridad@lendcore.es

---

## 🔧 Configuración en tu Aplicación

### Headers ya implementados

En `src/middleware.ts` ya están configurados:
```typescript
Content-Security-Policy: ... ✅
Strict-Transport-Security: max-age=31536000 ✅
X-Frame-Options: DENY ✅
X-Content-Type-Options: nosniff ✅
```

### Cloudflare forwarded headers

Cuando usas Cloudflare, obtén la IP real del cliente así:

```typescript
// src/lib/security/rateLimiter.ts - YA IMPLEMENTADO
export function getClientIP(request: Request): string {
  // Cloudflare forwarded IP
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  if (cfConnectingIP) return cfConnectingIP

  // Fallback
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()

  return '127.0.0.1'
}
```

### Testing con Cloudflare

```bash
# Ver headers de Cloudflare
curl -I https://lendcore.es

# Deberías ver:
# cf-ray: 8a1b2c3d4e5f6g7h-MAD
# cf-cache-status: HIT
# server: cloudflare
```

---

## ☁️ AWS WAF (Alternativa)

### ¿Cuándo usar AWS WAF?

- ✅ Ya usas AWS (EC2, ECS, Lambda)
- ✅ Necesitas integración con AWS services
- ✅ Quieres control total de reglas

### Setup Básico

1. **Crear Web ACL**
```bash
aws wafv2 create-web-acl \
  --name LendCoreWAF \
  --scope REGIONAL \
  --default-action Allow={} \
  --rules file://waf-rules.json \
  --region eu-west-1
```

2. **Archivo waf-rules.json**
```json
[
  {
    "Name": "RateLimitRule",
    "Priority": 1,
    "Statement": {
      "RateBasedStatement": {
        "Limit": 2000,
        "AggregateKeyType": "IP"
      }
    },
    "Action": {
      "Block": {}
    },
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "RateLimitRule"
    }
  },
  {
    "Name": "SQLiProtection",
    "Priority": 2,
    "Statement": {
      "ManagedRuleGroupStatement": {
        "VendorName": "AWS",
        "Name": "AWSManagedRulesSQLiRuleSet"
      }
    },
    "OverrideAction": {
      "None": {}
    },
    "VisibilityConfig": {
      "SampledRequestsEnabled": true,
      "CloudWatchMetricsEnabled": true,
      "MetricName": "SQLiProtection"
    }
  }
]
```

3. **Asociar con ALB/CloudFront**
```bash
aws wafv2 associate-web-acl \
  --web-acl-arn arn:aws:wafv2:eu-west-1:123456789:regional/webacl/LendCoreWAF/abc123 \
  --resource-arn arn:aws:elasticloadbalancing:eu-west-1:123456789:loadbalancer/app/lendcore/xyz789
```

---

## ✅ Protecciones Implementadas en Código

Ya implementadas en `src/middleware.ts`:

| Ataque | Detección | Acción |
|--------|-----------|--------|
| SQL Injection | `union select`, `drop table` en URL | Block 403 |
| XSS | `<script`, `javascript:` en URL | Block 403 |
| Path Traversal | `../../../` en URL | Block 403 |
| Malicious Bots | `sqlmap`, `nikto` en User-Agent | Block 403 |
| Clickjacking | Header X-Frame-Options | DENY |
| MIME Sniffing | Header X-Content-Type-Options | nosniff |

---

## 🧪 Testing

### Test 1: SQL Injection
```bash
curl "https://lendcore.es/api/clients?id=1%20union%20select"
# Esperado: 403 Forbidden
```

### Test 2: XSS
```bash
curl "https://lendcore.es/search?q=<script>alert(1)</script>"
# Esperado: 403 Forbidden
```

### Test 3: Path Traversal
```bash
curl "https://lendcore.es/../../../../etc/passwd"
# Esperado: 403 Forbidden
```

### Test 4: Rate Limiting
```bash
for i in {1..10}; do
  curl -X POST https://lendcore.es/api/auth/callback/credentials \
    -d "email=test@test.com&password=wrong"
done
# Esperado: 429 Too Many Requests después de 5 intentos
```

### Test 5: Headers de Seguridad
```bash
curl -I https://lendcore.es
# Verificar headers:
# - Content-Security-Policy ✅
# - Strict-Transport-Security ✅
# - X-Frame-Options: DENY ✅
# - X-Content-Type-Options: nosniff ✅
```

---

## 📊 Monitoreo

### Cloudflare Analytics

1. Dashboard → Analytics → Security
2. Revisar semanalmente:
   - Requests blocked (normal: <1%)
   - Top threats
   - Top attacking IPs → considerar blacklist permanente

### Logs de Aplicación

```bash
# Ver logs de ataques bloqueados
grep "Attack attempt blocked" logs/application.log

# Ver IPs bloqueadas
grep "Malicious bot blocked" logs/application.log | awk '{print $6}' | sort | uniq -c
```

---

## 💰 Costos

### Cloudflare
- **Free**: 0€ → OK para desarrollo
- **Pro**: 20€/mes → Startups
- **Business**: 200€/mes → **Recomendado para producción financiera**

### AWS WAF
- **Web ACL**: $5/mes
- **Rules**: $1/regla/mes
- **Requests**: $0.60 por millón

**Ejemplo 1M requests/mes:**
- Cloudflare Business: 200€ flat
- AWS WAF: ~$10 (más barato si bajo tráfico)

---

## 🎯 Recomendación Final

Para LendCore (aplicación financiera):

✅ **Cloudflare Business** (200€/mes)

**Incluye:**
- WAF con reglas gestionadas (OWASP Top 10)
- DDoS protection ilimitado
- CDN global (mejora velocidad)
- SSL/TLS automático
- Bot protection avanzado
- Soporte 24/7
- SLA 100% uptime

**Setup en 1 hora, protección inmediata.**

---

## 📞 Soporte

- Cloudflare Docs: https://developers.cloudflare.com/waf
- AWS WAF Docs: https://docs.aws.amazon.com/waf
- OWASP Top 10: https://owasp.org/www-project-top-ten

---

**Última actualización:** 2024-03-15
