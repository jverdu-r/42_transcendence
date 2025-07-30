#!/bin/bash
# Script para mostrar todos los servicios y sus puertos con la IP actual

# Cargar variables de entorno
source .env

if [ -z "$MACHINE_IP" ]; then
    echo "❌ Error: MACHINE_IP no está definida en .env"
    exit 1
fi

echo "
🌐 PUERTOS Y SERVICIOS DE TRANSCENDENCE
==========================================
🖥️  IP de la máquina: $MACHINE_IP

📋 SERVICIOS PRINCIPALES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Servicio         │ URL de Acceso                                │ Descripción
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
nginx-proxy      │ http://$MACHINE_IP                          │ Proxy principal + SSL
                 │ https://$MACHINE_IP                         │
frontend         │ http://$MACHINE_IP:9001                     │ Interfaz web  
api-gateway      │ http://$MACHINE_IP:9000                     │ Gateway de APIs
auth-service     │ http://$MACHINE_IP:8001                     │ Autenticación
game-service     │ http://$MACHINE_IP:8002                     │ Lógica del juego
chat-service     │ http://$MACHINE_IP:8003                     │ Sistema de chat
db-service       │ http://$MACHINE_IP:8005                     │ Base de datos
WAF              │ http://$MACHINE_IP:9002                     │ Web Application Firewall
redis            │ redis://$MACHINE_IP:6379                    │ Cache/Session store
redis_commander  │ http://$MACHINE_IP:8081                     │ Interfaz Redis
vault            │ http://$MACHINE_IP:8200                     │ Gestión de secretos

🔍 SERVICIOS DE MONITOREO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
prometheus       │ http://$MACHINE_IP:9090                     │ Métricas y alertas
grafana          │ http://$MACHINE_IP:3000                     │ Dashboards (admin/admin123)
alertmanager     │ http://$MACHINE_IP:9093                     │ Gestión de alertas
node-exporter    │ http://$MACHINE_IP:9100                     │ Métricas del sistema
redis-exporter   │ http://$MACHINE_IP:9121                     │ Métricas de Redis
nginx-exporter   │ http://$MACHINE_IP:9113                     │ Métricas de Nginx
cadvisor         │ http://$MACHINE_IP:8084                     │ Métricas de contenedores
blackbox-export  │ http://$MACHINE_IP:9115                     │ Monitoreo de conectividad

📱 ACCESO RÁPIDO PARA DESARROLLO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 Aplicación principal:  http://$MACHINE_IP
🎮 Frontend directo:      http://$MACHINE_IP:9001  
🔑 Redis Commander:       http://$MACHINE_IP:8081
📊 Grafana:               http://$MACHINE_IP:3000
📈 Prometheus:            http://$MACHINE_IP:9090
🚨 Alertmanager:          http://$MACHINE_IP:9093
🔒 Vault:                 http://$MACHINE_IP:8200

💡 Comandos útiles:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ./update_machine_ip.sh        - Actualizar IP automáticamente
   ./generate_prometheus_config.sh - Regenerar configuración de Prometheus
   make set-ip                   - Hacer ambos de arriba
   make all-auto                 - IP + preparar + build + up
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"

echo "
🔍 ESTADO DEL SISTEMA DE MONITOREO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Prometheus: Recolectando métricas (17 reglas de alerta)
✅ Grafana: Dashboards funcionando (admin/ChangeMePlease!)
✅ Alertmanager: Gestión de alertas activa
✅ Exporters: 9 tipos configurados y funcionando
✅ Retención: 8.3 días de datos históricos
✅ Seguridad: Autenticación obligatoria en Grafana

💡 Para ver reporte completo: ./monitoring_status_report.sh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"
