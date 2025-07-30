# Puertos y Servicios - Transcendence

## Servicios de Aplicación

| Servicio | Puerto Host | Puerto Interno | Descripción |
|----------|-------------|----------------|-------------|
| `auth-service` | 8001 | 8000 | Servicio de autenticación y perfiles |
| `game-service` | 8002 | 8000 | Servicio de juego (Pong) |
| `chat-service` | 8003 | 8000 | Servicio de chat |
| `db-service` | 8005 | 8000 | API de acceso a base de datos SQLite |
| `api-gateway` | 9000 | 8000 | Pasarela API |
| `frontend` | 9001 | 8080 | Frontend de la aplicación |
| `waf` | 9002 | 8080 | Web Application Firewall |
| `nginx-proxy` | 80, 443 | 80, 443 | Proxy inverso principal |

## Servicios de Infraestructura

| Servicio | Puerto Host | Puerto Interno | Descripción |
|----------|-------------|----------------|-------------|
| `redis` | 6379 | 6379 | Base de datos Redis |
| `redis-commander` | 8081 | 8081 | Interfaz web para Redis |
| `vault` | 8200 | 8200 | HashiCorp Vault |

## Servicios de Monitoreo

| Servicio | Puerto Host | Puerto Interno | Descripción |
|----------|-------------|----------------|-------------|
| `prometheus` | 9090 | 9090 | Motor de métricas y alertas |
| `grafana` | 3000 | 3000 | Visualización de métricas |
| `alertmanager` | 9093 | 9093 | Gestión de alertas |
| `node-exporter` | 9100 | 9100 | Métricas del sistema host |
| `redis-exporter` | 9121 | 9121 | Métricas de Redis |
| `cadvisor` | 8084 | 8080 | Métricas de contenedores |
| `nginx-exporter` | 9113 | 9113 | Métricas de Nginx |

## URLs de Acceso Rápido

### Aplicación Principal
- **Aplicación Web**: http://localhost (puerto 80)
- **Aplicación HTTPS**: https://localhost (puerto 443)
- **API Gateway**: http://localhost:9000
- **Frontend directo**: http://localhost:9001

### Servicios de Monitoreo
- **Grafana**: http://localhost:3000 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093

### Servicios de Infraestructura
- **Redis Commander**: http://localhost:8081
- **Vault**: http://localhost:8200
- **cAdvisor**: http://localhost:8084

### Microservicios (para desarrollo/debug)
- **Auth Service**: http://localhost:8001
- **Game Service**: http://localhost:8002
- **Chat Service**: http://localhost:8003
- **DB Service**: http://localhost:8005

## Comandos Útiles

### Verificar estado de servicios
```bash
sudo docker compose ps
```

### Ver logs de un servicio específico
```bash
sudo docker compose logs -f [servicio]
```

### Reiniciar el sistema completo
```bash
sudo make re
```

### Parar todos los servicios
```bash
sudo make down
```

### Iniciar solo los servicios
```bash
sudo make up
```

## Notas Importantes

1. **Puerto 80/443**: Son los puertos principales de acceso a la aplicación.
2. **Puertos 9xxx**: Reservados para servicios de aplicación y monitoreo.
3. **Puertos 8xxx**: Utilizados para servicios individuales y utilitarios.
4. **Puerto 6379**: Puerto estándar de Redis.
5. **Puerto 3000**: Puerto estándar de Grafana.

## Variables de Entorno Relevantes

Las variables de entorno principales se encuentran en el archivo `.env`:

- `REDIS_HOST=redis`
- `REDIS_PORT=6379`
- `REDIS_PASSWORD=o-meu-contrasinal.42`
- `DATA_PATH=/root/data/transcendence`
- `JWT_SECRET=supersecreto123`

