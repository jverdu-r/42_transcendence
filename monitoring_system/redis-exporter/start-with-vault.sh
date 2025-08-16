#!/bin/sh
set -e

# Lanzar Vault Agent en segundo plano
vault agent -config=/vault/agent.hcl &
VAULT_AGENT_PID=$!

# Esperar a que Vault Agent genere el .env
while [ ! -f /output/secrets.env ]; do
  sleep 1
done

# Exportar variables de entorno del .env
export $(grep -v '^#' /output/secrets.env | xargs)

# Lanzar redis-exporter
exec /usr/local/bin/redis_exporter
