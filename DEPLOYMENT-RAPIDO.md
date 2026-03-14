# 🚀 Deployment Rápido - LendCore

**Tiempo estimado: 15 minutos**

---

## ✅ Estado Actual

- ✅ Proyecto creado en Vercel: `lendcore`
- ✅ Git inicializado
- ✅ Secrets de seguridad generados
- ✅ Scripts automatizados listos
- ⏳ Pendiente: Configurar Supabase y variables de entorno

---

## 📋 Pasos para Completar el Deployment

### Paso 1: Crear Base de Datos en Supabase (5 min)

1. Ve a: https://supabase.com/dashboard
2. Click en **"New Project"**
3. Configuración:
   - **Name:** `lendcore-production`
   - **Database Password:** (genera una segura y guárdala)
   - **Region:** Europe West (Frankfurt) `fra1`
   - **Pricing Plan:** Free (para empezar)
4. Click **"Create new project"**
5. Espera 2-3 minutos mientras se crea

### Paso 2: Obtener DATABASE_URL

1. En Supabase, ve a **Settings** → **Database**
2. Busca la sección **"Connection string"**
3. Selecciona **"URI"** (no "Transaction")
4. Modo: **"Session"** (no "Transaction")
5. Copia la URL completa (se ve así):
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
6. **IMPORTANTE:** Reemplaza `[PASSWORD]` con tu contraseña de BD
7. Guarda esta URL, la necesitarás en el siguiente paso

### Paso 3: Configurar Variables de Entorno en Vercel (3 min)

Ejecuta este script automatizado:

```bash
cd "/Users/pablocisneros/Desktop/PROYECTOS TRABAJO PROGRAMACION /PROYECTO PRESTAMOS ESPAÑA"
./scripts/setup-vercel.sh
```

El script te pedirá:
1. DATABASE_URL (pega la que copiaste de Supabase)
2. Tu dominio de Vercel (ejemplo: `https://lendcore.vercel.app`)

El script automáticamente:
- ✅ Configurará todas las variables de entorno
- ✅ Hará el re-deploy a producción
- ✅ Te dará la URL final

### Paso 4: Configurar Base de Datos (5 min)

Una vez que el deployment esté completo:

```bash
# Configurar DATABASE_URL temporalmente
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# Ejecutar setup de base de datos
./scripts/setup-database.sh
```

Esto ejecutará:
- ✅ Migraciones de Prisma
- ✅ Seed de datos iniciales (usuarios, parámetros)
- ✅ Verificación de conexión

### Paso 5: Verificar que Funciona (2 min)

1. Abre tu URL de Vercel (ejemplo: https://lendcore.vercel.app)
2. Deberías ver la página de login
3. Prueba con:
   - **Email:** `admin@lendcore.com`
   - **Password:** `Admin123!`
4. Si logras entrar, ¡está funcionando! 🎉

---

## 🆘 Si Algo Sale Mal

### Error: "Cannot connect to database"

**Solución:**
```bash
# Verifica que DATABASE_URL esté correctamente configurada en Vercel
npx vercel env ls
```

### Error: "ENCRYPTION_KEY is invalid"

**Solución:**
```bash
# Verifica que ENCRYPTION_KEY esté configurada
npx vercel env ls

# Si no está, agrega:
npx vercel env add ENCRYPTION_KEY production
# Pega: NXv3ADGFs5pUzDL/aBACYhfbszThXyjnWZu9JUAUaxU=
```

### Error en migraciones

**Solución:**
```bash
# Resetear y volver a intentar
npx prisma migrate reset
npx prisma migrate deploy
npx prisma db seed
```

---

## 📊 Credenciales Iniciales

**⚠️ SOLO PARA TESTING - CAMBIAR EN PRODUCCIÓN**

- **Admin:** `admin@lendcore.com` / `Admin123!`
- **Analyst:** `analyst@lendcore.com` / `Analyst123!`
- **Collection:** `collector@lendcore.com` / `Collector123!`

---

## 🎯 Próximos Pasos Post-Deployment

1. **Cambiar contraseñas** de los usuarios de prueba
2. **Configurar dominio personalizado** (opcional)
   - Vercel → Project Settings → Domains
3. **Configurar SMTP** para emails (opcional)
   - Agregar variables: SMTP_HOST, SMTP_PORT, etc.
4. **Configurar alertas de seguridad**
   - Agregar: SECURITY_ALERT_EMAIL
5. **Hacer backup** de ENCRYPTION_KEY
   - Guardar en 1Password, LastPass, etc.

---

## 📞 Soporte

Si necesitas ayuda:
- 📧 Revisa logs: `npx vercel logs`
- 🔍 Vercel Dashboard: https://vercel.com/dashboard
- 📚 Documentación completa: Ver DEPLOYMENT.md

---

**¡Estás a 3 comandos de tener LendCore en producción!** 🚀

```bash
# 1. Configurar Vercel
./scripts/setup-vercel.sh

# 2. Configurar Base de Datos
export DATABASE_URL="tu-url-de-supabase"
./scripts/setup-database.sh

# 3. ¡Abrir en navegador!
open https://lendcore.vercel.app
```
