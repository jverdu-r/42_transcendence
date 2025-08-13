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

# Lanza la app Node.js
npm start
