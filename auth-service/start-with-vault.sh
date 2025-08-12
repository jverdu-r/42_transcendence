#!/bin/sh

set -e

# Lanzar Vault Agent en segundo plano
vault agent -config=./agent.hcl &
VAULT_AGENT_PID=$!

# Esperar a que Vault Agent genere el .env
echo "Esperando a que Vault Agent genere .env..."
while [ ! -f .env ]; do
	sleep 1
done

# Exportar variables de entorno del .env
export $(grep -v '^#' .env | xargs)

# Lanzar la app Node.js
node dist/server.js
