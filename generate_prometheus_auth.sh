#!/bin/bash
# Script para generar autenticación para Prometheus

# Cargar variables de entorno
source .env

if [ -z "$PROMETHEUS_USER" ] || [ -z "$PROMETHEUS_PASSWORD" ]; then
    echo "❌ Error: PROMETHEUS_USER o PROMETHEUS_PASSWORD no están definidas en .env"
    exit 1
fi

# Instalar htpasswd si no está disponible
if ! command -v htpasswd &> /dev/null; then
    echo "📦 Instalando apache2-utils para htpasswd..."
    sudo apt-get update && sudo apt-get install -y apache2-utils
fi

# Crear directorio si no existe
mkdir -p ./monitoring_system/prometheus-auth

# Generar archivo de contraseñas
echo "🔐 Generando archivo de autenticación para Prometheus..."
htpasswd -cb ./monitoring_system/prometheus-auth/.htpasswd "$PROMETHEUS_USER" "$PROMETHEUS_PASSWORD"

echo "✅ Archivo de autenticación generado: ./monitoring_system/prometheus-auth/.htpasswd"
echo "🔑 Usuario: $PROMETHEUS_USER"
echo "🔒 Contraseña: [OCULTA]"
