#!/bin/sh
set -eo pipefail

REDIS_PASSWORD=$(cat ${REDIS_PASSWORD_FILE})

# Verificar conexión básica
if ! redis-cli -a "$REDIS_PASSWORD" ping | grep -q "PONG"; then
  echo "Error: No se pudo conectar a Redis"
  exit 1
fi

# Verificar estado completo
STATUS=$(redis-cli -a "$REDIS_PASSWORD" info all)
if [ -z "$STATUS" ]; then
  echo "Error: No se pudo obtener el estado de Redis"
  exit 1
fi

# Verificar memoria
MEM_USAGE=$(echo "$STATUS" | grep -E "used_memory_human:" | cut -d: -f2)
echo "Memoria usada: $MEM_USAGE"

exit 0