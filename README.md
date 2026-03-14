# JEAN PAUL Servicios Financieros - Sistema de Gestión de Préstamos Privados

Sistema profesional de gestión de préstamos privados para operación interna, cobranza y seguimiento comercial.

## 🚀 Características

- ✅ **Autenticación segura** con NextAuth v5 y roles RBAC
- ✅ **Dashboard ejecutivo** con KPIs en tiempo real
- ✅ **Gestión de clientes** (personas físicas y empresas)
- ✅ **Gestión de préstamos** con cronogramas automáticos
- ✅ **Motor de intereses** flexible y configurable
- ✅ **Sistema de pagos** con asignación automática
- ✅ **Módulo de cobranza** con alertas y seguimiento
- ✅ **Reportes avanzados** y analítica
- ✅ **Auditoría completa** de todas las operaciones
- ✅ **Formato español** (EUR, fechas dd/mm/yyyy, validación DNI/CIF)

## 📋 Requisitos Previos

- Node.js 18+
- PostgreSQL 14+
- npm o yarn

## 🛠️ Instalación

### 1. Clonar el repositorio (si aplica) o navegar al directorio

```bash
cd "/Users/pablocisneros/Desktop/PROYECTOS TRABAJO PROGRAMACION /PROYECTO PRESTAMOS ESPAÑA"
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crear archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

Editar `.env` con tus valores:

```env
# Database
DATABASE_URL="postgresql://usuario:password@localhost:5432/lendcore?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="tu-secret-key-super-seguro-cambiar-en-produccion"

# App
NODE_ENV="development"
```

### 4. Configurar la base de datos

#### Opción A: PostgreSQL Local

```bash
# Crear base de datos
createdb lendcore

# O con psql
psql -U postgres
CREATE DATABASE lendcore;
\q
```

#### Opción B: PostgreSQL con Docker

```bash
docker run --name lendcore-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=lendcore \
  -p 5432:5432 \
  -d postgres:16
```

### 5. Ejecutar migraciones de Prisma

```bash
# Generar cliente de Prisma
npx prisma generate

# Aplicar schema a la base de datos
npx prisma db push

# Poblar con datos de prueba
npm run db:seed
```

### 6. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3001](http://localhost:3001) en el navegador.

## 🔑 Credenciales de Prueba

Después de ejecutar el seed, puedes usar estas credenciales:

| Rol | Email | Contraseña |
|-----|-------|------------|
| **Administrador** | admin@lendcore.com | Admin123! |
| **Analista** | analyst@lendcore.com | Analyst123! |
| **Cobranza** | collector@lendcore.com | Collector123! |

## 📁 Estructura del Proyecto

```
lendcore/
├── prisma/
│   ├── schema.prisma          # Modelo de datos completo
│   └── seed.ts                # Datos de prueba
├── src/
│   ├── app/
│   │   ├── (auth)/login       # Página de login
│   │   ├── (dashboard)/       # Área autenticada
│   │   │   ├── page.tsx       # Dashboard ejecutivo
│   │   │   ├── clientes/      # Módulo de clientes
│   │   │   └── prestamos/     # Módulo de préstamos
│   │   └── api/auth/          # API de autenticación
│   ├── components/
│   │   ├── ui/                # Componentes base (shadcn)
│   │   ├── layout/            # Sidebar, Header
│   │   ├── dashboard/         # KPI Cards, gráficos
│   │   └── shared/            # Componentes compartidos
│   ├── lib/
│   │   ├── auth.ts            # Configuración NextAuth
│   │   ├── prisma.ts          # Cliente Prisma
│   │   ├── formatters/        # Formateo EUR, fechas
│   │   └── constants/         # Permisos, estados
│   └── types/                 # TypeScript types
└── package.json
```

## 🗄️ Base de Datos

### Ver datos con Prisma Studio

```bash
npm run db:studio
```

Se abrirá una interfaz web en [http://localhost:5555](http://localhost:5555)

### Comandos útiles de Prisma

```bash
# Generar cliente después de cambios en schema
npx prisma generate

# Aplicar cambios a la DB (desarrollo)
npx prisma db push

# Crear migración (producción)
npx prisma migrate dev --name descripcion_cambio

# Resetear DB (CUIDADO: borra todos los datos)
npx prisma migrate reset
```

## 🎨 Stack Tecnológico

- **Framework**: Next.js 15 (App Router)
- **Base de datos**: PostgreSQL + Prisma ORM
- **Autenticación**: NextAuth v5
- **UI**: Tailwind CSS + shadcn/ui
- **Formularios**: React Hook Form + Zod
- **Gráficos**: Recharts
- **Tablas**: TanStack Table
- **Fechas**: date-fns (locale es-ES)
- **TypeScript**: Strict mode

## 🔒 Roles y Permisos

| Acción | Admin | Analista | Cobranza | Viewer |
|--------|-------|----------|----------|--------|
| Ver dashboard | ✅ | ✅ | ✅ | ✅ |
| Crear clientes | ✅ | ✅ | ❌ | ❌ |
| Crear préstamos | ✅ | ✅ | ❌ | ❌ |
| Registrar pagos | ✅ | ✅ | ✅ | ❌ |
| Aprobar solicitudes | ✅ | ❌ | ❌ | ❌ |
| Gestión de usuarios | ✅ | ❌ | ❌ | ❌ |
| Ver auditoría | ✅ | ❌ | ❌ | ❌ |

## 📊 Módulos Implementados

### ✅ Fase 1 - Base del Sistema
- [x] Autenticación y roles
- [x] Layout profesional con sidebar
- [x] Dashboard ejecutivo con KPIs
- [x] Scaffold de clientes
- [x] Scaffold de préstamos

### ✅ Estado Actual
- [x] CRUD operativo de clientes
- [x] Flujo completo de solicitudes y aprobación
- [x] Gestión de préstamos y cronogramas
- [x] Pagos con asignación automática
- [x] Cobranza, promesas y reportes
- [x] Auditoría y seguridad endurecida

## 🐛 Troubleshooting

### Error de conexión a PostgreSQL

```bash
# Verificar que PostgreSQL está corriendo
pg_isready

# Verificar la URL de conexión en .env
echo $DATABASE_URL
```

### Error "Prisma Client not found"

```bash
# Regenerar cliente de Prisma
npx prisma generate
```

### Puerto 3001 ocupado

```bash
# Usar otro puerto
PORT=3001 npm run dev
```

## 📝 Scripts Disponibles

```bash
npm run dev                    # Servidor de desarrollo
npm run build                  # Build de producción
npm run start                  # Servidor de producción
npm run lint                   # Ejecutar ESLint
npm run db:push                # Aplicar schema a DB
npm run db:studio              # Abrir Prisma Studio
npm run db:seed                # Poblar DB con datos de prueba
npm run security:generate      # Generar ENCRYPTION_KEY y NEXTAUTH_SECRET seguros
npm run security:validate-env  # Validar configuración de environment
```

## 🚀 Deploy a Producción

### 1. Preparar Configuración de Producción

```bash
# Generar secrets seguros (ENCRYPTION_KEY + NEXTAUTH_SECRET)
npm run security:generate

# Crear archivo de producción
cp .env.production.example .env.production

# Editar .env.production con los valores generados
# IMPORTANTE: Nunca commitear .env.production a Git
```

### 2. Validar Configuración Antes de Deploy

```bash
# Validar todas las variables de entorno
NODE_ENV=production npm run security:validate-env

# Verificar que no haya valores de ejemplo
# El script fallará si detecta REPLACE_WITH o valores inseguros
```

### 3. Variables de Entorno Obligatorias

| Variable | Descripción | Cómo generar |
|----------|-------------|--------------|
| `DATABASE_URL` | PostgreSQL con SSL | Neon, Supabase, Railway |
| `NEXTAUTH_SECRET` | Secret para NextAuth | `npm run security:generate` |
| `ENCRYPTION_KEY` | Key AES-256-GCM (32 bytes) | `npm run security:generate` |
| `NEXTAUTH_URL` | URL de producción | `https://yourdomain.com` |
| `SMTP_*` | Configuración email | Proveedor SMTP |
| `SECURITY_ALERT_EMAIL` | Email para alertas | Email admin |

### 4. Deployment en Vercel (Recomendado)

```bash
# 1. Push código a GitHub (sin .env.production)
git add .
git commit -m "deploy: production ready"
git push origin main

# 2. Importar en Vercel
# https://vercel.com/new

# 3. Configurar Environment Variables en Vercel Dashboard
# - Pegar valores de .env.production
# - Marcar como "Production" scope
# - IMPORTANTE: Usar sslmode=require en DATABASE_URL

# 4. Deploy automático
```

### 5. Checklist de Seguridad Pre-Deploy

- [ ] `npm run security:validate-env` pasa sin errores
- [ ] `ENCRYPTION_KEY` generado con `openssl rand -base64 32`
- [ ] `NEXTAUTH_SECRET` diferente al de desarrollo
- [ ] `DATABASE_URL` usa `sslmode=require`
- [ ] `SECURITY_ALERT_ENABLED=true` en producción
- [ ] `SECURITY_ALERT_EMAIL` configurado
- [ ] SMTP configurado para alertas por email
- [ ] Backup de `ENCRYPTION_KEY` guardado de forma segura (AWS Secrets, 1Password)
- [ ] `.env.production` NO está en Git
- [ ] Build de producción ejecutado: `npm run build`

### 6. Post-Deploy

```bash
# Verificar health endpoint
curl https://yourdomain.com/api/health/security

# Respuesta esperada:
# {
#   "status": "healthy",
#   "encryption": true,
#   "rateLimit": true,
#   "timestamp": "..."
# }
```

### 7. Monitoreo

- Verificar logs de Vercel primeras 24h
- Probar login con rate limiting (6 intentos fallidos)
- Verificar que lleguen emails de alertas de seguridad
- Revisar tabla `SecurityLog` en Prisma Studio

### ⚠️ ADVERTENCIAS CRÍTICAS

1. **ENCRYPTION_KEY es inmutable**
   - Cambiar la key invalida todos los datos encriptados (DNI, teléfonos, direcciones)
   - Hacer backup en secrets manager (AWS Secrets, GCP Secret Manager)
   - NUNCA regenerar en producción

2. **Base de datos en producción**
   - Usar PostgreSQL con SSL/TLS (`sslmode=require`)
   - Backups automáticos diarios
   - Connection pooling (PgBouncer, Supabase Pooler)

3. **Secrets en Vercel**
   - Nunca usar valores de ejemplo en producción
   - El validador rechazará builds con secrets inseguros

## 📄 Licencia

Proyecto privado - Todos los derechos reservados

## 👤 Contacto

Sistema desarrollado para JEAN PAUL Servicios Financieros

---

**🎉 ¡El sistema está listo para usarse!**

Navega a http://localhost:3001/login y usa las credenciales de prueba.
