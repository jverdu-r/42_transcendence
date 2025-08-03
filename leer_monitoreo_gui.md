# 📊 Guía Completa del Sistema de Monitoreo

Este documento proporciona una guía detallada sobre la configuración y el uso del sistema de monitoreo basado en Prometheus y Grafana. El objetivo es ofrecer una visión clara de cómo acceder, interpretar y gestionar las métricas y alertas del sistema.

## 1. **Arquitectura de Monitoreo**

El sistema de monitoreo está compuesto por los siguientes componentes clave, todos gestionados a través de Docker Compose:

- **Prometheus:** Recolector de métricas y sistema de alertas.
- **Grafana:** Plataforma de visualización y dashboards.
- **Alertmanager:** Gestor de alertas y notificaciones.
- **Node Exporter:** Exportador de métricas del sistema (CPU, RAM, disco).
- **Redis Exporter:** Exportador de métricas de Redis.
- **cAdvisor:** Exportador de métricas de contenedores Docker.
- **Nginx Exporter:** Exportador de métricas de Nginx.
- **Blackbox Exporter:** Exportador para pruebas de endpoints (HTTP/TCP).

## 2. **Acceso a los Servicios de Monitoreo**

Todos los servicios de monitoreo son accesibles a través de un navegador web en las siguientes direcciones:

| Servicio     | URL                                    | Propósito                                       |
|--------------|----------------------------------------|-------------------------------------------------|
| **Grafana**  | `http://<IP_MAQUINA>:3000`             | Visualización de dashboards y métricas          |
| **Prometheus** | `http://<IP_MAQUINA>:9090`             | Consulta de métricas y estado de los `targets`  |
| **Alertmanager**| `http://<IP_MAQUINA>:9093`             | Gestión de alertas y silencios                  |

**Credenciales por defecto:**

- **Grafana:**
  - **Usuario:** `admin`
  - **Contraseña:** `ChangeMePlease!` (almacenada en `.env`)

- **Prometheus:**
  - **Usuario:** `admin`
  - **Contraseña:** `PrometheusSecure123!` (almacenada en `.env`)

## 3. **Configuración de Prometheus**

La configuración principal de Prometheus se encuentra en `monitoring_system/prometheus/prometheus.yml` y está diseñada para ser dinámica, utilizando la IP de la máquina host para los `targets`.

### **Estructura de la Configuración:**

- **`global`:** Define la configuración global, como el intervalo de `scrape`.
- **`rule_files`:** Especifica los archivos de reglas de alertas.
- **`alerting`:** Configura la conexión con Alertmanager.
- **`scrape_configs`:** Define los `jobs` de `scrape` para cada servicio.

### **Scrape Jobs:**

- **`prometheus`:** Monitoreo propio de Prometheus.
- **`node-exporter`:** Métricas del sistema (CPU, RAM, disco).
- **`redis-exporter`:** Métricas de Redis.
- **`cadvisor`:** Métricas de contenedores Docker.
- **`nginx-exporter`:** Métricas de Nginx.
- **`vault`:** Métricas de HashiCorp Vault.
- **`blackbox-http`:** Pruebas de salud HTTP a los servicios web.
- **`blackbox-tcp`:** Pruebas de conectividad TCP a los servicios de backend.

## 4. **Configuración de Grafana**

Grafana está preconfigurado con un dashboard para visualizar las métricas más importantes del sistema. La configuración se encuentra en `monitoring_system/grafana`.

### **Provisioning:**

- **Datasources:** Grafana se provisiona automáticamente con Prometheus como datasource.
- **Dashboards:** El dashboard principal (`transcendence-overview.json`) se carga automáticamente al iniciar Grafana.

### **Dashboard Principal (`Transcendence Overview`)**

El dashboard principal muestra una visión general del estado del sistema, incluyendo:

- **Estado de los servicios:** Uptime y estado de salud de cada microservicio.
- **Uso de recursos:** CPU, RAM y uso de disco del sistema host.
- **Métricas de contenedores:** Uso de CPU y RAM por cada contenedor.
- **Métricas de Redis:** Conexiones, uso de memoria y comandos por segundo.
- **Métricas de Nginx:** Peticiones por segundo, conexiones activas y errores.

## 5. **Sistema de Alertas**

Las alertas se definen en `monitoring_system/prometheus/alert_rules.yml` y están diseñadas para notificar sobre problemas críticos y de rendimiento.

### **Grupos de Alertas:**

- **`transcendence_critical_alerts`:** Alertas críticas como caídas de servicios.
- **`transcendence_performance_alerts`:** Alertas de rendimiento como alto uso de CPU/RAM.
- **`transcendence_application_alerts`:** Alertas específicas de la aplicación, como problemas en Redis o reinicios frecuentes de contenedores.
- **`transcendence_network_alerts`:** Alertas de red, como alta latencia o errores HTTP.

### **Gestión de Alertas en Alertmanager**

Alertmanager (`http://<IP_MAQUINA>:9093`) permite ver el estado de las alertas, silenciarlas y agruparlas por tipo.

## 6. **Cómo Interpretar las Métricas y Alertas**

- **`up` (métrica):** Si es `1`, el servicio está funcionando. Si es `0`, está caído.
- **`probe_success` (métrica):** Si es `1`, el `health check` de Blackbox fue exitoso. Si es `0`, falló.
- **`ServiceDown` (alerta):** Se dispara cuando la métrica `up` es `0` durante más de 2 minutos.
- **`ServiceProbeDown` (alerta):** Se dispara cuando `probe_success` es `0` durante más de 2 minutos.
- **`HighCPUUsage` / `HighMemoryUsage`:** Indican un alto consumo de recursos en el sistema.
- **`ContainerFrequentRestarts`:** Alerta sobre contenedores que se reinician con demasiada frecuencia, lo que puede indicar un problema subyacente.

## 7. **Resolución de Problemas Comunes**

- **Alertas `ServiceDown` o `ServiceProbeDown`:**
  1. Verifica el estado del contenedor con `docker ps`.
  2. Revisa los logs del contenedor con `docker logs <nombre_contenedor>`.
  3. Asegúrate de que el servicio está escuchando en el puerto correcto.

- **Alertas de `HighCPUUsage` o `HighMemoryUsage`:**
  1. Identifica qué proceso o contenedor está consumiendo más recursos con `docker stats`.
  2. Optimiza el código o aumenta los recursos asignados si es necesario.

- **Alertas de `RedisDown`:**
  1. Verifica los logs de `redis` y `redis-exporter`.
  2. Asegúrate de que la contraseña de Redis es correcta en `.env` y `docker-compose.yml`.
  3. Revisa si hay problemas de permisos en el volumen de datos de Redis.

Esta guía proporciona una base sólida para entender y gestionar el sistema de monitoreo. Para más detalles, consulta la documentación oficial de Prometheus y Grafana.
