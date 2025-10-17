## Recomendaciones y Roadmap

### Recomendaciones Finales
- Mantén la documentación actualizada con cada cambio relevante en el sistema.
- Refuerza la seguridad en producción usando certificados válidos y políticas estrictas en Vault.
- Realiza backups automáticos y monitoriza el estado de los servicios de forma continua.
- Fomenta la colaboración y revisión de código entre desarrolladores.
- Automatiza el testing y despliegue en todos los entornos.

### Roadmap y Visión Futura
- Integración de nuevos microservicios para ampliar funcionalidades (ej. analítica avanzada, nuevos modos de juego).
- Mejoras en la experiencia de usuario y accesibilidad en el frontend.
- Escalado horizontal y balanceo de carga para soportar mayor concurrencia.
- Integración con sistemas externos (OAuth, pagos, APIs públicas).
- Refuerzo de la observabilidad y trazabilidad de eventos críticos.
- Migración progresiva a arquitecturas serverless y cloud-native.

---
**Este documento representa la referencia técnica y estratégica del proyecto 42_Transcendence. Para cualquier ampliación, consulta los archivos fuente y la documentación específica de cada servicio.**
## Integración y Flujos CI/CD

### Integración Continua y Despliegue Automático
El proyecto puede integrarse fácilmente con plataformas CI/CD como GitHub Actions, GitLab CI o Jenkins para automatizar pruebas, construcción y despliegue.

**Ejemplo básico de workflow para GitHub Actions:**
```yaml
name: CI/CD Pipeline
on:
	push:
		branches: [ main, limpieza ]
jobs:
	build:
		runs-on: ubuntu-latest
		steps:
			- uses: actions/checkout@v3
			- name: Set up Docker Buildx
				uses: docker/setup-buildx-action@v2
			- name: Build and push Docker images
				run: |
					make prepare
					make build
			- name: Run tests
				run: |
					# Aquí puedes añadir comandos de test para cada microservicio
					echo "Tests ejecutados"
```

**Recomendaciones:**
- Añade tests unitarios y de integración en cada microservicio.
- Automatiza la generación de imágenes y despliegue en entornos de staging/producción.
- Integra notificaciones de alertas y fallos en el pipeline.

---
## Guía Rápida para Nuevos Desarrolladores

### 1. Clona el repositorio
```bash
git clone https://github.com/jverdu-r/42_transcendence.git
cd 42_transcendence
```

### 2. Configura las variables de entorno
Edita el archivo `.env` con tus credenciales y configuración local.

### 3. Prepara el entorno y genera certificados
```bash
make prepare
```

### 4. Construye y despliega todos los servicios
```bash
make all
```

### 5. Accede al sistema
Abre tu navegador en `https://localhost:9443` y acepta el certificado autofirmado.

### 6. Monitoriza y administra
Accede a Grafana, Prometheus y Alertmanager para visualizar métricas y alertas.

### 7. Limpieza y reinicio
```bash
make fclean
make all
```

---
## Preguntas Frecuentes y Troubleshooting

### ¿Por qué no puedo acceder a los servicios por los puertos internos?
Los puertos internos están protegidos y solo accesibles por la red interna de Docker. El acceso externo se realiza siempre a través de Nginx Proxy y HTTPS.

### ¿Cómo reinicio todos los servicios y limpio el entorno?
Utiliza el Makefile:
```bash
make fclean
make all
```
Esto elimina contenedores, volúmenes y datos temporales, y reconstruye todo el sistema.

### ¿Cómo inicializo Vault y obtengo los tokens?
El proceso es automático con:
```bash
make prepare
make up
```
Los tokens y claves se guardan en `vault/generated/` y se distribuyen a los servicios.

### ¿Por qué recibo alertas de CPU alta o servicios caídos?
El sistema de monitorización detecta automáticamente problemas de rendimiento y disponibilidad. Revisa los dashboards de Grafana y las alertas de Prometheus/Alertmanager para diagnóstico.

### ¿Cómo hago backup de la base de datos?
Realiza copias de seguridad periódicas de los volúmenes de datos (`db_data`, `redis_data`, etc.) y guarda los archivos en un lugar seguro.

### ¿Cómo soluciono problemas de certificados HTTPS?
Verifica que los certificados en `vault/certs/` estén actualizados y que Nginx y Vault estén configurados para usarlos. Para producción, usa certificados de una CA confiable.

### ¿Dónde encuentro la documentación técnica de cada servicio?
En este archivo y en los directorios de cada microservicio (`src/`, `README.md`, etc.), así como en la carpeta `documentacion`.

---
## Administración, Monitorización y Mantenimiento

### Redis Commander
Herramienta web para la administración visual de Redis:
- Permite inspeccionar, modificar y eliminar claves y datos en Redis.
- Integrada como servicio en Docker Compose, con acceso restringido por red interna.
- Configuración de credenciales y acceso mediante Vault y archivos de entorno.

### Exportadores de Métricas
Servicios dedicados para exponer métricas de hardware, contenedores y servicios:
- **Node Exporter:** Métricas de CPU, RAM, disco y red del host.
- **cAdvisor:** Métricas de uso y rendimiento de contenedores Docker.
- **Redis Exporter:** Métricas de estado y rendimiento de Redis.
- **Nginx Exporter:** Métricas de tráfico, errores y rendimiento de Nginx.

### Prometheus y Alertmanager
Prometheus recolecta métricas y evalúa reglas de alerta definidas en `alert_rules.yml`:
- Alertas críticas por caída de servicios (`up == 0`), fallos de probes y uso excesivo de CPU.
- Alertmanager gestiona la agrupación, deduplicación y envío de notificaciones por webhook, email u otros canales.
- Configuración flexible de rutas y receptores para alertas de diferentes severidades.

**Ejemplo de alerta crítica:**
```yaml
alert: ServiceDown
expr: up == 0
for: 2m
labels:
	severity: critical
annotations:
	summary: "Service {{ $labels.instance }} is down"
	description: "{{ $labels.job }} service on {{ $labels.instance }} has been down for more than 2 minutes."
```

### Mejores Prácticas de Mantenimiento y Recuperación
- Monitorización continua de todos los servicios y recursos.
- Alertas automáticas para detección proactiva de problemas.
- Backups regulares de bases de datos y configuraciones críticas.
- Uso de herramientas de administración visual y exportadores para diagnóstico rápido.
- Limpieza y reinicio automatizado de servicios y volúmenes mediante Makefile y scripts dedicados.

---
## Seguridad Avanzada y Gestión de Vault

### Vault: Gestión de Secretos y Certificados
Vault se utiliza para la gestión centralizada y segura de secretos, credenciales y certificados TLS:
- Generación automática de certificados autofirmados para desarrollo mediante `vault/scripts/generate-certs.sh`.
- Inicialización y configuración automatizada con `vault/scripts/setup-vault.sh`, que crea el entorno, verifica el estado y extrae las claves y tokens necesarios.
- Políticas de acceso granular para cada servicio, definidas en `vault/policies/*.hcl`.

**Ejemplo de política de acceso (API Gateway):**
```hcl
path "secret/data/redis" {
	capabilities = ["read"]
}
path "secret/data/jwt" {
	capabilities = ["read", "list"]
}
```

**Generación de certificados TLS:**
```bash
openssl genrsa -out vault.key 2048
openssl req -new -key vault.key -out vault.csr -config vault.conf
openssl x509 -req -in vault.csr -signkey vault.key -out vault.crt -days 365 -extensions v3_req -extfile vault.conf
cat vault.crt ca.crt > vault-combined.crt
```

**Inicialización de Vault:**
```bash
vault operator init -key-shares=3 -key-threshold=2 -format=json > /vault/generated/vault-keys.json
```

**Notas de seguridad:**
- Los certificados generados son solo para desarrollo; en producción se recomienda usar una CA confiable.
- Las políticas de Vault permiten acceso mínimo necesario por servicio, siguiendo el principio de menor privilegio.
- Los tokens y claves se almacenan en archivos protegidos y se distribuyen automáticamente a los contenedores.

---
## Automatización y Utilidades

### Makefile
El Makefile centraliza la automatización de tareas clave del proyecto:
- Preparación de directorios y permisos para bases de datos, Vault, Redis, Prometheus, Grafana y Alertmanager.
- Generación de certificados TLS para Vault y configuración de logs y datos.
- Construcción (`build`), despliegue (`up`), parada (`down`, `stop`), reinicio (`re`, `quick-re`) y limpieza (`clean`, `fclean`) de todos los servicios y volúmenes.
- Ejecución de scripts de inicialización y setup de Vault.
- Shell interactivo para acceder a los contenedores.
- Gestión de ngrok para exponer el sistema de forma segura en desarrollo.

**Ejemplo de limpieza avanzada:**
```makefile
fclean: clean
	@echo "Stopping and removing all containers..."
	@$(COMPOSE) down --volumes --rmi all --remove-orphans 2>/dev/null || true
	@echo "Cleaning up any manually created containers..."
	@docker stop WAF nginx-proxy 2>/dev/null || true
	@docker rm WAF nginx-proxy 2>/dev/null || true
	@echo "Cleaning up networks..."
	@docker network inspect transcendence_net > /dev/null 2>&1 && \
		docker network rm transcendence_net || true
	@docker volume prune -f 2>/dev/null || true
	@echo "Cleaning up Vault files and tokens..."
	@rm -f vault/generated/*.token vault/generated/.env.tokens vault/generated/service-tokens.json vault/generated/root.token 2>/dev/null || true
	@rm -rf vault/generated/* vault/generated/.* 2>/dev/null || true
	@echo "Removing data directory..."
	@sudo rm -rf "$(DATA_PATH)"
```

**Gestión de ngrok:**
Permite exponer el sistema localmente a través de HTTPS para pruebas externas, con control de inicio/parada y logs.

---
## Orquestación y Configuración de Servicios

### Docker Compose
El archivo `docker-compose.yml` define y orquesta todos los servicios del sistema:
- Cada microservicio (auth, game, chat, api-gateway, frontend, vault, redis, monitoring) se ejecuta en su propio contenedor.
- Los puertos internos están comentados para evitar exposición directa; el acceso se realiza a través de nginx-proxy.
- Variables de entorno gestionan URLs, credenciales y configuración de Vault/Redis.
- Volúmenes persistentes para bases de datos y tokens de Vault.
- Red interna `transcendence_net` para comunicación segura entre servicios.

**Ejemplo de definición de servicio:**
```yaml
auth-service:
	build: ./auth-service
	image: auth-service
	container_name: auth-service
	environment:
		DB_SERVICE_URL: "http://db-service:8005"
		VAULT_ADDR: "https://vault:8200"
		REDIS_HOST: "${REDIS_HOST}"
		REDIS_PORT: "${REDIS_PORT}"
	depends_on:
		- db-service
		- vault
	volumes:
		- db_data:/app/data
		- ./vault/generated/auth-service.token:/vault/token.txt:ro
	networks:
		- transcendence_net
	restart: on-failure
```

### Configuración de Nginx
El sistema utiliza Nginx como proxy inverso y WAF:
- Redirección automática de HTTP a HTTPS.
- Proxy de WebSocket para juego y chat.
- Integración con el frontend y los microservicios mediante rutas `/api/*`.
- Configuración específica para el frontend en `frontend/nginx.conf`.

**Ejemplo de redirección y proxy WebSocket:**
```nginx
server {
		listen 80;
		server_name localhost;
		return 301 https://$server_name$request_uri;
}

location /pong/ {
		proxy_pass http://game-service:8000/pong/;
		proxy_http_version 1.1;
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection "upgrade";
}
```

### Monitorización y Alertas
El módulo de monitorización (`monitoring_system`) utiliza Prometheus, Grafana y Alertmanager:
- Prometheus recolecta métricas de todos los servicios y exportadores (Node, cAdvisor, Redis, Nginx).
- Grafana visualiza métricas en dashboards personalizables.
- Alertmanager gestiona alertas y notificaciones automáticas.
- Exportadores específicos para hardware, contenedores y servicios críticos.

**Ejemplo de stack:**
| Componente        | Rol                  | Descripción |
|-------------------|----------------------|-------------|
| Prometheus        | Métricas y alertas   | Scrapea y evalúa reglas |
| Grafana           | Visualización        | Dashboards y análisis |
| Alertmanager      | Gestión de alertas   | Agrupa y notifica |
| Node Exporter     | Métricas hardware    | CPU, RAM, disco |
| cAdvisor          | Métricas contenedores| Uso de recursos |
| Redis Exporter    | Métricas Redis       | Estado y rendimiento |
| Nginx Exporter    | Métricas Nginx       | Tráfico y errores |

### Integración Frontend-Backend
El frontend se comunica con el API Gateway y los microservicios mediante rutas `/api/*` y WebSockets:
- Proxy inverso en Nginx para todas las rutas de API y WebSocket.
- Gestión de idioma, notificaciones y navegación en el frontend.
- Seguridad reforzada mediante HTTPS y WAF.

---
## Integración HTTPS y Automatización

### Script: apply_https_changes.sh
Este script automatiza la aplicación de cambios para habilitar HTTPS en todo el sistema. Sus funciones principales son:

- Reconstrucción del frontend y reinicio de servicios críticos (nginx-proxy, frontend).
- Verificación de puertos y redirecciones (80 → 443/9443).
- Ejecución de tests automáticos para comprobar la accesibilidad y seguridad de los puertos.
- Validación de la configuración HTTPS mediante curl y pruebas de redirección.
- Recordatorio sobre certificados autofirmados y pasos para producción segura.

**Ejemplo de test automático en el script:**
```bash
if curl -k -s -o /dev/null -w "%{http_code}" https://localhost:9443 | grep -q "200\|301\|302"; then
	echo -e "✅ Puerto 9443 (HTTPS) responde correctamente"
else
	echo -e "❌ Puerto 9443 (HTTPS) no responde"
fi
```

**Recomendaciones de seguridad:**
- Usar certificados válidos en producción (Let's Encrypt o comerciales).
- Actualizar redirect_uri en Google OAuth.
- Verificar que los puertos internos no sean accesibles desde el exterior.

**Documentación adicional:**
Consultar `documents/HTTPS_IMPLEMENTATION_ANALYSIS.md` para detalles técnicos y análisis de la implementación HTTPS.

---
## Ejemplos y Explicaciones Técnicas Avanzadas

### API Gateway
**Módulo principal:** `src/server.ts`

El API Gateway utiliza Fastify y http-proxy para enrutar peticiones a los microservicios internos. Implementa endpoints para salud, gestión de colas y proxy de recursos (como avatares). Ejemplo de proxy de avatares:

```typescript
fastify.get('/avatars/:filename', async (request, reply) => {
	const { filename } = request.params as { filename: string };
	const res = await fetch(`http://auth-service:8000/avatars/${filename}`);
	if (!res.ok) {
		reply.code(res.status).send();
		return;
	}
	reply.header('Content-Type', res.headers.get('content-type') || 'application/octet-stream');
	let nodeStream;
	if (res.body && typeof (res.body as any).getReader === 'function') {
		nodeStream = Readable.fromWeb(res.body as any);
	} else if (res.body && typeof res.body.pipe === 'function') {
		nodeStream = res.body;
	} else {
		reply.code(500).send('No image stream');
		return;
	}
	return reply.send(nodeStream);
});
```

**Gestión de colas con Redis:**
```typescript
fastify.post('/queue/job', async (request, reply) => {
	const job = request.body;
	await redis.lpush('job-queue', JSON.stringify(job));
	return reply.send({ queued: true });
});
```

### Auth Service
**Módulo principal:** `src/server.ts`

El Auth Service gestiona usuarios, amigos, partidas y avatares. Utiliza JWT para autenticación y bcryptjs para contraseñas. Ejemplo de generación de ranking con estadísticas:

```typescript
export async function generateRankingWithStats(db: any) {
	const userGames = await db.all(`...`);
	// Procesa partidas, calcula victorias, derrotas, puntos, etc.
}
```

**Carga y almacenamiento de avatares:**
```typescript
fastify.register(require('@fastify/static'), {
	root: avatarPath,
	prefix: '/avatars/',
	decorateReply: false
});
```

### Chat Service
**Módulo principal:** `src/server.ts`

El Chat Service implementa WebSocket y persistencia en SQLite. Ejemplo de guardado y consulta de mensajes:

```typescript
function saveMessage(senderId: number, receiverId: number | null, message: string, messageType: string = 'text'): number {
	const stmt = db.prepare(`INSERT INTO chat_messages (sender_id, receiver_id, message, message_type) VALUES (?, ?, ?, ?)`);
	const result = stmt.run(senderId, receiverId, message, messageType);
	return result.lastInsertRowid as number;
}

function getRecentGlobalMessages(limit: number = 50): any[] {
	const stmt = db.prepare(`SELECT ... FROM chat_messages ... LIMIT ?`);
	const rows = stmt.all(limit) as any[];
	return rows.reverse().map(row => ({ ... }));
}
```

### DB Service
**Módulo principal:** `src/server.ts`

El DB Service gestiona usuarios, torneos y partidos. Ejemplo de agrupación de partidos por ronda:

```typescript
const roundOrder = ['1/8(1)', ... , 'Final'];
const groupedRounds: any[][] = [];
const octavos = roundOrder.slice(0,8).map(r => rounds[r]).filter(arr => arr && arr.length > 0).flat();
if (octavos.length > 0) groupedRounds.push(octavos);
// ...
reply.send(groupedRounds);
```

### Game Service
**Módulo principal:** `src/server.ts`

El Game Service gestiona la lógica de juego y la reconexión de jugadores. Ejemplo de verificación de token y gestión de jugadores:

```typescript
const response = await fetch('http://auth-service:3000/api/verify-token', { ... });
if (response.ok) {
	const userData = await response.json();
	userId = userData.user_id.toString();
	username = userData.username;
}
// Gestión de reconexión y estado de juego
```

### Frontend
**Módulo principal:** `src/main.ts`, `src/components/navbar.ts`

El frontend inicializa la app, gestiona el idioma, notificaciones y navegación. Ejemplo de renderizado de la barra de navegación:

```typescript
export function renderNavbar(currentPath: string): void {
	const navbarHtml = `...`; // HTML dinámico según la ruta y el idioma
}
```

---
Esta sección puede ampliarse con ejemplos de otros módulos, detalles de configuración y flujos internos según se requiera.
# Documentación Técnica Avanzada - 42_Transcendence

## Índice
1. Introducción
2. Arquitectura General y Diagrama
3. Servicios y Componentes
	- API Gateway
	- Auth Service
	- Chat Service
	- Game Service
	- DB Service
	- Frontend
	- Otros componentes
4. Flujo de Datos y Comunicación
5. Seguridad y Buenas Prácticas
6. Despliegue y Configuración
7. Monitorización y Mantenimiento
8. Ejemplos de Uso de las APIs
9. Consideraciones Finales

---

## 1. Introducción

42_Transcendence es una plataforma web modular y escalable, orientada a la experiencia de juego online, chat en tiempo real, gestión de usuarios y monitorización avanzada. El proyecto sigue una arquitectura de microservicios, permitiendo alta disponibilidad, mantenibilidad y facilidad de despliegue.

## 2. Arquitectura General y Diagrama

El sistema está compuesto por servicios independientes que se comunican mediante APIs REST y WebSockets. Cada servicio está contenido en su propio Docker, facilitando la orquestación y el despliegue.

```
Usuario <-> Frontend <-> API Gateway <-> [Auth Service | Chat Service | Game Service | DB Service | Tournament Service]
												  |
												  +-> Monitoring System
												  |
												  +-> Nginx WAF
												  |
												  +-> Redis Commander
												  |
												  +-> Vault
												  |
												  +-> SSL
```

## 3. Servicios y Componentes

### API Gateway
Centraliza el acceso, gestiona el enrutamiento, la autenticación y el balanceo de carga. Implementado con Fastify y http-proxy, permite la integración de todos los servicios internos. Expone endpoints para torneos, usuarios, partidas y chat, y gestiona la recarga de variables de entorno mediante señales SIGHUP.

**Detalles técnicos:**
- Proxy global para `/api/tournaments` hacia `db-service`.
- Proxy configurable para `/api/auth`, `/api/game`, `/api/chat`.
- Gestión de avatares vía proxy a `auth-service`.
- Conexión a Redis para gestión de sesiones y caché.
- Recarga de variables de entorno en caliente.

**Ejemplo de endpoint:**
```http
GET /api/tournaments -> Proxy a db-service
GET /avatars/:filename -> Proxy a auth-service
```

### Auth Service
Gestiona el registro, login, recuperación de contraseñas y autorización. Utiliza JWT y OAuth2, soporta autenticación multifactor (2FA) y recuperación de credenciales por email. Implementa seguridad avanzada con bcryptjs y nodemailer.

**Detalles técnicos:**
- Implementado con Fastify.
- Gestión de usuarios, amigos, partidas y avatares.
- Uso de JWT para autenticación y autorización.
- Integración con SQLite y Redis.
- Rutas para gestión de amigos y partidas.
- Carga y almacenamiento de avatares.
- Recarga de variables de entorno en caliente.

**Ejemplo de endpoint:**
```http
POST /api/auth/login
POST /api/auth/register
GET /avatars/:filename
```

### Chat Service
Permite comunicación en tiempo real mediante WebSockets. Soporta canales públicos, privados, mensajes directos, sistema de bloqueo, invitaciones a juegos y notificaciones de torneos. Utiliza SQLite para persistencia y Redis para gestión de usuarios online.

**Detalles técnicos:**
- Implementado con Fastify y @fastify/websocket.
- Base de datos SQLite para mensajes, bloqueos e invitaciones.
- Gestión de conexiones activas y usuarios online en memoria.
- Endpoints WebSocket para mensajería y eventos en tiempo real.

**Ejemplo de endpoint:**
```ws
ws://chat-service:8000/ws
```

### Game Service
Gestiona la lógica de juego, emparejamiento, control de estado y notificaciones. Optimizado para baja latencia y alta concurrencia. Permite reconexión de jugadores y gestión de espectadores.

**Detalles técnicos:**
- Implementado con Fastify y @fastify/websocket.
- Gestión de partidas en memoria y persistencia en Redis.
- Endpoints WebSocket para juego y lobby.
- Integración con DB Service y Auth Service para validación y persistencia.

**Ejemplo de endpoint:**
```ws
ws://game-service:8000/ws
GET /pong/:gameId (WebSocket)
```

### DB Service
Encargado de la persistencia de datos, utiliza SQLite y Redis. Expone APIs para usuarios, torneos y participantes. Gestiona la inicialización y migración de la base de datos.

**Detalles técnicos:**
- Implementado con Fastify.
- Inicialización y migración automática de la base de datos.
- Endpoints para usuarios, torneos, participantes y partidos.
- Integración con Redis para cola de escritura y caché.

**Ejemplo de endpoint:**
```http
GET /users
POST /users
GET /tournaments/:id/participants
GET /tournaments/:id/matches
```

### Frontend
Desarrollado con TypeScript, Tailwind y Webpack. Gestiona la navegación, internacionalización, notificaciones y comunicación con el API Gateway.

**Detalles técnicos:**
- Inicialización de la app y gestión de idioma.
- Notificaciones globales y eventos de usuario.
- Comunicación con API Gateway para todas las operaciones.

### Otros componentes
- **Monitoring System:** Prometheus, Grafana y Alertmanager para métricas y alertas.
- **Nginx WAF:** Protección contra ataques y gestión de tráfico HTTP/HTTPS.
- **Redis Commander:** Administración y visualización de datos en Redis.
- **SSL:** Gestión de certificados y cifrado de comunicaciones.
- **Vault:** Gestión segura de secretos y credenciales.
- **Tournament Service:** Gestión de torneos y competiciones.

## 4. Flujo de Datos y Comunicación

Las peticiones de los usuarios llegan al Frontend, que se comunica con el API Gateway. Este distribuye las peticiones a los servicios correspondientes. La comunicación entre servicios se realiza mediante HTTP/HTTPS y WebSockets, asegurando la integridad y confidencialidad de los datos.

## 5. Seguridad y Buenas Prácticas

- Uso de JWT y OAuth2 para autenticación.
- Cifrado de datos en tránsito mediante SSL/TLS.
- Gestión de secretos con Vault.
- Protección contra ataques con Nginx WAF.
- Uso de bcryptjs para almacenamiento seguro de contraseñas.
- Pruebas automatizadas y monitorización continua.

## 6. Despliegue y Configuración

El despliegue se realiza mediante Docker y Docker Compose, permitiendo la orquestación de todos los servicios. La configuración se gestiona mediante archivos `.env` y Vault para credenciales sensibles. Cada servicio incluye su propio Dockerfile y scripts de arranque.

## 7. Monitorización y Mantenimiento

Prometheus recolecta métricas de todos los servicios, Grafana permite la visualización y Alertmanager gestiona las alertas. El sistema está preparado para escalar horizontalmente y soportar alta disponibilidad.

## 8. Ejemplos de Uso de las APIs

### Autenticación
```http
POST /api/auth/login
Body: { "username": "user", "password": "pass" }
```

### Chat
```ws
ws://chat-service:8000/ws
```

### Juego
```ws
ws://game-service:8000/ws
```

### Usuarios
```http
GET /users
POST /users
```

### Torneos
```http
GET /api/tournaments
GET /tournaments/:id/participants
GET /tournaments/:id/matches
```

## 9. Consideraciones Finales

El proyecto 42_Transcendence está diseñado para ser robusto, seguro y escalable. La organización y limpieza del repositorio garantizan una entrega profesional y lista para producción. Toda la infraestructura y servicios están documentados y preparados para facilitar el mantenimiento y la evolución futura.

---

Para cualquier duda o ampliación, consultar la documentación técnica específica de cada servicio y los archivos fuente incluidos en el repositorio.

# Documentación Profesional y Técnica - 42_Transcendence

## Índice
1. Introducción
2. Arquitectura General
3. Diagrama de Arquitectura
4. Servicios Principales
	- API Gateway
	- Auth Service
	- Chat Service
	- Game Service
	- DB Service
	- Frontend
	- Monitoring System
	- Nginx WAF
	- Redis Commander
	- SSL
	- Vault
	- Tournament Service
5. Flujo de Datos y Comunicación
6. Seguridad y Buenas Prácticas
7. Despliegue y Configuración
8. Monitorización y Mantenimiento
9. Ejemplos de Uso de las APIs
10. Consideraciones Finales

---

## 1. Introducción

42_Transcendence es una plataforma web modular y escalable, orientada a la experiencia de juego online, chat en tiempo real, gestión de usuarios y monitorización avanzada. El proyecto sigue una arquitectura de microservicios, permitiendo alta disponibilidad, mantenibilidad y facilidad de despliegue.

## 2. Arquitectura General

El sistema está compuesto por servicios independientes que se comunican mediante APIs REST y WebSockets. Cada servicio está contenido en su propio Docker, facilitando la orquestación y el despliegue.

## 3. Diagrama de Arquitectura (Explicativo)

```
Usuario <-> Frontend <-> API Gateway <-> [Auth Service | Chat Service | Game Service | DB Service | Tournament Service]
												  |
												  +-> Monitoring System
												  |
												  +-> Nginx WAF
												  |
												  +-> Redis Commander
												  |
												  +-> Vault
												  |
												  +-> SSL
```
Cada servicio puede comunicarse con la base de datos y otros servicios según sea necesario. El API Gateway centraliza la entrada y salida de datos, gestionando la seguridad y el enrutamiento.

## 4. Servicios Principales

### API Gateway
Centraliza el acceso, gestiona el enrutamiento, la autenticación y el balanceo de carga. Implementado con Fastify y http-proxy, permite la integración de todos los servicios internos. Expone endpoints para torneos, usuarios, partidas y chat, y gestiona la recarga de variables de entorno mediante señales SIGHUP.

**Ejemplo de endpoint:**
```http
GET /api/tournaments -> Proxy a db-service
```

### Auth Service
Gestiona el registro, login, recuperación de contraseñas y autorización. Utiliza JWT y OAuth2, soporta autenticación multifactor (2FA) y recuperación de credenciales por email. Implementa seguridad avanzada con bcryptjs y nodemailer.

**Ejemplo de endpoint:**
```http
POST /api/auth/login
POST /api/auth/register
```

### Chat Service
Permite comunicación en tiempo real mediante WebSockets. Soporta canales públicos, privados, mensajes directos, sistema de bloqueo, invitaciones a juegos y notificaciones de torneos. Utiliza SQLite para persistencia y Redis para gestión de usuarios online.

**Ejemplo de endpoint:**
```ws
ws://chat-service:8000/ws
```

### Game Service
Gestiona la lógica de juego, emparejamiento, control de estado y notificaciones. Optimizado para baja latencia y alta concurrencia. Permite reconexión de jugadores y gestión de espectadores.

**Ejemplo de endpoint:**
```ws
ws://game-service:8000/ws
```

### DB Service
Encargado de la persistencia de datos, utiliza SQLite y Redis. Expone APIs para usuarios, torneos y participantes. Gestiona la inicialización y migración de la base de datos.

**Ejemplo de endpoint:**
```http
GET /users
GET /tournaments/:id/participants
```

### Frontend
Desarrollado con tecnologías modernas (TypeScript, Tailwind, Webpack), ofrece una experiencia de usuario intuitiva y rápida. Gestiona la navegación, internacionalización, notificaciones y comunicación con el API Gateway.

### Monitoring System
Incluye Prometheus, Grafana y Alertmanager para monitorizar el estado de los servicios, métricas de rendimiento y alertas automáticas. Permite la visualización y análisis en tiempo real.

### Nginx WAF
Firewall de aplicaciones web que protege contra ataques comunes (DDoS, XSS, CSRF) y gestiona el tráfico HTTP/HTTPS.

### Redis Commander
Herramienta web para la administración y visualización de datos en Redis.

### SSL
Gestión de certificados y cifrado de comunicaciones para garantizar la privacidad y seguridad.

### Vault
Almacena y gestiona secretos, credenciales y claves de cifrado de forma segura. Integrado con los servicios mediante Vault Agent y plantillas de entorno.

### Tournament Service
Gestiona la creación, administración y seguimiento de torneos y competiciones dentro de la plataforma.

## 5. Flujo de Datos y Comunicación

Las peticiones de los usuarios llegan al Frontend, que se comunica con el API Gateway. Este distribuye las peticiones a los servicios correspondientes. La comunicación entre servicios se realiza mediante HTTP/HTTPS y WebSockets, asegurando la integridad y confidencialidad de los datos.

## 6. Seguridad y Buenas Prácticas

- Uso de JWT y OAuth2 para autenticación.
- Cifrado de datos en tránsito mediante SSL/TLS.
- Gestión de secretos con Vault.
- Protección contra ataques con Nginx WAF.
- Uso de bcryptjs para almacenamiento seguro de contraseñas.
- Pruebas automatizadas y monitorización continua.

## 7. Despliegue y Configuración

El despliegue se realiza mediante Docker y Docker Compose, permitiendo la orquestación de todos los servicios. La configuración se gestiona mediante archivos `.env` y Vault para credenciales sensibles. Cada servicio incluye su propio Dockerfile y scripts de arranque.

## 8. Monitorización y Mantenimiento

Prometheus recolecta métricas de todos los servicios, Grafana permite la visualización y Alertmanager gestiona las alertas. El sistema está preparado para escalar horizontalmente y soportar alta disponibilidad.

## 9. Ejemplos de Uso de las APIs

### Autenticación
```http
POST /api/auth/login
Body: { "username": "user", "password": "pass" }
```

### Chat
```ws
ws://chat-service:8000/ws
```

### Juego
```ws
ws://game-service:8000/ws
```

### Usuarios
```http
GET /users
```

### Torneos
```http
GET /api/tournaments
```

## 10. Consideraciones Finales

El proyecto 42_Transcendence está diseñado para ser robusto, seguro y escalable. La organización y limpieza del repositorio garantizan una entrega profesional y lista para producción. Toda la infraestructura y servicios están documentados y preparados para facilitar el mantenimiento y la evolución futura.

---

Para cualquier duda o ampliación, consultar la documentación técnica específica de cada servicio y los archivos fuente incluidos en el repositorio.
