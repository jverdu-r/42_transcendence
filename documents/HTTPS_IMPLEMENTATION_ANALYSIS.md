# Análisis e Implementación Completa de HTTPS en 42 Transcendence

## 📋 Resumen Ejecutivo

Este documento detalla el estado actual de HTTPS en el proyecto y los cambios necesarios para que **TODO** funcione exclusivamente por HTTPS a través del puerto **9443**.

---

## ✅ Estado Actual - Lo que YA funciona por HTTPS

### 1. **Certificados SSL**
- ✅ **Ubicación**: `/ssl/localhost.crt` y `/ssl/localhost.key`
- ✅ Certificados autofirmados generados y disponibles
- ✅ Montados correctamente en nginx-proxy

### 2. **NGINX Proxy (nginx-proxy.conf)**
- ✅ **Puerto 443**: HTTPS configurado y funcional
- ✅ **Puerto 9443**: HTTPS configurado y funcional (puerto principal de acceso)
- ✅ **Puerto 80**: Redirige automáticamente a HTTPS
- ✅ SSL/TLS correctamente configurado (TLSv1.2, TLSv1.3)
- ✅ WebSockets sobre HTTPS (WSS) configurados para:
  - `/pong/` (juego)
  - `/observar` (espectadores)
  - `/api/chat/ws` (chat)

### 3. **Frontend - Detección Automática de Protocolo**
- ✅ **WebSockets**: Detectan automáticamente el protocolo (ws:// o wss://)
  ```typescript
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ```
- ✅ Archivos con detección automática:
  - `UnifiedGameRenderer.ts` (juego)
  - `gameLobby.ts` (lobby)
  - `chat.ts` (chat)

### 4. **Servicios Backend**
- ✅ Comunicación **interna** entre servicios (dentro de Docker) usando HTTP (correcto)
- ✅ Los servicios NO necesitan HTTPS internamente, solo externamente

---

## ❌ Problemas Identificados - Lo que NO funciona correctamente por HTTPS

### 1. **🔴 CRÍTICO: URLs Hardcodeadas con HTTP en Frontend**

#### **A. Tournaments (tournaments.ts)**
**Problema**: 7 llamadas a `http://localhost:8005` (db-service directamente)

```typescript
// ❌ INCORRECTO - Llamadas directas saltándose el API Gateway
http://localhost:8005/tournaments
http://localhost:8005/tournaments?created_by=${user.id}
http://localhost:8005/tournaments/${tournamentId}/join
http://localhost:8005/tournaments/${tournamentId}/start
http://localhost:8005/tournaments/${tournamentId}
http://localhost:8005/tournaments/${t.id}/participants
```

**Solución**: Cambiar a rutas relativas que pasen por nginx-proxy:
```typescript
// ✅ CORRECTO - A través del API Gateway con HTTPS
/api/tournaments
/api/tournaments?created_by=${user.id}
/api/tournaments/${tournamentId}/join
/api/tournaments/${tournamentId}/start
/api/tournaments/${tournamentId}
/api/tournaments/${t.id}/participants
```

#### **B. Google OAuth (google-config.ts)**
**Problema**: redirect_uri con HTTP
```typescript
redirect_uri: 'http://localhost:9001'  // ❌ INCORRECTO
```

**Solución**:
```typescript
redirect_uri: 'https://localhost:9443'  // ✅ CORRECTO
```

### 2. **🟡 IMPORTANTE: Puertos HTTP Expuestos**

#### **docker-compose.yml**
Actualmente varios puertos HTTP están expuestos innecesariamente:

```yaml
# Estos puertos NO deberían ser accesibles públicamente:
- "8001:8000" # auth-service
- "8002:8000" # game-service  
- "8003:8000" # chat-service
- "9000:8000" # api-gateway
- "8005:8000" # db-service
- "9001:9001" # nginx-proxy HTTP (podría eliminarse)
- "9002:8080" # WAF HTTP
- "8081:8081" # redis-commander
```

**Acción recomendada**: Estos puertos deberían:
1. **Eliminarse** si no se necesitan para debugging
2. **O comentarse** en producción
3. **O configurarse** para escuchar solo en localhost (127.0.0.1:puerto)

### 3. **🟠 MONITOREO: Servicios de Monitoring sin HTTPS**

#### **Prometheus (prometheus.yml)**
```yaml
# ❌ URLs con HTTP
- http://10.0.2.15:9001
- http://10.0.2.15:9002
- http://10.0.2.15:8081
```

**Problema**: Prometheus está monitoreando endpoints HTTP en lugar de HTTPS.

**Solución opciones**:
1. **Monitorear internamente** (recomendado): Monitorear los contenedores directamente desde la red Docker
2. **HTTPS con skip_verify**: Configurar HTTPS con `insecure_skip_verify: true`

#### **Grafana**
```yaml
url: http://prometheus:9090  # Interno - OK
```
Esto está bien porque es comunicación interna.

---

## 🔧 Plan de Implementación para Full HTTPS

### Fase 1: Frontend (ALTA PRIORIDAD) ⚠️

#### 1.1 Actualizar `tournaments.ts`
**Archivo**: `/frontend/src/pages/tournaments.ts`

**Cambiar todas las llamadas**:
```typescript
// Buscar y reemplazar:
'http://localhost:8005/tournaments' → '/api/tournaments'
```

**Líneas afectadas**: 87, 95, 130, 136, 213, 233, 249

#### 1.2 Actualizar `google-config.ts`
**Archivo**: `/frontend/src/google-config.ts`

```typescript
export const GOOGLE_CONFIG = {
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: window.location.origin || 'https://localhost:9443',  // ✅ Dinámico
    scope: 'email profile'
};
```

### Fase 2: Seguridad de Puertos (MEDIA PRIORIDAD)

#### 2.1 Actualizar `docker-compose.yml`

**Opción 1 - Solo HTTPS público** (RECOMENDADO PARA PRODUCCIÓN):
```yaml
services:
  auth-service:
    # NO exponer puertos públicamente
    # ports:
    #   - "8001:8000"  # ❌ Comentado
    # ... resto igual

  nginx-proxy:
    ports:
      # - "80:80"      # ❌ Comentar si no se necesita redirect
      - "443:443"      # ✅ HTTPS estándar
      # - "9001:9001"  # ❌ Comentar HTTP
      - "9443:9443"    # ✅ HTTPS principal
```

**Opción 2 - Desarrollo con puertos locales** (ACTUAL):
```yaml
services:
  auth-service:
    ports:
      - "127.0.0.1:8001:8000"  # ✅ Solo localhost
```

#### 2.2 Crear archivo `.env` con configuración

```bash
# .env
ENABLE_HTTP_PORTS=false  # Para producción
DEBUG_MODE=false
```

### Fase 3: Monitoring (BAJA PRIORIDAD)

#### 3.1 Actualizar `prometheus.yml`

**Cambiar blackbox exporter a HTTPS**:
```yaml
- job_name: 'blackbox-https'
  metrics_path: /probe
  params:
    module: [http_2xx]
  static_configs:
    - targets:
        - https://localhost:9443       # ✅ HTTPS
        - https://localhost:443        # ✅ HTTPS
  relabel_configs:
    # ... mismo config
  tls_config:
    insecure_skip_verify: true  # Para certificados autofirmados
```

#### 3.2 Mantener monitoreo interno

Los servicios internos (Redis, servicios Docker) pueden seguir siendo monitoreados por HTTP ya que están dentro de la red Docker.

---

## 📊 Matriz de Cambios Requeridos

| Componente | Archivo | Estado Actual | Cambio Requerido | Prioridad |
|------------|---------|---------------|------------------|-----------|
| Frontend - Tournaments | `tournaments.ts` | ❌ HTTP directo | ✅ Rutas relativas | 🔴 ALTA |
| Frontend - Google OAuth | `google-config.ts` | ❌ HTTP | ✅ HTTPS dinámico | 🔴 ALTA |
| Docker - Puertos servicios | `docker-compose.yml` | ⚠️ Todos expuestos | ✅ Localhost o comentar | 🟡 MEDIA |
| Monitoring - Prometheus | `prometheus.yml` | ❌ HTTP | ✅ HTTPS + skip_verify | 🟠 BAJA |
| Monitoring - Grafana | `provisioning/` | ✅ OK | - | ✅ OK |
| NGINX - Configuración | `nginx-proxy.conf` | ✅ OK | - | ✅ OK |
| WebSockets | Frontend TS | ✅ Detección auto | - | ✅ OK |
| Certificados SSL | `/ssl/` | ✅ OK | - | ✅ OK |

---

## 🚀 Instrucciones de Implementación Paso a Paso

### Paso 1: Backup
```bash
cd /home/manufern/Desktop/42_transcendence
git add .
git commit -m "Backup antes de implementar full HTTPS"
```

### Paso 2: Cambios en Frontend

```bash
# 1. Editar tournaments.ts
# Reemplazar todas las URLs http://localhost:8005 por /api

# 2. Editar google-config.ts
# Actualizar redirect_uri a HTTPS
```

### Paso 3: Validar Configuración NGINX

```bash
# Verificar que nginx-proxy.conf tenga correctamente:
# - Puerto 9443 con SSL
# - WebSockets (WSS) configurados
# - Proxy a servicios internos
```

### Paso 4: Rebuild y Test

```bash
# Rebuild frontend con cambios
docker-compose build frontend

# Restart servicios
docker-compose restart nginx-proxy frontend

# Test
curl -k https://localhost:9443
curl -k https://localhost:443
```

### Paso 5: Securizar Puertos (Opcional para Producción)

```bash
# Editar docker-compose.yml
# Comentar puertos públicos de servicios internos
# Mantener solo 443 y 9443

# Rebuild todo
docker-compose down
docker-compose up -d
```

---

## 🧪 Checklist de Validación

### Acceso Web
- [ ] `https://localhost:9443` funciona
- [ ] `https://localhost:443` funciona
- [ ] `http://localhost:80` redirige a HTTPS
- [ ] Sin errores de certificado aceptados en navegador

### Frontend Functionality
- [ ] Login/Register funciona por HTTPS
- [ ] Google OAuth redirige a HTTPS
- [ ] Subir avatar funciona
- [ ] Ver perfil funciona

### Game Features
- [ ] Crear juego funciona
- [ ] Conectar a juego usa WSS://
- [ ] Jugar partida sin errores
- [ ] Observar juego usa WSS://

### Chat
- [ ] Abrir chat funciona
- [ ] WebSocket chat usa WSS://
- [ ] Enviar mensajes funciona
- [ ] Recibir mensajes funciona

### Tournaments
- [ ] Ver torneos funciona (API a través de proxy)
- [ ] Crear torneo funciona
- [ ] Unirse a torneo funciona
- [ ] Iniciar torneo funciona

### Admin/Monitoring
- [ ] Vault accesible (si configurado)
- [ ] Grafana funciona
- [ ] Prometheus funciona
- [ ] Redis Commander funciona

---

## 🔐 Consideraciones de Seguridad

### Certificados en Producción
⚠️ **IMPORTANTE**: Los certificados actuales son **autofirmados** y solo para desarrollo.

Para producción, necesitas:
1. **Let's Encrypt**: Certificados gratuitos con certbot
2. **Certificados comerciales**: De una CA reconocida
3. **Actualizar docker-compose.yml**: Montar nuevos certificados

```bash
# Ejemplo con Let's Encrypt
certbot certonly --standalone -d tudominio.com
# Montar en nginx-proxy:
# - /etc/letsencrypt/live/tudominio.com/fullchain.pem:/etc/ssl/certs/localhost.crt
# - /etc/letsencrypt/live/tudominio.com/privkey.pem:/etc/ssl/private/localhost.key
```

### Headers de Seguridad
Añadir en `nginx-proxy.conf`:
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

---

## 📝 Notas Técnicas

### Por qué los servicios internos usan HTTP
Los servicios dentro de Docker (`auth-service`, `game-service`, etc.) usan HTTP para comunicarse entre ellos porque:
1. ✅ Están en una red privada Docker
2. ✅ No son accesibles desde fuera
3. ✅ HTTPS interno añadiría overhead innecesario
4. ✅ NGINX hace de terminación SSL (SSL termination)

### Arquitectura de Seguridad
```
Internet/Usuario
      ↓ HTTPS (443/9443)
  nginx-proxy (SSL Termination)
      ↓ HTTP (interno)
    WAF → Frontend
      ↓ HTTP (interno)
  API Gateway
      ↓ HTTP (interno)
  Auth/Game/Chat/DB Services
```

---

## 🎯 Resumen Final

### ✅ Lo que está BIEN
1. NGINX proxy con HTTPS en 443 y 9443
2. Certificados SSL montados correctamente
3. WebSockets con detección automática ws/wss
4. Redirección HTTP → HTTPS en puerto 80
5. Comunicación interna HTTP (correcto por diseño)

### ❌ Lo que DEBE cambiarse
1. **CRÍTICO**: URLs hardcodeadas en `tournaments.ts` (7 lugares)
2. **CRÍTICO**: Google OAuth redirect_uri con HTTP
3. **IMPORTANTE**: Puertos internos expuestos públicamente
4. **OPCIONAL**: Monitoring endpoints con HTTP

### 🎮 Resultado Final
Una vez aplicados los cambios:
- ✅ **Solo** acceso por HTTPS en puertos 443 y 9443
- ✅ Todas las peticiones del frontend por HTTPS
- ✅ Todos los WebSockets por WSS
- ✅ Servicios internos NO accesibles directamente
- ✅ Sistema completo funcionando exclusivamente por HTTPS

---

**Autor**: GitHub Copilot  
**Fecha**: 16 de Octubre de 2025  
**Rama**: https  
**Versión**: 1.0
