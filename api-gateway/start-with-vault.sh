#!/bin/sh
set -e

# Arranca Vault Agent en background
vault agent -config=./agent.hcl &
VAULT_AGENT_PID=$!

# Espera a que el .env esté generado por la plantilla (máximo 30 segundos)
COUNTER=0
while [ ! -f ./.env ] && [ $COUNTER -lt 150 ]; do
  sleep 0.2
  COUNTER=$((COUNTER + 1))
done

if [ ! -f ./.env ]; then
  echo "ERROR: .env no fue generado por Vault Agent después de 30 segundos"
  echo "Usando variables por defecto..."
  export REDIS_PASSWORD="o-meu-contrasinal.42"
  export JWT_SECRET="default-jwt-secret"
else
  # Método seguro para cargar variables del .env
  echo "Cargando variables de .env..."
  set -a
  . ./.env
  set +a
fi

# Lanza la app Node.js
npm start
