#!/bin/bash

echo "🌐 Abriendo Transcendence en el navegador..."
echo "📍 URL: http://localhost"
echo ""
echo "Para probar el chat:"
echo "1. Haz login con: user1 / password123"
echo "2. Haz clic en el botón 'Chat'"
echo "3. Deberías ver la interfaz de chat conectada"
echo ""

# Intentar abrir en el navegador del sistema
if command -v open >/dev/null 2>&1; then
    # macOS
    open "http://localhost"
elif command -v xdg-open >/dev/null 2>&1; then
    # Linux
    xdg-open "http://localhost"
elif command -v start >/dev/null 2>&1; then
    # Windows
    start "http://localhost"
else
    echo "⚠️  No se pudo abrir automáticamente. Abre manualmente: http://localhost"
fi
