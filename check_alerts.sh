#!/bin/bash
# Script para verificar el estado de las alertas del sistema

source .env

echo "
🚨 ESTADO DE ALERTAS DEL SISTEMA DE MONITOREO
==========================================
🖥️  IP de la máquina: $MACHINE_IP
⏰ Verificación: $(date)

"

# Verificar alertas activas
echo "📊 ALERTAS ACTIVAS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ACTIVE_ALERTS=$(curl -s http://$MACHINE_IP:9093/api/v2/alerts | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if isinstance(data, list):
        print(len(data))
    else:
        print('0')
except:
    print('0')
" 2>/dev/null)

if [ "$ACTIVE_ALERTS" = "0" ]; then
    echo "✅ ¡NO HAY ALERTAS ACTIVAS! - Sistema estable"
else
    echo "⚠️  $ACTIVE_ALERTS alertas activas - Revisar Alertmanager"
    curl -s http://$MACHINE_IP:9093/api/v2/alerts | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if isinstance(data, list) and len(data) > 0:
        for alert in data:
            alertname = alert['labels']['alertname']
            instance = alert['labels']['instance']
            status = alert['status']['state']
            print(f'  {status.upper():10} | {alertname:25} | {instance}')
except:
    pass
" 2>/dev/null
fi

echo "
📈 REGLAS DE ALERTA CONFIGURADAS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -s http://$MACHINE_IP:9090/api/v1/rules | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if data['status'] == 'success':
        groups = data['data']['groups']
        total_rules = 0
        for group in groups:
            rules_count = len(group['rules'])
            total_rules += rules_count
            print(f'✅ {group[\"name\"]:30} | {rules_count:2} reglas')
        print(f'📊 TOTAL: {total_rules} reglas de alerta configuradas')
    else:
        print('❌ Error al obtener las reglas de alerta')
except:
    print('❌ Error de conexión con Prometheus')
" 2>/dev/null

echo "
🔍 TARGETS MONITOREADOS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

curl -s http://$MACHINE_IP:9090/api/v1/targets | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    targets = data['data']['activeTargets']
    jobs = {}
    for target in targets:
        job = target['labels']['job']
        health = target['health']
        if job not in jobs:
            jobs[job] = {'up': 0, 'down': 0}
        if health == 'up':
            jobs[job]['up'] += 1
        else:
            jobs[job]['down'] += 1
    
    for job, status in jobs.items():
        total = status['up'] + status['down']
        icon = '✅' if status['down'] == 0 else '⚠️ '
        print(f'{icon} {job:20} | {status[\"up\"]:2}/{total:2} UP')
except:
    print('❌ Error de conexión con Prometheus')
" 2>/dev/null

echo "
💡 URLs DE ACCESO:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📈 Prometheus:   http://$MACHINE_IP:9090"
echo "📊 Grafana:      http://$MACHINE_IP:3000 (admin/ChangeMePlease!)"
echo "🚨 Alertmanager: http://$MACHINE_IP:9093"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
