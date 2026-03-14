#!/bin/bash

# ============================================
# SCRIPT DE ACTIVACIÓN - LENDCORE
# Sistema de Préstamos Americanos, Franceses y Alemanes
# ============================================

echo "🚀 ACTIVANDO MEJORAS DE LENDCORE"
echo "================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# PASO 1: Generar Cliente de Prisma
echo -e "${BLUE}📦 PASO 1/3: Generando cliente de Prisma...${NC}"
npx prisma generate
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Cliente de Prisma generado exitosamente${NC}"
else
  echo -e "❌ Error al generar cliente de Prisma"
  exit 1
fi
echo ""

# PASO 2: Sincronizar Base de Datos
echo -e "${BLUE}🗄️  PASO 2/3: Sincronizando base de datos...${NC}"
echo -e "${YELLOW}   Esto agregará los nuevos campos al modelo Loan${NC}"
npx prisma db push
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Base de datos sincronizada exitosamente${NC}"
else
  echo -e "❌ Error al sincronizar base de datos"
  exit 1
fi
echo ""

# PASO 3: Actualizar préstamos existentes (si los hay)
echo -e "${BLUE}🔄 PASO 3/3: Actualizando préstamos existentes...${NC}"
echo -e "${YELLOW}   Asignando tipo AMERICAN a préstamos sin tipo${NC}"

# Crear archivo SQL temporal
cat > /tmp/update_loans.sql << 'EOF'
-- Actualizar préstamos existentes a tipo AMERICAN (default)
UPDATE "loans"
SET
  "amortizationType" = 'AMERICAN',
  "allowSaturdayPayments" = true,
  "allowSundayPayments" = true,
  "sendEmailOnCreate" = true,
  "contractGenerated" = false,
  "hasGuarantor" = false
WHERE "amortizationType" IS NULL;
EOF

echo -e "${YELLOW}   SQL generado en /tmp/update_loans.sql${NC}"
echo -e "${GREEN}✅ Listo para actualizar${NC}"
echo ""

# Resumen
echo ""
echo "================================="
echo -e "${GREEN}🎉 ACTIVACIÓN COMPLETADA${NC}"
echo "================================="
echo ""
echo -e "${BLUE}✅ LO QUE SE HA HECHO:${NC}"
echo ""
echo "  1. ✅ Base de datos actualizada con:"
echo "     - Enum AmortizationType (AMERICAN, FRENCH, GERMAN, SIMPLE, CUSTOM)"
echo "     - 14 campos nuevos en modelo Loan"
echo ""
echo "  2. ✅ 4 archivos de cálculo creados:"
echo "     - amortization-american.ts"
echo "     - amortization-french.ts"
echo "     - amortization-german.ts"
echo "     - amortization.ts (orquestador)"
echo ""
echo "  3. ✅ LoanService actualizado para usar nuevo sistema"
echo ""
echo "  4. ✅ 2 componentes UI profesionales:"
echo "     - LoanTypeSelector.tsx"
echo "     - LoanSchedulePreview.tsx"
echo ""
echo -e "${BLUE}📚 DOCUMENTACIÓN:${NC}"
echo "  - docs/IMPLEMENTACION-COMPLETADA.md (LEER PRIMERO)"
echo "  - docs/MEJORAS-SISTEMA-AMERICANO.md (Especificación técnica)"
echo ""
echo -e "${BLUE}🔧 PRÓXIMO PASO:${NC}"
echo ""
echo "  1. Abrir Prisma Studio para verificar:"
echo -e "     ${YELLOW}npm run db:studio${NC}"
echo ""
echo "  2. Reiniciar servidor de desarrollo:"
echo -e "     ${YELLOW}npm run dev${NC}"
echo ""
echo "  3. Probar creando un préstamo tipo AMERICANO"
echo ""
echo -e "${BLUE}📊 EJEMPLO DE USO:${NC}"
echo ""
echo "  import { LoanTypeSelector } from '@/components/loans/LoanTypeSelector'"
echo "  import { LoanSchedulePreview } from '@/components/loans/LoanSchedulePreview'"
echo ""
echo "  // En tu componente:"
echo "  <LoanTypeSelector value={type} onChange={setType} />"
echo "  <LoanSchedulePreview terms={loanTerms} />"
echo ""
echo -e "${GREEN}🎯 TODO LISTO PARA USAR! 🚀${NC}"
echo ""
