#!/bin/bash

# Script para limpiar caché y reconstruir el frontend
# Clear cache and rebuild frontend script

echo "🧹 Limpiando caché del frontend..."
echo "🧹 Cleaning frontend cache..."

cd "$(dirname "$0")/frontend"

# Limpiar node_modules/.cache si existe
if [ -d "node_modules/.cache" ]; then
    echo "   - Eliminando node_modules/.cache"
    rm -rf node_modules/.cache
fi

# Limpiar dist si existe
if [ -d "dist" ]; then
    echo "   - Eliminando dist"
    rm -rf dist
fi

echo ""
echo "🔨 Reconstruyendo el frontend..."
echo "🔨 Rebuilding frontend..."

# Reconstruir
npm run build

echo ""
echo "✅ ¡Listo! Ahora recarga el navegador con Ctrl+Shift+R (o Cmd+Shift+R en Mac)"
echo "✅ Done! Now reload your browser with Ctrl+Shift+R (or Cmd+Shift+R on Mac)"
echo ""
echo "📝 Instrucciones para el navegador:"
echo "   1. Abre las DevTools (F12)"
echo "   2. Haz clic derecho en el botón de recargar"
echo "   3. Selecciona 'Vaciar caché y recargar de forma forzada'"
echo ""
echo "📝 Browser instructions:"
echo "   1. Open DevTools (F12)"
echo "   2. Right-click the reload button"
echo "   3. Select 'Empty Cache and Hard Reload'"
