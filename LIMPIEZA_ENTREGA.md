# Archivos que puedes eliminar para limpiar el proyecto (sin afectar funcionamiento)

## Documentación y notas
DIAGNOSTIC_STEPS.md
ESTADO_DESARROLLO.md
MEJORAS_JUEGO_ONLINE.md
MERGE_COMPLETADO.md
PROFILE_TRANSLATIONS_AND_AVATAR_FIXES.md
RESUMEN_MEJORAS.md
leer_monitoreo_gui.md
PONG_FIXES.md
README-REFACTORED.md
HTTPS_IMPLEMENTATION_ANALYSIS.md
HTTPS_CHANGES_APPLIED.md
full_game_flow_documentation.md
game_service_documentation.md
frontend_documentation.md
guia_resolucion_problemas.md
escritura_bbdd.md
SISTEMA_LOGIN_RESUMEN.md
monitoring_services.md
puertos_y_servicios.md
ProyectoTranscendence_DOC.md
DOCKER-TESTS-RESULTS.md
AI_IMPLEMENTATION_COMPLETE.md
AI_SYSTEM_DOCUMENTATION.md
CHAT_SYSTEM_COMPLETE.md

## Archivos de test y demo
shell-integration-demo.html
test-chat-simple.html
test-chat-websocket.html
test-websocket-direct.html
fix_gameOnline.js

## Scripts y utilidades no esenciales
print_tree.sh
show_services.sh
clear_cache_and_rebuild.sh
check_alerts.sh
generate_prometheus_auth.sh
generate_prometheus_config.sh
init-db-manual.sh
init_online_mode_web.sh
open-transcendence.sh
start_with_monitoring.sh
update_machine_ip.sh

## Traducciones y datos temporales
chat_en_translations.txt
usuarios.txt

## Base de datos temporal
(db.sqlite si usas una base persistente)
db.sqlite

## Configuración alternativa
nginx-proxy-simple.conf
(docker-compose-monitoring-patch.yml y volumes_monitoring.yml si no usas esos servicios)
docker-compose-monitoring-patch.yml
volumes_monitoring.yml

---

**No elimines:**
- Makefile, docker-compose.yml, README.md
- Carpetas de servicios y frontend
- Archivos de configuración y certificados necesarios

**Revisa antes de borrar si algún script o archivo es requerido por tu flujo de entrega.**
