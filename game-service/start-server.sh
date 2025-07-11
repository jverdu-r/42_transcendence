#!/bin/bash

# Script para iniciar el servidor de juego sin Docker

echo "🚀 Iniciando servidor de juego..."

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor, instala Node.js primero."
    exit 1
fi

# Verificar si las dependencias están instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install --no-bin-links
fi

# Iniciar el servidor
echo "🎮 Iniciando servidor en puerto 8002..."
npm run dev

echo "🎯 Servidor disponible en http://localhost:8002"
echo "🎮 Abre test/test_network.html en tu navegador para jugar"
