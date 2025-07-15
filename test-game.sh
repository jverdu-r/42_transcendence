#!/bin/bash

echo "🧪 Probando servicios del juego..."

# Verificar que el game-service esté funcionando
echo "1. Verificando estado del game-service..."
curl -s http://localhost:8002/health | jq . || echo "❌ Game-service no responde"

# Crear una partida de prueba
echo "2. Creando partida de prueba..."
GAME_ID=$(curl -s -X POST http://localhost:8002/api/games \
  -H "Content-Type: application/json" \
  -d '{"nombre": "Test Game", "gameMode": "pve", "maxPlayers": 2}' | jq -r '.id')

if [ "$GAME_ID" != "null" ] && [ "$GAME_ID" != "" ]; then
  echo "✅ Partida creada con ID: $GAME_ID"
  
  # Verificar estado de la partida
  echo "3. Verificando estado de la partida..."
  curl -s http://localhost:8002/api/games/$GAME_ID | jq .
  
  # Intentar iniciar la partida
  echo "4. Intentando iniciar la partida..."
  curl -s -X POST http://localhost:8002/api/games/$GAME_ID/start \
    -H "Content-Type: application/json" \
    -d '{}' | jq .
  
  echo "5. Estado final de la partida:"
  curl -s http://localhost:8002/api/games/$GAME_ID | jq .
  
else
  echo "❌ Error creando partida"
fi

echo "🏁 Prueba completada"
