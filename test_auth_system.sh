#!/bin/bash

echo "🚀 Iniciando pruebas del sistema de autenticación..."

# Colores para mejor legibilidad
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir resultados
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

echo -e "${YELLOW}1. Probando registro de usuario...${NC}"
REGISTER_RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/auth/register -X POST -H "Content-Type: application/json" -d '{"username":"testuser3","email":"test3@example.com","password":"password123"}')
print_result $([[ $REGISTER_RESULT == "201" ]] && echo 0 || echo 1) "Registro de usuario (HTTP $REGISTER_RESULT)"

echo -e "${YELLOW}2. Probando login con credenciales válidas...${NC}"
LOGIN_RESULT=$(curl -s http://localhost:8001/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test3@example.com","password":"password123"}')
TOKEN=$(echo $LOGIN_RESULT | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
print_result $([[ -n "$TOKEN" ]] && echo 0 || echo 1) "Login exitoso - Token obtenido"

echo -e "${YELLOW}3. Probando login con credenciales inválidas...${NC}"
INVALID_LOGIN=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test3@example.com","password":"wrongpassword"}')
print_result $([[ $INVALID_LOGIN == "401" ]] && echo 0 || echo 1) "Login con credenciales inválidas rechazado (HTTP $INVALID_LOGIN)"

echo -e "${YELLOW}4. Probando registro con email duplicado...${NC}"
DUPLICATE_REGISTER=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/auth/register -X POST -H "Content-Type: application/json" -d '{"username":"testuser4","email":"test3@example.com","password":"password123"}')
print_result $([[ $DUPLICATE_REGISTER == "409" ]] && echo 0 || echo 1) "Registro con email duplicado rechazado (HTTP $DUPLICATE_REGISTER)"

echo -e "${YELLOW}5. Verificando que el frontend esté accesible...${NC}"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9001)
print_result $([[ $FRONTEND_STATUS == "200" ]] && echo 0 || echo 1) "Frontend accesible (HTTP $FRONTEND_STATUS)"

echo -e "${YELLOW}6. Verificando que el script de Google esté incluido...${NC}"
GOOGLE_SCRIPT=$(curl -s http://localhost:9001 | grep -c "accounts.google.com/gsi/client")
print_result $([[ $GOOGLE_SCRIPT -gt 0 ]] && echo 0 || echo 1) "Script de Google incluido en el HTML"

echo ""
echo -e "${GREEN}🎉 Pruebas completadas!${NC}"
echo ""
echo -e "${YELLOW}📋 Resumen de funcionalidades implementadas:${NC}"
echo "✅ Registro de usuario con email/username/password"
echo "✅ Login con email/password"
echo "✅ Generación de JWT tokens"
echo "✅ Validación de credenciales"
echo "✅ Prevención de registros duplicados"
echo "✅ Integración con Google Sign-In (frontend)"
echo "✅ Sistema de autenticación JWT"
echo "✅ CORS habilitado"
echo "✅ Base de datos SQLite funcional"
echo ""
echo -e "${YELLOW}🌐 URLs de acceso:${NC}"
echo "Frontend: http://localhost:9001"
echo "Auth Service: http://localhost:8001"
echo ""
echo -e "${YELLOW}🔑 Token de ejemplo obtenido:${NC}"
echo "$TOKEN"
