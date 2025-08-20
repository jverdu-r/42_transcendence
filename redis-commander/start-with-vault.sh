#!/bin/sh
set -e

# Arranca Vault Agent en background
vault agent -config=./agent.hcl &
VAULT_AGENT_PID=$!

# Espera a que el .env esté generado por la plantilla
while [ ! -f ./.env ]; do
  sleep 0.2
  echo "Esperando a que Vault Agent genere .env..."
done

# Exporta las variables de entorno del .env
export $(grep -v '^#' .env | xargs)

# Construye REDIS_HOSTS usando REDIS_PASSWORD
export REDIS_HOST="redis"
export REDIS_PORT="6379"
npx redis-commander --redis-host "$REDIS_HOST" --redis-port "$REDIS_PORT" --redis-password "$REDIS_PASSWORD"
