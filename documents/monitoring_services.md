# Documentación del Sistema de Monitoreo de Transcendence

## 1. Introducción

Este documento describe la arquitectura, configuración y uso del sistema de monitoreo implementado para el proyecto Transcendence. El sistema está diseñado para proporcionar una visibilidad completa del estado y rendimiento de todos los microservicios, así como de la infraestructura subyacente.

El sistema de monitoreo se basa en una pila de tecnologías estándar de la industria, incluyendo:

*   **Prometheus**: Para la recolección y almacenamiento de métricas en series de tiempo.
*   **Grafana**: Para la visualización de métricas a través de paneles de control interactivos.
*   **Alertmanager**: Para la gestión y enrutamiento de alertas.
*   **Exporters**: Una variedad de exportadores para exponer métricas de diferentes servicios (Redis, Nginx, etc.).
*   **cAdvisor**: Para el monitoreo de contenedores Docker.

## 2. Arquitectura de Monitoreo

La arquitectura de monitoreo se integra directamente en el entorno de microservicios de Transcendence a través de `docker-compose`. Cada componente de monitoreo se ejecuta como un contenedor Docker, lo que garantiza un despliegue y gestión consistentes.

### 2.1. Componentes Principales

*   **Prometheus (`prometheus`)**: Es el corazón del sistema de monitoreo. Se encarga de recolectar (`scrape`) métricas de varios `targets` (servicios y exporters) a intervalos regulares. Almacena estas métricas y permite consultas utilizando su propio lenguaje de consulta, PromQL. También evalúa reglas de alerta y las envía a Alertmanager.

*   **Grafana (`grafana`)**: Es la plataforma de visualización. Se conecta a Prometheus como fuente de datos (`datasource`) y permite crear paneles de control (`dashboards`) para visualizar las métricas de forma gráfica e intuitiva. Hemos configurado un panel de control por defecto llamado `Transcendence Full Overview` que proporciona una visión general del sistema.

*   **Alertmanager (`alertmanager`)**: Gestiona las alertas enviadas por Prometheus. Se encarga de deduplicar, agrupar y enrutar las alertas a diferentes `receivers` (como webhooks, correo electrónico, etc.). También permite silenciar alertas y definir reglas de inhibición.

*   **Node Exporter (`node-exporter`)**: Expone métricas a nivel de sistema operativo del host, como el uso de CPU, memoria, disco y red.

*   **Redis Exporter (`redis-exporter`)**: Expone métricas específicas de Redis, como el uso de memoria, número de clientes conectados, etc.

*   **cAdvisor (`cadvisor`)**: Proporciona métricas detalladas sobre el rendimiento y uso de recursos de los contenedores Docker.

*   **Nginx Exporter (`nginx-exporter`)**: Expone métricas de Nginx, que se utiliza como proxy inverso y WAF en nuestro proyecto.

### 2.2. Flujo de Métricas y Alertas

1.  Los **Exporters** (Node, Redis, Nginx, cAdvisor) se ejecutan junto a los servicios que monitorean y exponen métricas en un formato que Prometheus puede entender.
2.  **Prometheus** está configurado para `scrapear` (recolectar) periódicamente las métricas de estos exporters y de los propios servicios que exponen un endpoint de métricas (por ejemplo, a través de un endpoint `/metrics`).
3.  **Grafana** consulta a Prometheus para visualizar las métricas en los paneles de control.
4.  **Prometheus** evalúa continuamente las **reglas de alerta** definidas. Si una condición de alerta se cumple, Prometheus envía la alerta a **Alertmanager**.
5.  **Alertmanager** procesa la alerta y la envía al `receiver` configurado (en nuestro caso, un webhook de ejemplo).

## 3. Configuración del Sistema

La configuración del sistema de monitoreo se encuentra en el directorio `monitoring_system` y se integra en el `docker-compose.yml` principal del proyecto.

### 3.1. `docker-compose.yml`

Hemos añadido los siguientes servicios al `docker-compose.yml`:

*   `prometheus`
*   `grafana`
*   `alertmanager`
*   `node-exporter`
*   `redis-exporter`
*   `cadvisor`
*   `nginx-exporter`

Cada servicio está configurado con sus respectivos volúmenes para la persistencia de datos y archivos de configuración, así como las redes necesarias para la comunicación entre servicios.

### 3.2. `prometheus/prometheus.yml`

Este archivo define la configuración de Prometheus. Incluye:

*   `scrape_configs`: Define los `jobs` y `targets` que Prometheus debe monitorear. Hemos configurado un `job` para cada servicio de Transcendence y cada componente de monitoreo.
*   `rule_files`: Especifica la ubicación de los archivos de reglas de alerta (`alert_rules.yml`).
*   `alerting`: Configura la conexión con Alertmanager.

### 3.3. `prometheus/alert_rules.yml`

Contiene las reglas de alerta que Prometheus evalúa. Hemos definido alertas para:

*   **Disponibilidad del servicio**: Se dispara si un servicio está caído.
*   **Uso de recursos**: Alertas para alto uso de CPU, memoria y disco.
*   **Métricas de Redis**: Alertas para Redis caído o con alto uso de memoria.
*   **Métricas de contenedores**: Alertas para contenedores con alto uso de CPU o memoria.

### 3.4. `grafana/`

Este directorio contiene la configuración de Grafana:

*   `provisioning/datasources/prometheus.yml`: Configura Prometheus como la fuente de datos por defecto para Grafana.
*   `provisioning/dashboards/dashboard.yml`: Indica a Grafana que cargue los paneles de control desde el directorio `dashboards`.
*   `dashboards/transcendence-overview.json`: El panel de control principal que hemos creado, con una visualización completa de los servicios.

## 4. Cómo Utilizar el Sistema de Monitoreo

Una vez que la pila de Transcendence está en funcionamiento con `sudo make re`, puedes acceder a las interfaces web de los componentes de monitoreo desde tu navegador.

### 4.1. Acceso a Grafana

*   **URL**: `http://localhost:3000`
*   **Usuario**: `admin`
*   **Contraseña**: `admin123`

Al iniciar sesión, serás dirigido al panel de control `Transcendence Full Overview`, donde podrás ver el estado y rendimiento de todos los servicios.

### 4.2. Acceso a Prometheus

*   **URL**: `http://localhost:9090`

Desde la interfaz de Prometheus, puedes:

*   **Explorar métricas**: Utiliza el explorador de PromQL para consultar cualquier métrica que Prometheus esté recolectando.
*   **Ver targets**: En la sección `Status > Targets`, puedes ver el estado de todos los `jobs` y `targets` de monitoreo.
*   **Ver alertas**: En la sección `Alerts`, puedes ver el estado de las reglas de alerta.

### 4.3. Acceso a Alertmanager

*   **URL**: `http://localhost:9093`

En la interfaz de Alertmanager, puedes ver las alertas que se han disparado y su estado (activas, silenciadas, etc.).

## 5. Mantenimiento y Escalado

El sistema de monitoreo está diseñado para ser fácilmente extensible. Para monitorear un nuevo servicio, solo necesitas:

1.  **Exponer las métricas** en el nuevo servicio (si es necesario, a través de un exporter).
2.  Añadir un nuevo `job` a la sección `scrape_configs` de `prometheus/prometheus.yml`.
3.  Añadir paneles relevantes al dashboard de Grafana.

Para escalar el sistema, puedes considerar aumentar los recursos asignados a los contenedores de monitoreo en el `docker-compose.yml` o configurar una arquitectura de alta disponibilidad para Prometheus y Alertmanager (lo cual está fuera del alcance de esta configuración inicial).

---
*Documentación generada automáticamente por Agent Mode. Última actualización: 2025-07-30.*
