# 🚀 Guía de Deployment - LendCore

**Sistema de Gestión de Préstamos**  
Versión: 1.0  
Última actualización: Marzo 2026

---

## 📋 Pre-requisitos

Antes de comenzar, asegúrate de tener:

### 1. Servidor/Hosting
- **Opción A (Recomendada):** Vercel (deployment automático, SSL gratis, CDN global)
- **Opción B:** VPS con Node.js 18+ (Ubuntu 22.04, Debian 11+, etc.)
- **Opción C:** Docker (contenedor pre-configurado)

### 2. Base de Datos
- PostgreSQL 14+ (recomendado PostgreSQL 16)
- Mínimo 2GB RAM, 20GB almacenamiento
- Backup automático habilitado
- Conexiones SSL/TLS habilitadas

### 3. Dominio
- Dominio propio (ej: prestamos.tu-empresa.com)
- Certificado SSL (gratis con Let's Encrypt o Cloudflare)

### 4. Email
- Cuenta SMTP para envío de notificaciones
  - Gmail con contraseña de aplicación (gratis, máx. 500/día)
  - SendGrid (hasta 100 emails/día gratis)
  - Mailgun, AWS SES, etc.

---

## 🎯 Opción 1: Deployment en Vercel (Recomendado)

**Ventajas:** Deployment automático, SSL gratis, CDN global, escalado automático

### Paso 1: Preparar el proyecto

```bash
# 1. Clonar o descargar el código fuente
cd lendcore

# 2. Instalar dependencias
npm install

# 3. Generar secrets
./scripts/generate-secrets.sh
# Guarda los valores generados

# 4. Verificar que todo compile
npm run build
```

### Paso 2: Configurar PostgreSQL

Opciones de hosting PostgreSQL:
- **Vercel Postgres** (recomendado, integrado)
- **Supabase** (gratis hasta 500MB)
- **Neon** (serverless PostgreSQL)
- **AWS RDS**, **DigitalOcean Managed DB**, etc.

```bash
# Obtén la DATABASE_URL de tu proveedor
# Ejemplo: postgresql://usuario:pass@host:5432/lendcore?sslmode=require
```

### Paso 3: Deploy en Vercel

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Login en Vercel
vercel login

# 3. Deploy
vercel

# 4. Configurar variables de entorno en Vercel Dashboard
# Ve a: Settings → Environment Variables
```

Agregar estas variables en Vercel:
- `DATABASE_URL` → URL de PostgreSQL
- `ENCRYPTION_KEY` → Generado en Paso 1
- `NEXTAUTH_SECRET` → Generado en Paso 1
- `NEXTAUTH_URL` → https://tu-dominio.vercel.app
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- `SECURITY_ALERT_EMAIL` → email del administrador

### Paso 4: Ejecutar migraciones

```bash
# 1. Conectarse a la base de datos de producción
# Agregar DATABASE_URL al .env local temporalmente

# 2. Ejecutar migraciones
npx prisma migrate deploy

# 3. Generar Prisma Client
npx prisma generate

# 4. (Opcional) Seed inicial
npx prisma db seed
```

### Paso 5: Verificar deployment

```bash
# 1. Abrir la URL de producción
open https://tu-dominio.vercel.app

# 2. Verificar health check
curl https://tu-dominio.vercel.app/api/health/security

# 3. Login con usuario de prueba
# admin@lendcore.com / Admin123!
```

---

## 🎯 Opción 2: Deployment en VPS (Ubuntu/Debian)

**Para clientes que prefieren hosting propio**

### Paso 1: Preparar el servidor

```bash
# Conectarse al servidor vía SSH
ssh root@tu-servidor.com

# Actualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Instalar PM2 (gestor de procesos)
npm install -g pm2

# Instalar PostgreSQL 16
apt install -y postgresql postgresql-contrib

# Instalar Nginx (reverse proxy)
apt install -y nginx

# Instalar Certbot (SSL gratis)
apt install -y certbot python3-certbot-nginx
```

### Paso 2: Configurar PostgreSQL

```bash
# Crear base de datos y usuario
sudo -u postgres psql

CREATE DATABASE lendcore_production;
CREATE USER lendcore_user WITH ENCRYPTED PASSWORD 'contraseña_segura';
GRANT ALL PRIVILEGES ON DATABASE lendcore_production TO lendcore_user;
\q

# Habilitar conexiones SSL
# Editar: /etc/postgresql/16/main/postgresql.conf
ssl = on
```

### Paso 3: Configurar la aplicación

```bash
# Crear directorio para la app
mkdir -p /var/www/lendcore
cd /var/www/lendcore

# Clonar código (o subir vía SFTP/Git)
git clone https://github.com/tu-usuario/lendcore.git .

# Instalar dependencias
npm ci --production

# Generar secrets
./scripts/generate-secrets.sh

# Crear archivo .env
cp .env.production.example .env
nano .env
# Completar con valores reales

# Build de producción
npm run build

# Ejecutar migraciones
npx prisma migrate deploy

# Iniciar con PM2
pm2 start npm --name "lendcore" -- start
pm2 save
pm2 startup
```

### Paso 4: Configurar Nginx

```bash
# Crear configuración
nano /etc/nginx/sites-available/lendcore

# Contenido:
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Activar sitio
ln -s /etc/nginx/sites-available/lendcore /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Instalar certificado SSL
certbot --nginx -d tu-dominio.com
```

### Paso 5: Configurar firewall

```bash
# Configurar UFW
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw enable
```

---

## 🎯 Opción 3: Deployment con Docker

```bash
# Paso 1: Construir imagen
docker build -t lendcore:latest .

# Paso 2: Ejecutar contenedor
docker run -d \
  --name lendcore \
  -p 3001:3001 \
  --env-file .env \
  --restart unless-stopped \
  lendcore:latest

# Paso 3: Verificar logs
docker logs -f lendcore
```

---

## ✅ Checklist Post-Deployment

### Seguridad

- [ ] HTTPS habilitado (certificado SSL válido)
- [ ] Variables de entorno configuradas (NO valores de ejemplo)
- [ ] ENCRYPTION_KEY guardada en vault seguro
- [ ] Firewall configurado (solo puertos necesarios abiertos)
- [ ] Base de datos con SSL/TLS
- [ ] Backups automáticos configurados
- [ ] Headers de seguridad validados en https://securityheaders.com

### Funcionalidad

- [ ] Login funciona correctamente
- [ ] Dashboard carga datos reales
- [ ] Crear cliente funciona
- [ ] Crear solicitud funciona
- [ ] Crear préstamo funciona
- [ ] Registrar pago funciona
- [ ] Generar recibo PDF funciona
- [ ] Exportar reportes funciona
- [ ] Búsqueda global funciona
- [ ] Emails de alerta llegan

### Usuarios

- [ ] Usuario ADMIN creado
- [ ] Usuario ANALYST creado
- [ ] Usuario COLLECTION creado
- [ ] Contraseñas cambiadas (NO usar las de desarrollo)
- [ ] Usuarios de prueba eliminados (si aplica)

### Configuración

- [ ] Parámetros del sistema revisados y ajustados
- [ ] Nombre de empresa configurado
- [ ] Zona horaria correcta
- [ ] Tasas de interés configuradas
- [ ] Límites de préstamo configurados
- [ ] Días de cobranza configurados

### Monitoreo

- [ ] PM2 monitoreando la aplicación (si VPS)
- [ ] Logs accesibles y rotando
- [ ] Alertas de seguridad configuradas
- [ ] Dashboard de seguridad accesible
- [ ] Cloudflare Analytics (si aplica)

---

## 🔧 Mantenimiento

### Backups

**Base de Datos (diario):**
```bash
# Backup manual
pg_dump lendcore_production > backup-$(date +%Y%m%d).sql

# Backup automático (cron)
0 2 * * * pg_dump lendcore_production | gzip > /backups/lendcore-$(date +\%Y\%m\%d).sql.gz
```

**Archivos (semanal):**
```bash
# Backup del código y configuración
tar -czf lendcore-backup-$(date +%Y%m%d).tar.gz /var/www/lendcore
```

### Actualización de Dependencias

```bash
# Verificar dependencias desactualizadas
npm outdated

# Actualizar (con cuidado)
npm update

# Rebuild
npm run build

# Reiniciar
pm2 restart lendcore
```

### Logs

```bash
# Ver logs en tiempo real (PM2)
pm2 logs lendcore

# Ver logs de Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Ver logs de PostgreSQL
tail -f /var/log/postgresql/postgresql-16-main.log
```

---

## 🆘 Troubleshooting

### Error: "Cannot connect to database"

```bash
# 1. Verificar que PostgreSQL esté corriendo
systemctl status postgresql

# 2. Verificar DATABASE_URL en .env
cat .env | grep DATABASE_URL

# 3. Probar conexión manualmente
psql "postgresql://usuario:pass@host:5432/lendcore"
```

### Error: "ENCRYPTION_KEY is invalid"

```bash
# Regenerar ENCRYPTION_KEY
./scripts/generate-secrets.sh

# IMPORTANTE: Si ya hay datos encriptados, NO cambiar la key
# o perderás acceso a los datos
```

### Error: "Failed to send email"

```bash
# Verificar configuración SMTP
curl -v smtp://smtp.gmail.com:587

# Probar credenciales
# Si usas Gmail, asegúrate de usar "contraseña de aplicación"
```

### La aplicación no inicia

```bash
# Ver logs de PM2
pm2 logs lendcore --lines 100

# Ver procesos
pm2 list

# Reiniciar
pm2 restart lendcore

# Si persiste, rebuild
cd /var/www/lendcore
npm run build
pm2 restart lendcore
```

---

## 📞 Soporte

Para soporte técnico o consultas sobre deployment:

- **Email:** soporte@tu-empresa.com
- **Documentación:** Ver archivos SECURITY.md y PRODUCTION-SECURITY-CHECKLIST.md
- **Emergencias:** Contactar al equipo de desarrollo

---

## 📚 Recursos Adicionales

- [PRODUCTION-SECURITY-CHECKLIST.md](./PRODUCTION-SECURITY-CHECKLIST.md) - Checklist de seguridad completo
- [SECURITY.md](./SECURITY.md) - Implementación de seguridad
- [README.md](./README.md) - Documentación general
- [QUICK-START.md](./QUICK-START.md) - Inicio rápido

---

**Última actualización:** Marzo 2026  
**Versión del documento:** 1.0
