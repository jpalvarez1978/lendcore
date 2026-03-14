# 🛠️ Guía de Desarrollo - JEAN PAUL Servicios Financieros

## Credenciales de Desarrollo

**IMPORTANTE:** Estas credenciales son SOLO para entorno de desarrollo local. NO usar en producción.

### Usuarios de Prueba

**Administrador:**
- Email: `admin@lendcore.com`
- Contraseña: `Admin123!`
- Permisos: Todos

**Analista:**
- Email: `analyst@lendcore.com`
- Contraseña: `Analyst123!`
- Permisos: Ver clientes, préstamos, crear clientes y originar operaciones

**Cobranza:**
- Email: `collector@lendcore.com`
- Contraseña: `Collector123!`
- Permisos: Ver clientes, gestionar cobranza, registrar acciones

**Visualizador:**
- Email: `viewer@lendcore.com`
- Contraseña: `viewer123`
- Permisos: Solo lectura

---

## Setup Local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Generar clave de encriptación
openssl rand -base64 32
# Copiar resultado a .env como ENCRYPTION_KEY

# 4. Ejecutar migraciones
npx prisma migrate dev

# 5. (Opcional) Seed de base de datos
npx prisma db seed

# 6. Ejecutar servidor de desarrollo
npm run dev
```

---

## Testing

```bash
# Validación de seguridad
npx tsx scripts/security-check.ts

# Health check
curl http://localhost:3001/api/health/security
```

---

## Producción

⚠️ **ANTES de desplegar:**
1. Cambiar TODAS las contraseñas de usuarios
2. Usar ENCRYPTION_KEY diferente a desarrollo
3. Configurar Cloudflare WAF
4. Revisar `PRODUCTION-SECURITY-CHECKLIST.md`
