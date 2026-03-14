#!/bin/bash

# ===========================================
# LendCore - Generador de Secrets de Seguridad
# ===========================================
# Este script genera las claves necesarias para
# configurar el archivo .env de producción

echo ""
echo "🔐 =========================================="
echo "   LendCore - Generador de Secrets"
echo "==========================================="
echo ""

# Verificar que openssl esté instalado
if ! command -v openssl &> /dev/null; then
    echo "❌ Error: openssl no está instalado"
    echo "   Instálalo primero:"
    echo "   - macOS: brew install openssl"
    echo "   - Ubuntu/Debian: sudo apt-get install openssl"
    exit 1
fi

echo "✅ openssl detectado"
echo ""

# Generar ENCRYPTION_KEY (32 bytes = 256 bits para AES-256-GCM)
echo "📝 Generando ENCRYPTION_KEY (AES-256-GCM)..."
ENCRYPTION_KEY=$(openssl rand -base64 32)
echo "   ENCRYPTION_KEY=\"$ENCRYPTION_KEY\""
echo ""

# Generar NEXTAUTH_SECRET (32 bytes)
echo "📝 Generando NEXTAUTH_SECRET..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "   NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\""
echo ""

echo "==========================================="
echo "✅ Secrets generados exitosamente"
echo "==========================================="
echo ""
echo "⚠️  IMPORTANTE - GUARDA ESTOS VALORES:"
echo ""
echo "1. Copia estos valores a tu archivo .env"
echo "2. Guarda ENCRYPTION_KEY en un vault seguro (1Password, LastPass, etc.)"
echo "3. NUNCA subas el archivo .env a Git"
echo "4. Rota ENCRYPTION_KEY trimestralmente"
echo ""
echo "📋 VALORES PARA COPIAR:"
echo "-------------------------------------------"
echo "ENCRYPTION_KEY=\"$ENCRYPTION_KEY\""
echo "NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\""
echo "-------------------------------------------"
echo ""
