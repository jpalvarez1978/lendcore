#!/bin/bash

echo "🚀 ============================================"
echo "   LendCore - Setup Vercel + Supabase"
echo "============================================"
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Secrets generados
ENCRYPTION_KEY="NXv3ADGFs5pUzDL/aBACYhfbszThXyjnWZu9JUAUaxU="
NEXTAUTH_SECRET="j5yFjP/vQhevVnymTywiuMU3CpmZHPsiaz1rob4hu8E="

echo -e "${BLUE}📝 Paso 1: Configurar Supabase${NC}"
echo ""
echo "Ve a: https://supabase.com/dashboard/projects"
echo ""
echo "1. Crea un nuevo proyecto llamado 'lendcore-production'"
echo "2. Región: Europa (Frankfurt) - fra1"
echo "3. Copia la DATABASE_URL (Connection String en modo 'Direct connection')"
echo ""
echo -e "${YELLOW}⚠️  Presiona ENTER cuando hayas creado el proyecto...${NC}"
read

echo ""
echo "Pega aquí tu DATABASE_URL de Supabase:"
read DATABASE_URL

echo ""
echo -e "${BLUE}📝 Paso 2: Configurar variables en Vercel${NC}"
echo ""

# Configurar variables de entorno en Vercel
echo "Configurando DATABASE_URL..."
npx vercel env add DATABASE_URL production <<< "$DATABASE_URL"

echo "Configurando ENCRYPTION_KEY..."
npx vercel env add ENCRYPTION_KEY production <<< "$ENCRYPTION_KEY"

echo "Configurando NEXTAUTH_SECRET..."
npx vercel env add NEXTAUTH_SECRET production <<< "$NEXTAUTH_SECRET"

echo "Configurando NEXTAUTH_URL..."
echo "Ingresa tu dominio de Vercel (ejemplo: https://lendcore.vercel.app):"
read NEXTAUTH_URL
npx vercel env add NEXTAUTH_URL production <<< "$NEXTAUTH_URL"

echo ""
echo -e "${BLUE}📝 Paso 3: Re-deploy a Vercel${NC}"
npx vercel --prod

echo ""
echo -e "${GREEN}✅ ============================================${NC}"
echo -e "${GREEN}   Deployment completado!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "🎉 Tu aplicación está desplegada en Vercel"
echo ""
echo "📋 Próximos pasos:"
echo "1. Ejecutar migraciones de base de datos"
echo "2. Crear usuario administrador"
echo "3. Configurar dominio personalizado (opcional)"
echo ""
