# Guía de Resolución de Problemas - Sistema de Monitoreo

## Problemas Comunes y Soluciones

### 1. Servicios de Monitoreo No Inician

**Síntoma**: Los contenedores de Prometheus, Grafana o Alertmanager no se inician correctamente.

**Causa más común**: Permisos insuficientes en los directorios de datos.

**Solución**:
```bash
sudo mkdir -p /root/data/transcendence/{prometheus,grafana,alertmanager}
sudo chmod -R 777 /root/data/transcendence/{prometheus,grafana,alertmanager}
sudo docker compose restart prometheus grafana alertmanager
```

### 2. Prometheus No Recolecta Métricas

**Síntoma**: En la interfaz de Prometheus (`http://localhost:9090`), los targets aparecen como "DOWN".

**Diagnóstico**:
1. Verificar el estado de los targets:
   - Ir a `Status > Targets` en Prometheus
   - Identificar qué servicios están fallando

**Soluciones**:
- **Si los servicios de aplicación están DOWN**:
  ```bash
  sudo docker compose restart auth-service game-service chat-service
  ```
- **Si los exporters están DOWN**:
  ```bash
  sudo docker compose restart node-exporter redis-exporter cadvisor
  ```

### 3. Grafana No Muestra Datos

**Síntoma**: Los paneles de Grafana están vacíos o muestran "No data".

**Soluciones**:
1. **Verificar la conexión con Prometheus**:
   - En Grafana, ir a `Configuration > Data Sources`
   - Verificar que Prometheus esté marcado como "Working"

2. **Reiniciar Grafana**:
   ```bash
   sudo docker compose restart grafana
   ```

3. **Verificar que Prometheus tenga datos**:
   - Ir a `http://localhost:9090`
   - Ejecutar una consulta simple como `up`

### 4. Alertas No Se Envían

**Síntoma**: Las alertas se muestran en Prometheus pero no llegan a Alertmanager.

**Soluciones**:
1. **Verificar la configuración de Alertmanager en Prometheus**:
   ```bash
   sudo docker compose exec prometheus cat /etc/prometheus/prometheus.yml | grep -A 5 alerting
   ```

2. **Reiniciar ambos servicios**:
   ```bash
   sudo docker compose restart prometheus alertmanager
   ```

### 5. cAdvisor No Funciona

**Síntoma**: No hay métricas de contenedores disponibles.

**Causa**: cAdvisor requiere privilegios especiales y acceso a archivos del sistema.

**Solución**:
```bash
sudo docker compose restart cadvisor
# Si persiste el problema, verificar los logs:
sudo docker compose logs cadvisor
```

### 6. Nginx Exporter Falla

**Síntoma**: Las métricas de Nginx no están disponibles.

**Causa**: Nginx proxy no tiene habilitado el módulo de estado.

**Solución**: Verificar que nginx-proxy esté configurado correctamente:
```bash
sudo docker compose logs nginx-exporter
sudo docker compose logs nginx-proxy
```

## Comandos de Diagnóstico

### Verificar Estado General
```bash
# Ver todos los contenedores
sudo docker compose ps

# Ver logs de todos los servicios de monitoreo
sudo docker compose logs prometheus grafana alertmanager

# Verificar conectividad de red
sudo docker network ls
sudo docker network inspect transcendence_net
```

### Verificar Métricas Manualmente
```bash
# Verificar que Prometheus esté recolectando métricas
curl http://localhost:9090/api/v1/query?query=up

# Verificar que los exporters estén respondiendo
curl http://localhost:9100/metrics  # Node Exporter
curl http://localhost:9121/metrics  # Redis Exporter
curl http://localhost:8084/metrics  # cAdvisor
```

### Verificar Configuración
```bash
# Verificar configuración de Prometheus
sudo docker compose exec prometheus promtool check config /etc/prometheus/prometheus.yml

# Verificar reglas de alerta
sudo docker compose exec prometheus promtool check rules /etc/prometheus/alert_rules.yml
```

## Configuración Avanzada

### Añadir Nuevas Métricas

Para monitorear un nuevo servicio:

1. **Añadir el job a Prometheus** (`monitoring_system/prometheus/prometheus.yml`):
```yaml
- job_name: 'nuevo-servicio'
  static_configs:
    - targets: ['nuevo-servicio:puerto']
  metrics_path: '/metrics'  # o el path que use el servicio
  scrape_interval: 30s
```

2. **Reiniciar Prometheus**:
```bash
sudo docker compose restart prometheus
```

### Personalizar Alertas

1. **Editar reglas de alerta** (`monitoring_system/prometheus/alert_rules.yml`):
```yaml
- alert: NuevaAlerta
  expr: mi_metrica > 80
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "Mi nueva alerta personalizada"
```

2. **Recargar configuración de Prometheus**:
```bash
curl -X POST http://localhost:9090/-/reload
```

### Configurar Notificaciones por Email

1. **Editar Alertmanager** (`monitoring_system/alertmanager/alertmanager.yml`):
```yaml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'tu-email@gmail.com'
  smtp_auth_username: 'tu-email@gmail.com'
  smtp_auth_password: 'tu-password-de-aplicacion'

receivers:
  - name: 'email-notifications'
    email_configs:
      - to: 'admin@transcendence.local'
        subject: '[ALERT] {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
```

### Optimización de Rendimiento

**Para entornos de producción**:

1. **Ajustar intervalos de recolección** en `prometheus.yml`:
```yaml
global:
  scrape_interval: 30s  # Reducir para menos carga
```

2. **Configurar retención de datos**:
```yaml
# En docker-compose.yml, añadir a los command de prometheus:
- '--storage.tsdb.retention.time=90d'
- '--storage.tsdb.retention.size=10GB'
```

3. **Limitar recursos de contenedores**:
```yaml
# En docker-compose.yml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
```

## Logs y Archivos Importantes

### Ubicaciones de Archivos
- **Configuración de Prometheus**: `monitoring_system/prometheus/`
- **Dashboards de Grafana**: `monitoring_system/grafana/dashboards/`
- **Datos persistentes**: `/root/data/transcendence/`

### Comandos para Ver Logs
```bash
# Logs en tiempo real
sudo docker compose logs -f prometheus
sudo docker compose logs -f grafana
sudo docker compose logs -f alertmanager

# Logs históricos
sudo docker compose logs --tail=100 prometheus
```

## Métricas de Rendimiento Clave

### CPU y Memoria
- `node_cpu_seconds_total`: Uso de CPU por core
- `node_memory_MemAvailable_bytes`: Memoria disponible
- `container_cpu_usage_seconds_total`: Uso de CPU por contenedor

### Redis
- `redis_memory_used_bytes`: Memoria usada por Redis
- `redis_connected_clients`: Clientes conectados
- `redis_keyspace_hits_total`: Hits en el keyspace

### Nginx
- `nginx_http_requests_total`: Total de requests HTTP
- `nginx_connections_active`: Conexiones activas

---
*Última actualización: 2025-07-30*
