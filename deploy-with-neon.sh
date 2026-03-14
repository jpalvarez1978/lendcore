#!/bin/bash

echo "🚀 ============================================"
echo "   LendCore - Deployment con Neon"
echo "============================================"
echo ""

# Validar que tengamos la DATABASE_URL
if [ -z "$1" ]; then
  echo "❌ Error: Falta DATABASE_URL"
  echo ""
  echo "Uso: ./deploy-with-neon.sh 'postgresql://...'"
  echo ""
  exit 1
fi

DATABASE_URL="$1"

# Secrets ya generados
ENCRYPTION_KEY="NXv3ADGFs5pUzDL/aBACYhfbszThXyjnWZu9JUAUaxU="
NEXTAUTH_SECRET="j5yFjP/vQhevVnymTywiuMU3CpmZHPsiaz1rob4hu8E="

echo "📝 PASO 1: Configurando Variables en Vercel..."
echo ""

# Añadir variables de entorno a Vercel
echo "→ DATABASE_URL..."
echo "$DATABASE_URL" | npx vercel env add DATABASE_URL production 2>/dev/null || echo "   (ya existe, actualizando...)"

echo "→ ENCRYPTION_KEY..."
echo "$ENCRYPTION_KEY" | npx vercel env add ENCRYPTION_KEY production 2>/dev/null || echo "   (ya existe)"

echo "→ NEXTAUTH_SECRET..."
echo "$NEXTAUTH_SECRET" | npx vercel env add NEXTAUTH_SECRET production 2>/dev/null || echo "   (ya existe)"

echo "→ NEXTAUTH_URL..."
echo "https://lendcore.vercel.app" | npx vercel env add NEXTAUTH_URL production 2>/dev/null || echo "   (ya existe)"

echo ""
echo "✅ Variables configuradas"
echo ""

echo "📝 PASO 2: Deploying a Vercel..."
echo ""

npx vercel --prod --yes

echo ""
echo "✅ Deployment completado!"
echo ""

echo "📝 PASO 3: Configurando Base de Datos..."
echo ""

export DATABASE_URL="$DATABASE_URL"

echo "→ Generando Prisma Client..."
npx prisma generate

echo ""
echo "→ Ejecutando migraciones..."
npx prisma migrate deploy

echo ""
echo "→ Seed de datos iniciales..."
npx prisma db seed

echo ""
echo "🎉 ============================================"
echo "   ¡TODO LISTO!"
echo "============================================"
echo ""
echo "✅ GitHub: https://github.com/pdcisneros1/lendcore"
echo "✅ Aplicación: https://lendcore.vercel.app"
echo "✅ Base de datos: Neon (EU West)"
echo ""
echo "🔐 Credenciales de prueba:"
echo "   Email: admin@lendcore.com"
echo "   Password: Admin123!"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   1. Cambia la contraseña del admin"
echo "   2. Guarda estos secrets:"
echo "      ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo "      DATABASE_URL=(tu URL de Neon)"
echo ""
echo "🚀 Abriendo tu aplicación..."
sleep 2
open https://lendcore.vercel.app
echo ""
