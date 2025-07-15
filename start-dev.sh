#!/bin/bash

echo "🚀 Iniciando servicios de desarrollo..."

# Detener contenedores anteriores
echo "📦 Deteniendo contenedores anteriores..."
docker compose down

# Construir e iniciar servicios
echo "🔨 Construyendo e iniciando servicios..."
docker compose up --build -d

# Esperar a que los servicios estén listos
echo "⏳ Esperando a que los servicios estén listos..."
sleep 10

# Verificar estados
echo "📊 Verificando estados de los servicios..."
echo "Frontend: http://localhost:9001"
echo "Game Service: http://localhost:8002"
echo "API Gateway: http://localhost:9000"

# Mostrar logs del game-service
echo "📋 Mostrando logs del game-service..."
docker logs game-service --tail 20

echo "✅ Servicios iniciados. Puedes acceder a:"
echo "   - Frontend: http://localhost:9001"
echo "   - WAF: http://localhost:9002"
echo "   - Game API: http://localhost:8002"
echo "   - Auth API: http://localhost:8001"
echo "   - Chat API: http://localhost:8003"
echo "   - API Gateway: http://localhost:9000"
