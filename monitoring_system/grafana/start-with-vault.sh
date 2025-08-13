#!/bin/sh
set -e

# Lanzar Vault Agent en segundo plano
vault agent -config=/vault/agent.hcl &
VAULT_AGENT_PID=$!

# Esperar a que Vault Agent genere el .env
echo "Esperando a que Vault Agent genere .env..."
while [ ! -f /app/.env ]; do
  sleep 1
done

# Exportar variables de entorno del .env
export $(grep -v '^#' /app/.env | xargs)

# Lanzar Grafana
exec /run.sh
