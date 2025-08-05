#!/bin/bash

echo "================================================="
echo "  🎯 ESTADO DEL MONITOREO - FT_TRANSCENDENCE"
echo "================================================="
echo ""

# Verificar que Prometheus esté disponible
if curl -s http://localhost:9090/api/v1/targets > /dev/null 2>&1; then
    echo "✅ Prometheus está activo"
    
    # Contar targets UP vs DOWN
    UP_COUNT=$(curl -s http://localhost:9090/api/v1/query?query=up | grep -o '"value":\[.*,"1"\]' | wc -l)
    DOWN_COUNT=$(curl -s http://localhost:9090/api/v1/query?query=up | grep -o '"value":\[.*,"0"\]' | wc -l)
    TOTAL_COUNT=$((UP_COUNT + DOWN_COUNT))
    
    echo "📊 Servicios monitoreados: $TOTAL_COUNT"
    echo "✅ Servicios UP: $UP_COUNT"
    echo "❌ Servicios DOWN: $DOWN_COUNT"
    echo ""
    
    if [ $DOWN_COUNT -gt 0 ]; then
        echo "⚠️  SERVICIOS CON PROBLEMAS:"
        curl -s http://localhost:9090/api/v1/query?query=up | grep '"value":\[.*,"0"\]' | grep -o '"job":"[^"]*"' | sed 's/"job":"//g' | sed 's/"//g' | while read job; do
            echo "   ❌ $job"
        done
        echo ""
    fi
    
    echo "🔗 URLs de monitoreo:"
    echo "   • Prometheus: http://localhost:9090/targets"
    echo "   • Grafana: http://localhost:3000"
    echo "   • Alertmanager: http://localhost:9093"
    
else
    echo "❌ Prometheus no está disponible"
    echo "   Verifica que el contenedor esté ejecutándose: docker ps | grep prometheus"
fi

echo "================================================="
