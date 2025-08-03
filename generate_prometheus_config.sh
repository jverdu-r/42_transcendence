#!/bin/bash
# Script para generar prometheus.yml a partir de un template y el .env

# Cargar variables de entorno
source .env

if [ -z "$MACHINE_IP" ]; then
    echo "❌ Error: MACHINE_IP no está definida en .env"
    exit 1
fi

# Procesar el template
sed "s/{{MACHINE_IP}}/$MACHINE_IP/g" ./monitoring_system/prometheus/prometheus.yml.template > ./monitoring_system/prometheus/prometheus.yml

echo "✅ Configuración de Prometheus generada con éxito para la IP: $MACHINE_IP"
