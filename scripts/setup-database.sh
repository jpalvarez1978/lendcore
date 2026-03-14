#!/bin/bash

echo "🗄️  ============================================"
echo "   LendCore - Setup Database"
echo "============================================"
echo ""

# Verificar que DATABASE_URL esté configurado
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL no está configurado"
  echo ""
  echo "Por favor, configura DATABASE_URL:"
  echo "export DATABASE_URL='postgresql://...' "
  echo ""
  exit 1
fi

echo "✅ DATABASE_URL detectado"
echo ""

echo "📝 Paso 1: Generar Prisma Client..."
npx prisma generate

echo ""
echo "📝 Paso 2: Ejecutar migraciones..."
npx prisma migrate deploy

echo ""
echo "📝 Paso 3: Ejecutar seed (datos iniciales)..."
npx prisma db seed

echo ""
echo "✅ ============================================"
echo "   Base de datos configurada!"
echo "============================================"
echo ""
echo "📊 Usuarios creados:"
echo "- Admin:      admin@lendcore.com / Admin123!"
echo "- Analyst:    analyst@lendcore.com / Analyst123!"
echo "- Collection: collector@lendcore.com / Collector123!"
echo ""
echo "⚠️  IMPORTANTE: Cambia estas contraseñas en producción!"
echo ""
