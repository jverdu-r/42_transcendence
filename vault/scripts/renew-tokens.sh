#!/bin/bash

# Vault Token Renewal Script
# This script renews service tokens before they expire

set -e

TOKENS_FILE="/vault/scripts/service-tokens.json"

if [ ! -f "$TOKENS_FILE" ]; then
  echo "Error: service-tokens.json not found!"
  exit 1
fi

echo "=== Renewing Vault Service Tokens ==="

# Read current tokens
AUTH_TOKEN=$(jq -r '.auth_service_token' "$TOKENS_FILE")
GAME_TOKEN=$(jq -r '.game_service_token' "$TOKENS_FILE")
CHAT_TOKEN=$(jq -r '.chat_service_token' "$TOKENS_FILE")
DB_TOKEN=$(jq -r '.db_service_token' "$TOKENS_FILE")
API_TOKEN=$(jq -r '.api_gateway_token' "$TOKENS_FILE")

# Renew tokens
echo "Renewing auth-service token..."
export VAULT_TOKEN="$AUTH_TOKEN"
vault auth -method=token token="$AUTH_TOKEN" >/dev/null 2>&1
vault token renew >/dev/null

echo "Renewing game-service token..."
export VAULT_TOKEN="$GAME_TOKEN"
vault auth -method=token token="$GAME_TOKEN" >/dev/null 2>&1
vault token renew >/dev/null

echo "Renewing chat-service token..."
export VAULT_TOKEN="$CHAT_TOKEN"
vault auth -method=token token="$CHAT_TOKEN" >/dev/null 2>&1
vault token renew >/dev/null

echo "Renewing db-service token..."
export VAULT_TOKEN="$DB_TOKEN"
vault auth -method=token token="$DB_TOKEN" >/dev/null 2>&1
vault token renew >/dev/null

echo "Renewing api-gateway token..."
export VAULT_TOKEN="$API_TOKEN"
vault auth -method=token token="$API_TOKEN" >/dev/null 2>&1
vault token renew >/dev/null

echo "✅ All service tokens renewed successfully!"

# Create a cron job entry example
cat > /tmp/vault-cron-example << 'EOF'
# Add this line to your crontab to auto-renew tokens daily
# Run: crontab -e
# Add: 0 2 * * * /path/to/vault/scripts/renew-tokens.sh >> /var/log/vault-renewal.log 2>&1
EOF

echo "💡 Consider setting up a cron job for automatic token renewal"
echo "See /tmp/vault-cron-example for details"
