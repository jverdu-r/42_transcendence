#!/bin/bash

# Script para agregar EMAIL_PASS a Vault

echo "🔐 Agregando EMAIL_PASS a Vault..."

# Obtener el token de root de Vault
VAULT_TOKEN=$(docker logs hashicorp_vault 2>&1 | grep "Root Token:" | tail -1 | awk '{print $NF}')

if [ -z "$VAULT_TOKEN" ]; then
    echo "❌ No se pudo obtener el token de Vault"
    echo "Verifica que Vault esté inicializado y desbloqueado"
    exit 1
fi

echo "✅ Token obtenido: ${VAULT_TOKEN:0:10}..."

# Agregar el secreto EMAIL_PASS
docker exec -e VAULT_TOKEN="$VAULT_TOKEN" hashicorp_vault vault kv put secret/email \
    EMAIL_PASS="kmevsiupyuxwkxsh"

if [ $? -eq 0 ]; then
    echo "✅ EMAIL_PASS agregado exitosamente a Vault"
    echo ""
    echo "🔄 Reiniciando auth-service para cargar el nuevo secreto..."
    docker restart auth-service
    echo "✅ auth-service reiniciado"
else
    echo "❌ Error al agregar EMAIL_PASS a Vault"
    exit 1
fi
