# Monitoring System Module

## 1. Overview

This module implements a comprehensive monitoring and alerting system for the `ft_transcendence` project using industry-standard tools: **Prometheus**, **Grafana**, and **Alertmanager**.

The primary goals are:
- **Real-time Visibility**: Collect and visualize key metrics from all microservices and infrastructure components.
- **Proactive Alerting**: Detect and notify developers of critical issues, anomalies, or performance degradation.
- **Robust Infrastructure**: Ensure data persistence, security, and scalability of the monitoring stack.

### Technology Stack

| Component | Role | Description |
|---|---|---|
| **Prometheus** | Metrics Collection & Alerting | Scrapes metrics from various exporters and services. Evaluates alerting rules and fires alerts to Alertmanager. |
| **Grafana** | Visualization | Queries Prometheus to display metrics on customizable dashboards for easy analysis. |
| **Alertmanager** | Alert Handling | Manages alerts fired by Prometheus, including deduplication, grouping, and routing to various notification channels. |
| **Node Exporter** | System Metrics | Exposes a wide range of hardware and OS metrics from the host system. |
| **cAdvisor** | Container Metrics | Provides resource usage and performance characteristics of running containers. |
| **Redis Exporter** | Redis Metrics | Exposes detailed metrics from the Redis instance. |
| **Nginx Exporter** | Nginx Metrics | Gathers metrics from the Nginx proxy and WAF. |

---

## 2. Getting Started

### Prerequisites

- Docker and Docker Compose are installed.
- The project's `.env` file is configured.

### Launching the System

### Network Access Configuration

To make the monitoring system accessible from other devices on your network (not just localhost), you need to configure the machine IP address:

1.  **Automatic IP Detection**:
    ```bash
    make set-ip
    ```
    This command automatically detects your machine's IP address and updates the `.env` file.

2.  **Manual IP Configuration**:
    Alternatively, you can manually edit the `.env` file and set the `MACHINE_IP` variable to your machine's actual IP address:
    ```bash
    MACHINE_IP=192.168.1.100  # Replace with your actual IP
    ```

3.  **Complete Setup with Auto-IP**:
    ```bash
    make all-auto
    ```
    This command automatically detects the IP, prepares directories, builds, and starts all services.

**Note**: When your machine's IP changes (e.g., after connecting to a different network), simply run `make set-ip` again to update the configuration.

The monitoring stack is managed via the main `docker-compose.yml` and the project `Makefile`.

1.  **Prepare Directories & Permissions**:
    ```bash
    make prepare
    ```
    This command creates the necessary data directories for Prometheus, Grafana, and Alertmanager to persist data.

2.  **Build and Start Services**:
    ```bash
    make all-auto
    ```
    This will build all project containers, including the monitoring services, and start them in detached mode.

### Accessing Dashboards

Once the services are running, you can access the following web interfaces:

**Local Access (localhost)**:

**Network Access (from other devices)**:
Replace `YOUR_MACHINE_IP` with your actual machine IP address (check your `.env` file or run `make set-ip`):
- **Grafana**: `http://YOUR_MACHINE_IP:3000`
- **Prometheus**: `http://YOUR_MACHINE_IP:9090`
- **Alertmanager**: `http://YOUR_MACHINE_IP:9093`

**Credentials for Grafana**:

  - View current alert states and configured silences.

---

## 3. Configuration & Customization

All monitoring configuration files are located in the `monitoring_system/` directory.

### Prometheus (`prometheus/`)

- **`prometheus.yml`**: The main configuration file. It defines scrape targets, intervals, and the Alertmanager endpoint. To add a new service to monitor, add a new `job_name` under `scrape_configs`.
- **`alert_rules.yml`**: Contains all alerting rules. You can define new alerts here based on any metric available in Prometheus.

### Grafana (`grafana/`)

- **`provisioning/`**: This directory handles the auto-provisioning of Grafana.
  - **`datasources/prometheus.yml`**: Automatically adds Prometheus as the default data source.
  - **`dashboards/`**: Defines the dashboard providers. Any JSON dashboard model placed in the `grafana/dashboards` directory will be automatically loaded into Grafana.
- **`dashboards/transcendence-overview.json`**: The main dashboard file. To customize the dashboard, you can either edit this file directly (and reload Grafana) or make changes in the Grafana UI and export the JSON model to overwrite this file.

### Alertmanager (`alertmanager/`)

- **`alertmanager.yml`**: Configures how alerts are grouped, inhibited, and routed.
  - The default configuration uses a `webhook_configs` receiver pointing to `http://127.0.0.1:5001/`. This is a placeholder and should be replaced with a real notification endpoint (e.g., Slack, PagerDuty, etc.).

#### Example: Configuring Slack Alerts

To send alerts to a Slack channel, modify `alertmanager.yml`:

```yaml
receivers:
  - name: 'slack-notifications'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL' # Replace with your actual Slack webhook URL
        channel: '#transcendence-alerts'
        send_resolved: true
        title: '[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .GroupLabels.alertname }}'
        text: >-
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }} - `{{ .Labels.severity }}`
          *Description:* {{ .Annotations.description }}
          *Details:*
          {{ range .Labels.SortedPairs }} • *{{ .Name }}:* `{{ .Value }}`
          {{ end }}
          {{ end }}
```
*Remember to update the `route` to use `'slack-notifications'` as the receiver.*

---

## 4. Security Enhancements

For a production-like environment, consider the following improvements:

1.  **Secure Grafana Credentials**: Avoid hardcoding the admin password in `docker-compose.yml`. Use environment variables sourced from the `.env` file.
    ```yaml
    # In docker-compose.yml
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_USER}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    ```
    ```bash
    # In .env
    GRAFANA_USER=admin
    GRAFANA_PASSWORD=your_secure_password_here
    ```

2.  **Network Policies**: Restrict direct access to Prometheus and Alertmanager from outside the Docker network. Only expose Grafana and the main application proxy.

3.  **HTTPS for Grafana**: Configure Grafana to run over HTTPS, especially if it's exposed to the internet. This can be done via its configuration or by placing it behind a reverse proxy that handles TLS termination.

---

## 5. Troubleshooting

- **Service Not Up**: Use `docker compose logs <service_name>` to check for errors (e.g., `docker compose logs prometheus`).
- **Metrics Not Appearing**: In the Prometheus UI (`Targets` page), check if the scrape target for your service is `UP`. If it's `DOWN`, verify the service name, port, and network connectivity within Docker.
- **Alerts Not Firing**: In the Prometheus UI (`Alerts` page), check the state of your alerts. If an alert is not firing when expected, verify the expression in the `Rules` page and ensure the underlying metrics exist.

## 6. Advanced Monitoring Features

### Blackbox Exporter

The monitoring system now includes a **Blackbox Exporter** for comprehensive HTTP, TCP, and ICMP monitoring:

- **URL**: [http://localhost:9115](http://localhost:9115) or `http://YOUR_MACHINE_IP:9115`
- **Purpose**: Monitors services without built-in metrics endpoints
- **Configuration**: `/monitoring_system/blackbox-exporter/blackbox.yml`

The Blackbox Exporter allows monitoring of:
- HTTP endpoints (2xx responses)
- HTTP services that may return 404 but are still operational
- TCP connectivity
- ICMP (ping) tests

### External Network Access

Your monitoring system is now configured to be accessible from other devices on your network:

**Quick Setup for Network Access:**
```bash
# Automatically detect and set your machine's IP
make set-ip

# Start everything with auto-detected IP
make all-auto

# Or manually restart to apply IP changes
make re
```

**Current Network Endpoints (replace with your actual IP):**
- **Main Application**: `http://YOUR_MACHINE_IP:80`
- **Grafana Dashboard**: `http://YOUR_MACHINE_IP:3000`
- **Prometheus Metrics**: `http://YOUR_MACHINE_IP:9090`
- **Alertmanager**: `http://YOUR_MACHINE_IP:9093`
- **Blackbox Exporter**: `http://YOUR_MACHINE_IP:9115`

### Service Status Overview

The monitoring system now tracks all services using professional methods:

1. **Native Metrics Exporters**: node-exporter, redis-exporter, cadvisor, nginx-exporter
2. **Service Health Endpoints**: game-service, api-gateway (native /health endpoints)
3. **HTTP Monitoring**: All other services via Blackbox Exporter
4. **Infrastructure Monitoring**: Vault, containers, system resources

All services should now show as "UP" in Prometheus/Grafana dashboards.


## 7. ✨ Aesthetically Pleasing & Professional Dashboard ✨

To provide the most intuitive and beautiful monitoring experience, we have crafted an executive-level dashboard with a focus on aesthetics and usability:

### Key Features:
- **🎨 Beautifully Themed Design**: A modern, dark-themed dashboard with clear, organized sections.
- **🚀 Interactive Filtering**: Dynamically filter by job or container to quickly isolate and analyze issues.
- **📊 Rich Visualizations**: A mix of gauges, time-series graphs, and stat panels for at-a-glance insights.
- **📈 Key Performance Indicators (KPIs)**: A dedicated section for high-level system KPIs.
- **❤️ Service Health at a Glance**: Color-coded tables show the status of every service instantly.
- **💻 Detailed Infrastructure & Container Metrics**: In-depth analysis of system and container performance.

### How to Access:
1. Open Grafana: [http://YOUR_MACHINE_IP:3000](http://YOUR_MACHINE_IP:3000)
2. In the left-hand menu, go to **Dashboards**.
3. Open the **Transcendence** folder.
4. Select the **Transcendence Command Center**.

This new dashboard meets all the project requirements while providing a user-friendly and aesthetically pleasing interface for system monitoring.
