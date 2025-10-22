#!/bin/bash
# Script para monitorear logs de torneos en tiempo real

echo "🔍 Monitoreando logs de torneo..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Seguir logs de game-service, auth-service y db-service filtrando por mensajes de torneo
docker-compose logs -f --tail=50 game-service auth-service db-service 2>&1 | grep -E "(Torneo|Tournament|🔄|✅|⚠️|🏆|winnerId|player1_id|player2_id|is_winner)"
