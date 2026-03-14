#!/bin/bash

echo "🚀 ============================================"
echo "   LendCore - Deployment Automático"
echo "============================================"
echo ""

# Secrets ya generados
ENCRYPTION_KEY="NXv3ADGFs5pUzDL/aBACYhfbszThXyjnWZu9JUAUaxU="
NEXTAUTH_SECRET="j5yFjP/vQhevVnymTywiuMU3CpmZHPsiaz1rob4hu8E="

echo "📝 PASO 1: Supabase"
echo ""
echo "Te abrí el dashboard de Supabase en tu navegador."
echo "Si no se abrió, ve a: https://supabase.com/dashboard"
echo ""
echo "Instrucciones:"
echo "1. Click en 'New Project'"
echo "2. Nombre: lendcore-production"
echo "3. Database Password: (genera una segura - la necesitarás)"
echo "4. Region: Europe West (Frankfurt)"
echo "5. Click 'Create new project' y espera 2-3 minutos"
echo ""
echo "Cuando esté listo:"
echo "6. Ve a Settings → Database"
echo "7. En 'Connection string' selecciona 'URI'"
echo "8. Modo: 'Session' (no Transaction)"
echo "9. Copia la URL completa"
echo "10. Reemplaza [YOUR-PASSWORD] con tu contraseña real"
echo ""
read -p "Pega aquí tu DATABASE_URL: " DATABASE_URL

echo ""
echo "✅ DATABASE_URL recibido"
echo ""

echo "📝 PASO 2: Configurando Variables en Vercel..."
echo ""

# Añadir variables de entorno a Vercel
echo "→ DATABASE_URL..."
echo "$DATABASE_URL" | npx vercel env add DATABASE_URL production

echo "→ ENCRYPTION_KEY..."
echo "$ENCRYPTION_KEY" | npx vercel env add ENCRYPTION_KEY production

echo "→ NEXTAUTH_SECRET..."
echo "$NEXTAUTH_SECRET" | npx vercel env add NEXTAUTH_SECRET production

echo "→ NEXTAUTH_URL..."
echo "https://lendcore.vercel.app" | npx vercel env add NEXTAUTH_URL production

echo ""
echo "✅ Variables configuradas en Vercel"
echo ""

echo "📝 PASO 3: Deploying a Vercel..."
echo ""

npx vercel --prod

echo ""
echo "✅ Deployment completado!"
echo ""

echo "📝 PASO 4: Configurando Base de Datos..."
echo ""

export DATABASE_URL="$DATABASE_URL"

echo "→ Generando Prisma Client..."
npx prisma generate

echo "→ Ejecutando migraciones..."
npx prisma migrate deploy

echo "→ Seed de datos iniciales..."
npx prisma db seed

echo ""
echo "🎉 ============================================"
echo "   ¡TODO LISTO!"
echo "============================================"
echo ""
echo "✅ Repositorio: https://github.com/pdcisneros1/lendcore"
echo "✅ Aplicación: https://lendcore.vercel.app"
echo ""
echo "🔐 Credenciales de acceso:"
echo "   Email: admin@lendcore.com"
echo "   Password: Admin123!"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   1. Cambia la contraseña del admin"
echo "   2. Guarda ENCRYPTION_KEY en un lugar seguro"
echo "   3. Haz backup de la DATABASE_URL"
echo ""
echo "🚀 Abre tu aplicación:"
open https://lendcore.vercel.app
echo ""
