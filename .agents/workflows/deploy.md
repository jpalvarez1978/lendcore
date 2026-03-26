---
description: Cómo hacer deploy de cambios a producción www.jpalvarez.org
---

# Deploy a Producción — www.jpalvarez.org

// turbo-all

## Contexto del Proyecto

- **Proyecto:** LendCore (Sistema de préstamos privados)
- **Cliente:** Jean Paul Álvarez
- **URL de Producción:** https://www.jpalvarez.org
- **Puerto de Desarrollo Local:** 3001

## Infraestructura del Cliente (NO es la del desarrollador)

| Servicio | Cuenta | Detalle |
|----------|--------|---------|
| **GitHub** | `jpalvarez1978/lendcore` | Repo principal — Vercel conectado aquí |
| **Vercel** | Cuenta de Jean Paul | Dominio `www.jpalvarez.org` configurado |
| **Supabase** | Cuenta de Jean Paul | Base de datos PostgreSQL de producción |

### Git Remotes configurados en local

```
origin   → https://github.com/pdcisneros1/lendcore.git   (fork del desarrollador)
cliente  → https://github.com/jpalvarez1978/lendcore.git  (repo del CLIENTE — conectado a Vercel)
```

## Flujo de Deploy (paso a paso)

### 1. Hacer los cambios en el código local

Trabajar en la ruta local del proyecto:
```
/Users/pablocisneros/Desktop/PROYECTOS TRABAJO PROGRAMACION /PROYECTO PRESTAMOS ESPAÑA/
```

### 2. Si hay cambios en el schema de Prisma

Regenerar el Prisma client:
```bash
npx prisma generate
```

Si se necesita una migración de base de datos, crear el archivo SQL manualmente en:
```
prisma/migrations/YYYYMMDDHHMMSS_nombre_descriptivo/migration.sql
```

> **IMPORTANTE:** El `.gitignore` del proyecto tiene `*.sql`, así que hay que forzar la adición:
> ```bash
> git add -f prisma/migrations/NOMBRE_MIGRACION/migration.sql
> ```

> **IMPORTANTE:** Las migraciones NO se aplican automáticamente en Vercel (el `postinstall` tiene fallback silencioso). Después del deploy, el usuario DEBE ejecutar el SQL manualmente en **Supabase → SQL Editor**. Proporcionar el SQL al usuario.

### 3. Verificar que compila

```bash
npm run build
```

El build debe terminar con `Exit code: 0`. Si hay errores de TypeScript, corregir antes de continuar.

### 4. Commit

```bash
git add .
git commit -m "descripción del cambio"
```

### 5. Push a AMBOS repositorios

```bash
# Push al repo del CLIENTE (dispara deploy en Vercel → www.jpalvarez.org)
git push cliente main

# Push al fork del desarrollador (backup)
git push origin main
```

### 6. Esperar deploy

Vercel tarda ~2-3 minutos en desplegar. El deploy se dispara automáticamente al recibir el push en `jpalvarez1978/lendcore`.

### 7. Verificar en producción

Abrir https://www.jpalvarez.org y verificar que los cambios están reflejados.

## Migraciones de Base de Datos

Las migraciones de Prisma **NO corren automáticamente** en producción porque:
1. `DIRECT_URL` puede no estar configurada en Vercel del cliente
2. El `postinstall` tiene `|| echo 'skipped'` como fallback

**Procedimiento:**
1. Crear el archivo `migration.sql` con el SQL necesario
2. Agregar con `git add -f`
3. Después del deploy, dar al usuario el SQL para ejecutar en **Supabase → SQL Editor**
4. Supabase mostrará una advertencia de "destructive operations" — es seguro confirmar

## Credenciales de Desarrollo

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@lendcore.com | Admin123! |
| Analyst | analyst@lendcore.com | Analyst123! |
| Collection | collector@lendcore.com | Collector123! |

> ⚠️ Estas son credenciales de SEED. En producción el cliente tiene sus propias credenciales.

## Reglas Críticas

1. **NO tocar código que funciona sin autorización** del usuario
2. **NO usar** el Vercel/Supabase/GitHub del desarrollador (pdcisneros1) para producción — son solo para desarrollo
3. **SIEMPRE** hacer push a `cliente` (no solo a `origin`) para que se refleje en www.jpalvarez.org
4. **SIEMPRE** verificar `npm run build` antes de push
5. Las migraciones SQL se entregan al usuario para ejecutar en Supabase
6. El proyecto corre en **puerto 3001** (no 3000)
