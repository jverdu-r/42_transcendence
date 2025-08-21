#!/bin/bash

echo "⏹️  Parando Transcendence Project..."
echo "===================================="

# Parar todos los contenedores
docker compose -f docker-compose.yml --env-file .env down

echo ""
echo "📊 Estado actual:"
docker compose ps

echo ""
echo "✅ Transcendence parado correctamente"
echo "Para reiniciar: ./build-fix.sh"
