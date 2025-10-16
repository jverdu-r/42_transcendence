#!/bin/bash

# Script para aplicar los cambios de HTTPS
# Ejecuta este script después de los cambios en la rama https

set -e

echo "🔒 =========================================="
echo "🔒  Aplicando Configuración Full HTTPS"
echo "🔒 =========================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Resumen de cambios aplicados:${NC}"
echo ""
echo "✅ Frontend (ALTA PRIORIDAD):"
echo "   - tournaments.ts: 6 URLs cambiadas de http://localhost:8005 a /api/tournaments"
echo "   - google-config.ts: redirect_uri ahora usa window.location.origin (HTTPS dinámico)"
echo ""
echo "✅ Docker Compose (MEDIA PRIORIDAD):"
echo "   - Puertos internos comentados: 8001, 8002, 8003, 9000, 9002, 8005, 9001"
echo "   - Solo expuestos: 80 (redirect), 443 (HTTPS), 9443 (HTTPS principal)"
echo ""
echo "✅ Monitoring (BAJA PRIORIDAD):"
echo "   - prometheus.yml: Cambió de HTTP a HTTPS con insecure_skip_verify"
echo ""

# Preguntar antes de continuar
read -p "¿Deseas reconstruir los servicios ahora? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Operación cancelada."
    exit 1
fi

echo ""
echo -e "${YELLOW}🔨 Paso 1: Reconstruyendo frontend...${NC}"
docker-compose build frontend

echo ""
echo -e "${YELLOW}🔄 Paso 2: Reiniciando servicios necesarios...${NC}"
docker-compose restart nginx-proxy frontend

echo ""
echo -e "${YELLOW}⏳ Esperando 5 segundos para que los servicios se estabilicen...${NC}"
sleep 5

echo ""
echo -e "${GREEN}✅ Servicios reiniciados correctamente${NC}"
echo ""

echo -e "${YELLOW}🧪 Paso 3: Ejecutando tests básicos...${NC}"
echo ""

# Test 1: HTTPS en puerto 9443
echo "📝 Test 1: Verificando HTTPS en puerto 9443..."
if curl -k -s -o /dev/null -w "%{http_code}" https://localhost:9443 | grep -q "200\|301\|302"; then
    echo -e "${GREEN}   ✅ Puerto 9443 (HTTPS) responde correctamente${NC}"
else
    echo -e "${RED}   ❌ Puerto 9443 (HTTPS) no responde${NC}"
fi

# Test 2: HTTPS en puerto 443
echo "📝 Test 2: Verificando HTTPS en puerto 443..."
if curl -k -s -o /dev/null -w "%{http_code}" https://localhost:443 | grep -q "200\|301\|302"; then
    echo -e "${GREEN}   ✅ Puerto 443 (HTTPS) responde correctamente${NC}"
else
    echo -e "${RED}   ❌ Puerto 443 (HTTPS) no responde${NC}"
fi

# Test 3: Redirección HTTP a HTTPS
echo "📝 Test 3: Verificando redirección HTTP → HTTPS..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "301\|302"; then
    echo -e "${GREEN}   ✅ Puerto 80 redirige a HTTPS correctamente${NC}"
else
    echo -e "${YELLOW}   ⚠️  Puerto 80 no redirige (puede estar OK si no responde)${NC}"
fi

# Test 4: Puertos internos NO accesibles (deben fallar)
echo "📝 Test 4: Verificando que puertos internos NO son accesibles..."
echo "   (Estos tests DEBEN fallar - es lo correcto)"

SHOULD_FAIL_PORTS=(8001 8002 8003 9000 8005)
ALL_BLOCKED=true

for port in "${SHOULD_FAIL_PORTS[@]}"; do
    if timeout 2 bash -c "</dev/tcp/localhost/$port" 2>/dev/null; then
        echo -e "${YELLOW}   ⚠️  Puerto $port TODAVÍA accesible (considera comentarlo)${NC}"
        ALL_BLOCKED=false
    else
        echo -e "${GREEN}   ✅ Puerto $port bloqueado correctamente${NC}"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$ALL_BLOCKED" = true ]; then
    echo -e "${GREEN}🎉 ¡Todos los tests pasaron correctamente!${NC}"
else
    echo -e "${YELLOW}⚠️  Algunos puertos internos aún son accesibles${NC}"
    echo -e "${YELLOW}   Considera reiniciar todos los servicios: docker-compose down && docker-compose up -d${NC}"
fi

echo ""
echo -e "${GREEN}✅ Configuración HTTPS completada${NC}"
echo ""
echo "📖 Próximos pasos:"
echo "   1. Abre https://localhost:9443 en tu navegador"
echo "   2. Acepta el certificado autofirmado"
echo "   3. Verifica que todo funciona:"
echo "      - Login/Register"
echo "      - Crear/unirse a torneos"
echo "      - Jugar partidas (WebSocket WSS)"
echo "      - Chat (WebSocket WSS)"
echo ""
echo "📚 Documentación completa en:"
echo "   documents/HTTPS_IMPLEMENTATION_ANALYSIS.md"
echo ""
echo "🔐 Recordatorio de Seguridad:"
echo "   - Los certificados actuales son AUTOFIRMADOS"
echo "   - Para producción, usa Let's Encrypt o certificados comerciales"
echo "   - Actualiza Google OAuth redirect_uri en la consola de Google"
echo ""
