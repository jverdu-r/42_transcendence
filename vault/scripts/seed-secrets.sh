#!/bin/bash

# Vault Secret Seeding Script
# This script populates Vault with initial secrets for the Trascender project

set -e

# Check if VAULT_TOKEN is set
if [ -z "$VAULT_TOKEN" ]; then
  echo "Error: VAULT_TOKEN environment variable is not set"
  echo "Please set it to your root token or a token with sufficient permissions"
  exit 1
fi

echo "=== Seeding Vault with initial secrets ==="

# Generate secure random passwords and secrets
generate_password() {
  openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

generate_jwt_secret() {
  openssl rand -base64 64 | tr -d "=+/"
}

# Generate secrets
REDIS_PASSWORD=$(generate_password)
JWT_SECRET=$(generate_jwt_secret)
DB_ENCRYPTION_KEY=$(generate_password)
API_KEY=$(generate_password)
OAUTH_CLIENT_SECRET=$(generate_password)

echo "Generated secure secrets..."

# Common configuration secrets
echo "Setting up common configuration..."
vault kv put secret/common/environment \
  NODE_ENV=production \
  LOG_LEVEL=info \
  SERVICE_NAME=trascender

# Database secrets
echo "Setting up database secrets..."
vault kv put secret/database/config \
  encryption_key="$DB_ENCRYPTION_KEY" \
  backup_retention_days=30

# Redis secrets
echo "Setting up Redis secrets..."
vault kv put secret/redis/config \
  host=redis \
  port=6379 \
  password="$REDIS_PASSWORD" \
  max_connections=100 \
  timeout=5000

# JWT secrets
echo "Setting up JWT secrets..."
vault kv put secret/jwt/config \
  secret="$JWT_SECRET" \
  expiration=3600 \
  refresh_expiration=604800 \
  algorithm=HS256

# Auth service specific secrets
echo "Setting up Auth service secrets..."
vault kv put secret/auth-service/config \
  api_key="$API_KEY" \
  session_timeout=1800 \
  max_login_attempts=5 \
  lockout_duration=900

vault kv put secret/auth-service/oauth \
  google_client_id="your-google-client-id" \
  google_client_secret="$OAUTH_CLIENT_SECRET" \
  oauth_callback_url="http://localhost:9001/auth/callback"

# Game service specific secrets
echo "Setting up Game service secrets..."
vault kv put secret/game-service/config \
  max_concurrent_games=100 \
  game_timeout=300 \
  leaderboard_cache_ttl=3600

# Chat service specific secrets
echo "Setting up Chat service secrets..."
vault kv put secret/chat-service/config \
  max_message_length=500 \
  rate_limit_messages=10 \
  rate_limit_window=60 \
  message_retention_days=90

# DB service specific secrets
echo "Setting up DB service secrets..."
vault kv put secret/db-service/config \
  sqlite_path="/app/data/transcendence.db" \
  backup_interval=3600 \
  max_connections=10

# API Gateway specific secrets
echo "Setting up API Gateway secrets..."
vault kv put secret/api-gateway/config \
  rate_limit=1000 \
  rate_window=3600 \
  cors_origins="http://localhost:9001,http://localhost:9002"

# Monitoring secrets
echo "Setting up monitoring secrets..."
vault kv put secret/monitoring/config \
  grafana_admin_password=$(generate_password) \
  prometheus_retention=15d \
  alert_webhook_url="http://localhost:9093"

# Generate .env file for Docker Compose
echo "Generating environment file..."
cat > /vault/scripts/.env.vault << EOF
# Vault Configuration
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=$VAULT_TOKEN

# Generated secrets (these will be fetched from Vault by services)
REDIS_PASSWORD=$REDIS_PASSWORD
JWT_SECRET=$JWT_SECRET

# Service URLs
AUTH_SERVICE_URL=http://auth-service:8000
GAME_SERVICE_URL=http://game-service:8000
CHAT_SERVICE_URL=http://chat-service:8000

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# Monitoring
GRAFANA_USER=admin
GRAFANA_PASSWORD=$(vault kv get -field=grafana_admin_password secret/monitoring/config)

# Machine IP (update this to your actual machine IP)
MACHINE_IP=localhost

# Data paths
DATA_PATH=/tmp/trascender-data
EOF

echo "=== Vault seeding completed successfully! ==="
echo ""
echo "Secrets have been stored in Vault under the following paths:"
echo "- secret/common/*"
echo "- secret/database/*"
echo "- secret/redis/*"
echo "- secret/jwt/*"
echo "- secret/auth-service/*"
echo "- secret/game-service/*"
echo "- secret/chat-service/*"
echo "- secret/db-service/*"
echo "- secret/api-gateway/*"
echo "- secret/monitoring/*"
echo ""
echo "Environment file created at: /vault/scripts/.env.vault"
echo "Copy this file to your project root as .env"
