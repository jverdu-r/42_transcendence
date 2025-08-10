#!/bin/bash

# Complete Vault Setup Script for Trascender Project
# This script automates the entire Vault setup process

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Use the same DATA_PATH as the main project
DATA_PATH="${DATA_PATH:-${HOME}/data/transcendence}"
export DATA_PATH

echo -e "${BLUE}🚀 Trascender Vault Setup Script${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Create environment file
echo -e "${BLUE}📄 Setting up environment file...${NC}"
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    # Create a basic .env file
    cat > "$SCRIPT_DIR/.env" << EOF
# Vault Configuration - TLS enabled
VAULT_ADDR=https://localhost:8200
VAULT_SKIP_VERIFY=true
DATA_PATH=$DATA_PATH

# Basic configuration
COMPOSE_PROJECT_NAME=trascender
MACHINE_IP=localhost
EOF
    
    echo -e "${GREEN}✅ Environment file created${NC}"
    echo -e "${YELLOW}💡 Review and modify .env file if needed${NC}"
else
    echo -e "${YELLOW}⚠️ .env file already exists, updating DATA_PATH...${NC}"
    sed -i "s|DATA_PATH=.*|DATA_PATH=$DATA_PATH|" "$SCRIPT_DIR/.env"
    sed -i "s|VAULT_ADDR=.*|VAULT_ADDR=https://localhost:8200|" "$SCRIPT_DIR/.env"
    # Add VAULT_SKIP_VERIFY if not present
    if ! grep -q "VAULT_SKIP_VERIFY" "$SCRIPT_DIR/.env"; then
        echo "VAULT_SKIP_VERIFY=true" >> "$SCRIPT_DIR/.env"
    fi
fi


# Wait for Vault to be ready
echo -e "${BLUE}⏳ Waiting for Vault to respond...${NC}"
sleep 10

# Verify Vault is responding
if ! curl -k -s --connect-timeout 5 https://localhost:8200/v1/sys/health >/dev/null 2>&1; then
    echo -e "${RED}❌ Vault failed to start${NC}"
    echo -e "${RED}Check container logs: docker logs hashicorp_vault${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Vault is responding!${NC}"

# Initialize Vault
echo -e "${BLUE}🔐 Checking Vault initialization status...${NC}"

# Check if Vault is already initialized
VAULT_STATUS=$(curl -k -s https://localhost:8200/v1/sys/health)
IS_INITIALIZED=$(echo "$VAULT_STATUS" | jq -r '.initialized // false')
IS_SEALED=$(echo "$VAULT_STATUS" | jq -r '.sealed // true')

echo -e "${BLUE}📊 Current Vault status:${NC}"
echo "$VAULT_STATUS" | jq .
echo -e "${BLUE}Status: Initialized=$IS_INITIALIZED, Sealed=$IS_SEALED${NC}"

if [ "$IS_INITIALIZED" = "false" ]; then
    echo -e "${BLUE}🔐 Initializing Vault for the first time...${NC}"
    
    # Initialize Vault directly with docker exec
    INIT_OUTPUT=$(docker exec hashicorp_vault sh -c '
        export VAULT_ADDR=https://localhost:8200
        export VAULT_SKIP_VERIFY=true
        vault operator init -key-shares=3 -key-threshold=2 -format=json > /vault/generated/vault-keys.json
    ')
    
    if [ $? -eq 0 ]; then
#        echo "$INIT_OUTPUT" > ./vault/generated/vault-keys.json
        echo -e "${GREEN}✅ Vault initialized successfully!${NC}"
        
        # Extract keys and token
        UNSEAL_KEY_1=$(echo "$INIT_OUTPUT" | jq -r '.unseal_keys_b64[0]')
        UNSEAL_KEY_2=$(echo "$INIT_OUTPUT" | jq -r '.unseal_keys_b64[1]')
        ROOT_TOKEN=$(echo "$INIT_OUTPUT" | jq -r '.root_token')
        
        # Copy keys to organized location in vault/generated/
        mkdir -p vault/generated
    docker cp hashicorp_vault:/vault/generated/vault-keys.json ./vault/generated/vault-keys.json 2>/dev/null || echo "$INIT_OUTPUT" > ./vault/generated/vault-keys.json
    chown $(id -u):$(id -g) ./vault/generated/vault-keys.json
    chmod 666 ./vault/generated/vault-keys.json
    UNSEAL_KEY_1=$(jq -r '.unseal_keys_b64[0]' ./vault/generated/vault-keys.json)
    UNSEAL_KEY_2=$(jq -r '.unseal_keys_b64[1]' ./vault/generated/vault-keys.json)

    # Extraer root token del archivo generado
    ROOT_TOKEN=$(jq -r '.root_token' ./vault/generated/vault-keys.json)
    else
        echo -e "${RED}❌ Failed to initialize Vault${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️ Vault already initialized${NC}"
    # Try to load existing keys
    if [ -f "./vault/generated/vault-keys.json" ]; then
        UNSEAL_KEY_1=$(jq -r '.unseal_keys_b64[0]' ./vault/generated/vault-keys.json)
        UNSEAL_KEY_2=$(jq -r '.unseal_keys_b64[1]' ./vault/generated/vault-keys.json)
        ROOT_TOKEN=$(jq -r '.root_token' ./vault/generated/vault-keys.json)
    else
        echo -e "${RED}❌ Vault is initialized but keys file not found!${NC}"
        echo -e "${RED}❌ Expected file: ./vault/generated/vault-keys.json${NC}"
        exit 1
    fi
fi

echo "Unseal key 1: $UNSEAL_KEY_1"
echo "Unseal key 2: $UNSEAL_KEY_2"

# Unseal Vault if sealed
if [ "$IS_SEALED" = "true" ]; then
    echo -e "${BLUE}🔓 Unsealing Vault...${NC}"
    
    docker exec hashicorp_vault sh -c "
        export VAULT_ADDR=https://localhost:8200
        export VAULT_SKIP_VERIFY=true
        vault operator unseal \"$UNSEAL_KEY_1\"
        vault operator unseal \"$UNSEAL_KEY_2\"
    "
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Vault unsealed successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to unseal Vault${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️ Vault already unsealed${NC}"
fi

# Configure Vault secrets and policies
echo -e "${BLUE}🔧 Configuring Vault secrets engine and policies...${NC}"

docker exec hashicorp_vault sh -c "
    export VAULT_ADDR=https://localhost:8200
    export VAULT_SKIP_VERIFY=true
    export VAULT_TOKEN=$ROOT_TOKEN

    # Enable KV secrets engine if not already enabled
    if ! vault secrets list | grep -q 'secret/'; then
        echo 'Enabling KV secrets engine...'
        vault secrets enable -path=secret kv-v2
    else
        echo 'KV secrets engine already enabled'
    fi

    # Crear policies desde archivos HCL
    echo 'Creating admin policy...'
    vault policy write admin-policy /vault/policies/admin-policy.hcl
    echo 'Creating service policies from HCL files...'
    vault policy write auth-service-policy /vault/policies/auth-service-policy.hcl
    vault policy write game-service-policy /vault/policies/game-service-policy.hcl
    vault policy write chat-service-policy /vault/policies/chat-service-policy.hcl
    vault policy write db-service-policy /vault/policies/db-service-policy.hcl
    vault policy write api-gateway-policy /vault/policies/api-gateway-policy.hcl
"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Vault configuration completed!${NC}"
else
    echo -e "${RED}❌ Failed to configure Vault${NC}"
    exit 1
fi

# Create service tokens
echo -e "${BLUE}🔑 Creating service tokens...${NC}"

SERVICE_TOKENS=$(docker exec hashicorp_vault sh -c '
    export VAULT_ADDR=https://localhost:8200
    export VAULT_SKIP_VERIFY=true
    export VAULT_TOKEN='"$ROOT_TOKEN"'
    AUTH_TOKEN=$(vault write -field=token auth/token/create policies="auth-service-policy" ttl=720h renewable=true display_name="auth-service" 2>/dev/null || echo "")
    GAME_TOKEN=$(vault write -field=token auth/token/create policies="game-service-policy" ttl=720h renewable=true display_name="game-service" 2>/dev/null || echo "")
    CHAT_TOKEN=$(vault write -field=token auth/token/create policies="chat-service-policy" ttl=720h renewable=true display_name="chat-service" 2>/dev/null || echo "")
    DB_TOKEN=$(vault write -field=token auth/token/create policies="db-service-policy" ttl=720h renewable=true display_name="db-service" 2>/dev/null || echo "")
    API_TOKEN=$(vault write -field=token auth/token/create policies="api-gateway-policy" ttl=720h renewable=true display_name="api-gateway" 2>/dev/null || echo "")
    cat <<EOF
{
    "root_token": "'"$ROOT_TOKEN"'",
    "auth_service_token": "$AUTH_TOKEN",
    "game_service_token": "$GAME_TOKEN",
    "chat_service_token": "$CHAT_TOKEN",
    "db_service_token": "$DB_TOKEN",
    "api_gateway_token": "$API_TOKEN"
}
EOF
')

# Save tokens to file
mkdir -p vault/generated
echo "$SERVICE_TOKENS" > ./vault/generated/service-tokens.json

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Service tokens created successfully!${NC}"
else
    echo -e "${RED}❌ Failed to create service tokens${NC}"
    exit 1
fi

# Create environment file with tokens
echo -e "${BLUE}� Creating environment files...${NC}"

# Extract tokens from service-tokens.json
if [ -f "./vault/generated/service-tokens.json" ]; then
    ROOT_TOKEN_SAVED=$(jq -r '.root_token' ./vault/generated/service-tokens.json)
    AUTH_TOKEN=$(jq -r '.auth_service_token' ./vault/generated/service-tokens.json)
    GAME_TOKEN=$(jq -r '.game_service_token' ./vault/generated/service-tokens.json)
    CHAT_TOKEN=$(jq -r '.chat_service_token' ./vault/generated/service-tokens.json)
    DB_TOKEN=$(jq -r '.db_service_token' ./vault/generated/service-tokens.json)
    API_TOKEN=$(jq -r '.api_gateway_token' ./vault/generated/service-tokens.json)
    
    # Create tokens file for services in vault/generated/
    cat > "./vault/generated/.env.tokens" << EOF
# Vault Service Tokens - Source this file or add to your .env
export VAULT_TOKEN_ROOT="$ROOT_TOKEN_SAVED"
export VAULT_TOKEN_AUTH_SERVICE="$AUTH_TOKEN"
export VAULT_TOKEN_GAME_SERVICE="$GAME_TOKEN"
export VAULT_TOKEN_CHAT_SERVICE="$CHAT_TOKEN"
export VAULT_TOKEN_DB_SERVICE="$DB_TOKEN"
export VAULT_TOKEN_API_GATEWAY="$API_TOKEN"
EOF
    
    # Also create a symlink in the root for easier access
    ln -sf vault/generated/.env.tokens .env.tokens 2>/dev/null || true
    
    echo -e "${GREEN}✅ Service tokens saved to vault/generated/.env.tokens${NC}"
fi

# Final status check
echo -e "${BLUE}🔍 Final status check...${NC}"
FINAL_STATUS=$(curl -k -s https://localhost:8200/v1/sys/health)
IS_READY=$(echo "$FINAL_STATUS" | jq -r '.initialized and (.sealed | not)')

if [ "$IS_READY" = "true" ]; then
    echo -e "${GREEN}✅ Vault is fully operational!${NC}"
else
    echo -e "${YELLOW}⚠️ Vault status check:${NC}"
    echo "$FINAL_STATUS" | jq .
fi


# =====================
# Crear secretos en Vault leyendo del .env
# =====================

# Cargar variables del .env de la raíz
set -a
[ -f "$SCRIPT_DIR/../../.env" ] && source "$SCRIPT_DIR/../../.env"
set +a

echo -e "${BLUE}🔐 Creating initial secrets in Vault...${NC}"

docker exec hashicorp_vault sh -c "
    export VAULT_ADDR=https://localhost:8200
    export VAULT_SKIP_VERIFY=true
    export VAULT_TOKEN='$ROOT_TOKEN'
    vault kv put secret/redis REDIS_PASSWORD='${REDIS_PASSWORD:-}'
    vault kv put secret/jwt JWT_SECRET='${JWT_SECRET:-}'
    vault kv put secret/grafana GRAFANA_USER='${GRAFANA_USER:-}' GRAFANA_PASSWORD='${GRAFANA_PASSWORD:-}'
    vault kv put secret/prometheus PROMETHEUS_USER='${PROMETHEUS_USER:-}' PROMETHEUS_PASSWORD='${PROMETHEUS_PASSWORD:-}'
"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Initial secrets created in Vault!${NC}"
else
    echo -e "${RED}❌ Failed to create initial secrets in Vault${NC}"
    exit 1
fi


# Summary
echo ""
echo -e "${GREEN}🎉 Vault setup completed successfully!${NC}"
echo -e "${GREEN}=================================${NC}"
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo -e "  ✅ Vault server running on: ${BLUE}https://localhost:8200${NC}"
echo -e "  ✅ Vault UI available at: ${BLUE}https://localhost:8200/ui${NC}"
echo -e "  ✅ Root token: ${YELLOW}$ROOT_TOKEN${NC}"
echo -e "  ✅ Data directory: ${BLUE}$DATA_PATH${NC}"
echo -e "  ✅ TLS certificates: ${BLUE}vault/certs/${NC}"
echo -e "  ✅ Configuration files: ${BLUE}vault/generated/vault-keys.json, vault/generated/service-tokens.json${NC}"
echo -e "  ✅ Environment tokens: ${BLUE}vault/generated/.env.tokens${NC}"
echo -e "  ✅ Secrets in Vault:"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo -e "  1. Review tokens: ${YELLOW}cat vault/generated/.env.tokens${NC}"
echo -e "  2. Start all services: ${YELLOW}docker compose up -d${NC}"
echo -e "  3. Open Vault UI: ${YELLOW}open https://localhost:8200/ui${NC}"
echo -e "  4. Login with root token: ${YELLOW}$ROOT_TOKEN${NC}"
echo ""
echo -e "${YELLOW}⚠️ Important Security Notes:${NC}"
echo -e "  🔐 Backup vault/generated/vault-keys.json and vault/generated/service-tokens.json securely"
echo -e "  🔐 Store tokens in a secure location"
echo -e "  🔐 TLS is enabled with self-signed certificates for development"
echo -e "  🔐 For production, use certificates from a trusted CA"
echo -e "  🔐 Trust the CA certificate in vault/certs/ca.crt for clients"
echo ""
