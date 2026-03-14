# 🚀 Guía Rápida - JEAN PAUL Servicios Financieros

## Ejecutar el Proyecto (Puerto 3001)

### 1️⃣ Instalar Dependencias (Solo primera vez)

```bash
cd "/Users/pablocisneros/Desktop/PROYECTOS TRABAJO PROGRAMACION /PROYECTO PRESTAMOS ESPAÑA"
npm install
```

### 2️⃣ Preparar Base de Datos (Solo primera vez)

```bash
# Sincronizar schema con la base de datos
npm run db:push

# (Opcional) Poblar con datos de prueba
npm run db:seed
```

### 3️⃣ Ejecutar en Desarrollo

```bash
npm run dev
```

**El proyecto estará disponible en**: http://localhost:3001

---

## 🔐 Credenciales de Prueba

### Administrador
- **Email**: `admin@lendcore.com`
- **Contraseña**: `Admin123!`
- **Rol**: ADMIN (acceso completo)

### Analista
- **Email**: `analyst@lendcore.com`
- **Contraseña**: `Analyst123!`
- **Rol**: ANALYST (ver reportes, editar clientes)

### Cobrador
- **Email**: `collector@lendcore.com`
- **Contraseña**: `Collector123!`
- **Rol**: COLLECTION (gestionar pagos y cobranza)

---

## 🛠️ Comandos Útiles

### Desarrollo
```bash
npm run dev              # Ejecutar en desarrollo (puerto 3001)
npm run build            # Compilar para producción
npm run start            # Ejecutar compilado (puerto 3001)
npm run lint             # Verificar código
```

### Base de Datos
```bash
npm run db:push          # Sincronizar schema (desarrollo)
npm run db:migrate       # Crear migración
npm run db:studio        # Abrir Prisma Studio (GUI)
npm run db:seed          # Poblar con datos de prueba
```

---

## 📂 Estructura del Proyecto

```
├── src/
│   ├── app/                    # Rutas y páginas (App Router)
│   │   ├── (auth)/            # Grupo de rutas de autenticación
│   │   │   └── login/         # Página de login
│   │   ├── (dashboard)/       # Grupo de rutas del dashboard
│   │   │   └── dashboard/     # Páginas principales
│   │   │       ├── clientes/  # Gestión de clientes
│   │   │       ├── prestamos/ # Gestión de préstamos
│   │   │       ├── pagos/     # Gestión de pagos
│   │   │       └── cobranza/  # Gestión de cobranza
│   │   └── api/               # API Routes
│   │       ├── auth/          # Endpoints de autenticación
│   │       ├── clients/       # Endpoints de clientes
│   │       └── loans/         # Endpoints de préstamos
│   ├── components/            # Componentes reutilizables
│   │   ├── ui/               # Componentes base (shadcn)
│   │   ├── shared/           # Componentes compartidos
│   │   ├── layout/           # Layout components
│   │   └── clients/          # Componentes de clientes
│   ├── lib/                   # Utilidades y configuración
│   │   ├── auth.ts           # Configuración NextAuth
│   │   ├── prisma.ts         # Cliente Prisma
│   │   ├── security/         # Seguridad (encryption, rate limit)
│   │   ├── validations/      # Schemas de Zod
│   │   └── formatters/       # Formateo de datos
│   └── services/             # Lógica de negocio
│       ├── clientService.ts
│       ├── loanService.ts
│       └── securityService.ts
├── prisma/
│   ├── schema.prisma         # Schema de la base de datos
│   └── seed.ts              # Datos de prueba
└── public/                   # Archivos estáticos
```

---

## 🎨 Diseño y Colores

### Paleta de Colores
- **Primary**: `#303854` (Azul marino oscuro)
- **Background**: `#F6F3EA` (Beige claro cálido)
- **Secondary**: `#C2CDD5` (Azul grisáceo suave)

Ver `DESIGN-SYSTEM.md` para guía completa.

---

## 🔒 Seguridad Implementada

- ✅ **Encriptación AES-256-GCM** para datos sensibles (DNI, teléfono, dirección)
- ✅ **Rate Limiting** en todas las APIs
- ✅ **Security Logging** con Prisma
- ✅ **WAF Headers** (CSP, HSTS, X-Frame-Options)
- ✅ **Detección de patrones de ataque**

---

## ♿ Accesibilidad

- ✅ **WCAG 2.1 AA** compliant
- ✅ Navegación por teclado completa
- ✅ Lectores de pantalla soportados
- ✅ Skip links y ARIA labels

Ver `ACCESSIBILITY.md` para detalles.

---

## 🐛 Troubleshooting

### Error: Puerto 3001 ocupado
```bash
# Matar proceso en puerto 3001 (macOS/Linux)
lsof -ti:3001 | xargs kill -9

# O usar otro puerto
npm run dev -- -p 3002
```

### Error: Base de datos no conecta
1. Verificar que PostgreSQL está corriendo
2. Verificar `.env` con credenciales correctas
3. Ejecutar `npm run db:push`

### Error: Missing dependencies
```bash
# Limpiar e instalar de nuevo
rm -rf node_modules package-lock.json
npm install
```

### Error: Prisma Client no generado
```bash
npx prisma generate
```

---

## 📊 Panel de Administración de Base de Datos

Para ver y editar la base de datos visualmente:

```bash
npm run db:studio
```

Se abrirá en: http://localhost:5555

---

## 📝 Notas Importantes

1. **Desarrollo Local**: El proyecto usa el puerto **3001** para no conflictuar con otros proyectos
2. **Variables de Entorno**: Asegúrate de tener `.env` configurado correctamente
3. **Primera Ejecución**: Ejecuta `npm run db:seed` para poblar con datos de prueba
4. **Navegadores**: Optimizado para Chrome, Firefox, Safari y Edge modernos

---

## 🔗 Links Útiles

- **Dashboard**: http://localhost:3001/dashboard
- **Login**: http://localhost:3001/login
- **Prisma Studio**: http://localhost:5555 (después de `npm run db:studio`)

---

## 📞 Soporte

Si encuentras problemas:
1. Revisar `TROUBLESHOOTING.md`
2. Verificar logs en la consola
3. Revisar `DEVELOPMENT.md` para credenciales de prueba

---

**Última actualización**: 8 de Marzo, 2026
**Puerto de desarrollo**: 3001
**Stack**: Next.js 15 + React 19 + Prisma + PostgreSQL
