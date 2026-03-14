#!/bin/bash

# Script de inicio para LendCore
# Ejecuta: ./start.sh o bash start.sh

echo "🚀 LendCore - Iniciando..."
echo ""

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
    echo ""
fi

# Verificar si Prisma Client está generado
if [ ! -d "node_modules/.prisma" ]; then
    echo "🔧 Generando Prisma Client..."
    npx prisma generate
    echo ""
fi

echo "✅ Todo listo!"
echo ""
echo "🌐 Iniciando servidor en puerto 3001..."
echo "📍 URL: http://localhost:3001"
echo ""
echo "🔐 Credenciales de prueba:"
echo "   Email: admin@lendcore.com"
echo "   Contraseña: Admin123!"
echo ""
echo "⏹️  Presiona Ctrl+C para detener el servidor"
echo ""

# Ejecutar el servidor
npm run dev
