# Proyecto Transcendence – Documentación y Uso

## Resumen General
Este proyecto implementa una arquitectura de microservicios (backend y frontend) con orquestación vía Docker Compose. Provee funcionalidades de autenticación, chat, juego (Pong), base de datos (SQLite), externlizazión de secretos vía HashiCorp Vault, pasarela API (api-gateway), frontend web y protección por WAF (Nginx-ModSecurity).

---

## Estructura General del Proyecto

```
docker-compose.yml
api-gateway/        # Pasarela API (Fastify, proxies, Redis)
auth-service/       # Autenticación y perfiles
chat-service/       # Sistema de chat en tiempo real
game-service/       # Lógica del juego Pong
db-service/         # API de base de datos (SQLite)
frontend/           # Interfaz de usuario Web
vault/              # HashiCorp Vault (solo en contenedor, sin código fuente propio)
waf/                # Firewall de Aplicaciones Web (Nginx ModSecurity)
```

---

## Servicios Docker – Explicación

- **auth-service**: Proporciona endpoints de autenticación y gestión de usuario. Conecta con la base de datos y consume secretos desde Vault.
- **game-service**: Encapsula la lógica principal del juego Pong y responde a eventos del frontend y otros microservicios.
- **chat-service**: Permite mensajería en tiempo real entre usuarios, integrado con los sistemas de usuario.
- **db-service**: Administra la persistencia vía SQLite, expone una API REST para acceso sencillo desde otros servicios.
- **api-gateway**: Gateway centralizado basado en Fastify. Redirige tráfico a cada microservicio usando proxies HTTP, implementa colas en Redis y puntos de extensión organizados
- **frontend**: Aplicación web SPA, consume del api-gateway y muestra toda la interfaz visual del sistema.
- **vault**: Almacena secretos/certificados de manera segura. Es simulado en modo desarrollo y accesible para pruebas.
- **waf**: Protege el tráfico HTTP de ataques comunes usando OWASP CRS sobre Nginx y ModSecurity.

---

## Uso Local y Testing

1. **Requisitos**: Docker, Docker Compose instalados en tu sistema.

2. **Arranque local:**
   ```bash
   docker-compose up --build
   ```
   Esto iniciará todos los servicios. El api-gateway escucha en http://localhost:9000 y el frontend en http://localhost:9001.

3. **Probar endpoints:**
     - Health:   `curl http://localhost:9000/health`
     - Usuario:  `curl http://localhost:9000/auth`
     - Juego:    `curl http://localhost:9000/game`
     - Chat:     `curl http://localhost:9000/chat`
     - Cola:     `curl -X POST http://localhost:9000/queue/job -H "Content-Type: application/json" -d '{"test":123}'`

4. **HashiCorp Vault:**
     - Solo para pruebas; todos los servicios leen secretos desde la dirección `VAULT_ADDR`.
     - Se levanta en modo "developer" para acceso simple y sin persistencia.

5. **WAF:**
    - El tráfico externo puede pasar por el puerto del WAF (`9002`) para pruebas de seguridad.

---

## Documentación Resumida de Endpoints API Gateway

- **GET /health**        — Verifica que Redis y el gateway mismo están operativos.
- **POST /queue/job**    — Inserta un trabajo en la cola Redis (usado para tareas asíncronas u operaciones DB/SQLite).
- **Todos los demás prefijos** (ej: /auth, /game, /chat) — Se redirigen vía proxy HTTP transparente al respectivo microservicio.

---

## Notas y Consejos

- El uso de HashiCorp Vault es solo con propósito académico; para producción se requiere configuración segura y persistente.
- Usa las variables de entorno del docker-compose para enlazar y parametrizar cada servicio.
- El frontend actualmente es "mock"/visual para pruebas UI; en integración total, establecer comunicación real vía api-gateway.

---

## Para desarrollo:
- Puedes modificar cualquier microservicio y reiniciar solo el contenedor correspondiente usando Docker Compose.
- Los datos de la base SQLite persisten en el volumen de Docker.
- Soporte de hot reload / dev server puede implementarse para el frontend y el api-gateway con los comandos npm típicos.

---

> Documentación generada automáticamente — revisa el código fuente para detalles y puntos de extensión.

