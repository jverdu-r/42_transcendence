# HashiCorp Vault - Documentación de Producción
## Proyecto Trascender

### 📋 Índice
1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Instalación y Configuración](#instalación-y-configuración)
4. [Uso Básico](#uso-básico)
5. [Gestión de Secretos](#gestión-de-secretos)
6. [Integración con Servicios](#integración-con-servicios)
7. [Operaciones](#operaciones)
8. [Seguridad](#seguridad)
9. [Monitoreo](#monitoreo)
10. [Troubleshooting](#troubleshooting)

### 📖 Introducción

HashiCorp Vault es un sistema de gestión de secretos que proporciona un almacenamiento seguro y el acceso dinámico a secretos, tokens, contraseñas, certificados y claves de cifrado. En el proyecto Trascender, Vault centraliza la gestión de toda la información sensible.

### 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Auth Service  │    │  Game Service   │    │  Chat Service   │
│                 │    │                 │    │                 │
│  Token: auth-*  │    │  Token: game-*  │    │  Token: chat-*  │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │              ┌───────┴───────┐              │
          │              │               │              │
          └──────────────┤  Vault Cluster │──────────────┘
                         │               │
                         │  - KV Engine  │
                         │  - Policies   │
                         │  - Auth       │
                         │  - Audit      │
                         └───────────────┘
```

#### Componentes:
- **Vault Server**: Servidor principal que almacena y gestiona secretos
- **KV Engine**: Motor de secretos clave-valor versión 2
- **Policies**: Controles de acceso basados en políticas
- **Token Authentication**: Sistema de tokens para servicios
- **File Storage Backend**: Almacenamiento persistente (para estudios)

### 🚀 Instalación y Configuración

#### Prerrequisitos
```bash
# Docker y Docker Compose instalados
docker --version
docker-compose --version
```

#### Pasos de Instalación

1. **Construir e iniciar Vault**
```bash
# Construir la imagen de Vault
docker-compose build vault

# Iniciar Vault
docker-compose up -d vault

# Verificar que Vault esté ejecutándose
docker ps | grep vault
```

2. **Inicializar Vault**
```bash
# Usar el script de gestión
./manage-vault.sh init
```

3. **Sembrar secretos iniciales**
```bash
./manage-vault.sh seed
```

#### Estructura de Directorios
```
vault/
├── Dockerfile              # Imagen personalizada de Vault
├── config/
│   └── vault.hcl           # Configuración del servidor
├── policies/               # Políticas de acceso
│   ├── admin-policy.hcl
│   ├── auth-service-policy.hcl
│   ├── game-service-policy.hcl
│   ├── chat-service-policy.hcl
│   ├── db-service-policy.hcl
│   └── api-gateway-policy.hcl
└── scripts/                # Scripts de automatización
    ├── init-vault.sh       # Inicialización
    ├── seed-secrets.sh     # Sembrado de secretos
    ├── unseal-vault.sh     # Desbloqueo
    └── renew-tokens.sh     # Renovación de tokens
```

### 💻 Uso Básico

#### Integración con Makefile
El proyecto incluye integración completa con Makefile que simplifica todas las operaciones de Vault:

```bash
# Ver todos los comandos disponibles
make help

# Comandos específicos de Vault
make vault-help
```

**Comparación de métodos:**

| Operación | Comando Make | Script Directo |
|-----------|--------------|----------------|
| Despliegue completo | `make vault-deploy` | `./setup-vault.sh` |
| Ver estado | `make vault-status` | `./manage-vault.sh status` |
| Abrir UI | `make vault-ui` | `./manage-vault.sh ui` |
| Desbloquear | `make vault-unseal` | `./manage-vault.sh unseal` |
| Renovar tokens | `make vault-renew` | `./manage-vault.sh renew` |
| Crear backup | `make vault-backup` | `./manage-vault.sh backup` |
| Ver logs | `make vault-logs` | `./manage-vault.sh logs` |

#### Script de Gestión
El script `manage-vault.sh` proporciona comandos simples para gestionar Vault:

```bash
# Mostrar ayuda
./manage-vault.sh help

# Verificar estado
./manage-vault.sh status

# Desbloquear Vault
./manage-vault.sh unseal

# Renovar tokens
./manage-vault.sh renew

# Abrir UI web
./manage-vault.sh ui

# Ver logs
./manage-vault.sh logs
```

#### Acceso a la UI Web
- **URL**: http://localhost:8200/ui
- **Token**: Obtenible desde `vault/scripts/service-tokens.json`

#### CLI de Vault
```bash
# Conectar al contenedor
docker exec -it hashicorp_vault sh

# Configurar variables
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN="tu-token-aqui"

# Comandos básicos
vault status
vault secrets list
vault kv list secret/
```

### �️ Integración con Makefile

#### Arquitectura de Integración

El sistema de Vault está completamente integrado con el Makefile del proyecto, proporcionando una interfaz unificada para la gestión de servicios y secretos.

```
Makefile
├── 📦 BUILD & DEPLOYMENT
│   ├── all-auto           # Incluye vault-setup automático
│   ├── all                # Incluye vault-init
│   └── vault-deploy       # Despliegue completo especializado
├── 🔐 VAULT MANAGEMENT
│   ├── vault-setup        # Configuración automatizada completa
│   ├── vault-init         # Inicialización manual
│   ├── vault-unseal       # Desbloqueo
│   ├── vault-seed         # Poblado de secretos
│   ├── vault-status       # Verificación de estado
│   ├── vault-ui           # Interfaz web
│   ├── vault-logs         # Visualización de logs
│   ├── vault-renew        # Renovación de tokens
│   ├── vault-backup       # Respaldos
│   └── vault-help         # Ayuda específica
└── 🧹 CLEANUP
    ├── clean              # Parada de servicios
    └── fclean             # Limpieza completa (incluye Vault)
```

#### Objetivos de Construcción

**`make all-auto`**
- Ejecuta: `ip set-ip prepare build vault-setup up`
- Incluye configuración automática de IP y setup completo de Vault
- Ideal para despliegues en nuevos entornos

**`make all`**
- Ejecuta: `prepare build vault-init up`
- Setup estándar con inicialización manual de Vault
- Para entornos donde se requiere control granular

**`make vault-deploy`**
- Ejecuta: `prepare build vault-setup up`
- Especializado en despliegue con Vault
- Incluye mensajes informativos post-despliegue

#### Gestión de Directorios

El objetivo `prepare` fue extendido para incluir directorios específicos de Vault:

```makefile
prepare:
    # ... otros directorios ...
    mkdir -p "$(HOME)/data/transcendence/vault"
    chmod -R 755 "$(HOME)/data/transcendence/vault"
    
    mkdir -p "$(HOME)/data/transcendence/vault-logs"
    chmod -R 755 "$(HOME)/data/transcendence/vault-logs"
```

**Características técnicas:**
- Permisos 755 para seguridad (más restrictivo que otros servicios)
- Separación de datos y logs
- Integración con variable `DATA_PATH`

#### Limpieza Avanzada

El objetivo `fclean` incluye limpieza específica de Vault:

```makefile
fclean: clean
    # Contenedores específicos
    @docker stop hashicorp_vault 2>/dev/null || true
    @docker rm hashicorp_vault 2>/dev/null || true
    
    # Archivos sensibles
    @rm -f vault/scripts/vault-keys.json 2>/dev/null || true
    @rm -f vault/scripts/service-tokens.json 2>/dev/null || true
    @rm -f .env.tokens .env.generated 2>/dev/null || true
```

#### Comandos Vault Específicos

Cada comando `make vault-*` ejecuta el script correspondiente con logging mejorado:

```makefile
vault-status:
    @echo "📊 Checking Vault status..."
    @./manage-vault.sh status

vault-ui:
    @echo "🌐 Opening Vault UI..."
    @./manage-vault.sh ui
```

#### Sistema de Ayuda

**`make help`**
- Muestra todos los comandos categorizados
- Incluye sección específica "🔐 VAULT MANAGEMENT"
- Proporciona guía de inicio rápido

**`make vault-help`**
- Delega al script de gestión: `./manage-vault.sh help`
- Mantiene consistencia entre interfaces

#### Variables de Entorno y Paths

```makefile
COMPOSE = /usr/bin/docker compose -f docker-compose.yml --env-file .env
PROJECT_NAME := transcendence
DATA_PATH ?= $(HOME)/data/$(PROJECT_NAME)
export DATA_PATH
```

**Integración técnica:**
- `DATA_PATH` exportada globalmente
- Compatibilidad con scripts de Vault
- Configuración centralizada en `.env`

#### Dependencias y Orden de Ejecución

Los objetivos siguen un orden lógico de dependencias:

```
vault-deploy: prepare build vault-setup up
│
├── prepare     # Crea directorios (incluye Vault)
├── build       # Construye imágenes Docker
├── vault-setup # Ejecuta setup-vault.sh completo
└── up          # Inicia todos los servicios
```

#### Integración con Docker Compose

Los comandos Make utilizan la variable `COMPOSE` que incluye:
- Archivo de configuración específico
- Variables de entorno desde `.env`
- Compatibilidad con scripts de Vault

#### PHONY Targets

Todos los objetivos de Vault están declarados como PHONY:

```makefile
.PHONY: vault-setup vault-init vault-unseal vault-seed vault-status \
        vault-ui vault-logs vault-renew vault-backup vault-help vault-deploy
```

Esto garantiza que siempre se ejecuten, independientemente de archivos con nombres similares.

#### Flujo de Datos

```
make vault-deploy
├── Crea DATA_PATH/vault (prepare)
├── Construye imagen vault (build)  
├── Ejecuta setup-vault.sh (vault-setup)
│   ├── Inicializa Vault
│   ├── Crea vault-keys.json
│   ├── Genera service-tokens.json
│   └── Pobla secretos iniciales
├── Inicia servicios (up)
└── Muestra información post-despliegue
```

### �🔐 Gestión de Secretos

#### Estructura de Secretos
```
secret/
├── common/                 # Configuración común
│   └── environment
├── database/               # Configuración de base de datos
│   └── config
├── redis/                  # Configuración de Redis
│   └── config
├── jwt/                    # Configuración JWT
│   └── config
├── auth-service/           # Secretos del servicio de auth
│   ├── config
│   └── oauth
├── game-service/           # Secretos del servicio de juegos
│   └── config
├── chat-service/           # Secretos del servicio de chat
│   └── config
├── db-service/             # Secretos del servicio de BD
│   └── config
├── api-gateway/            # Secretos del API Gateway
│   └── config
└── monitoring/             # Secretos de monitoreo
    └── config
```

#### Operaciones con Secretos

**Leer un secreto:**
```bash
vault kv get secret/jwt/config
vault kv get -field=secret secret/jwt/config
```

**Escribir un secreto:**
```bash
vault kv put secret/auth-service/config \
    api_key="nueva-clave" \
    session_timeout=3600
```

**Eliminar un secreto:**
```bash
vault kv delete secret/path/to/secret
```

**Listar secretos:**
```bash
vault kv list secret/
```

### 🔌 Integración con Servicios

#### Cliente Vault TypeScript
```typescript
import { vaultConfig } from './vault-integration';

// Obtener configuración
const config = await vaultConfig.getConfig();

// Obtener valor específico
const jwtSecret = await vaultConfig.getConfigValue('jwtSecret');

// Actualizar secreto
await vaultConfig.updateSecret('auth-service/config', {
    api_key: 'nueva-clave'
});
```

#### Ejemplo de Integración en Fastify
```typescript
import { registerVaultConfig } from './vault-integration';

const fastify = Fastify();

// Registrar configuración de Vault
await fastify.register(registerVaultConfig);

// Usar configuración
fastify.get('/protected', async (request, reply) => {
    const jwtSecret = await fastify.vaultConfig.getConfigValue('jwtSecret');
    // Usar jwtSecret...
});
```

#### Variables de Entorno Requeridas
```bash
# Variables necesarias para cada servicio
VAULT_ADDR=http://vault:8200
VAULT_TOKEN=service-specific-token

# Tokens específicos por servicio (desde service-tokens.json):
# - auth_service_token
# - game_service_token  
# - chat_service_token
# - db_service_token
# - api_gateway_token
```

### ⚙️ Operaciones

#### Políticas de Acceso
Cada servicio tiene una política específica que define qué secretos puede acceder:

```hcl
# Ejemplo: auth-service-policy.hcl
path "secret/data/auth-service/*" {
  capabilities = ["read", "list"]
}

path "secret/data/common/*" {
  capabilities = ["read", "list"]
}
```

#### Tokens de Servicio
- **TTL**: 720 horas (30 días)
- **Renovables**: Sí
- **Políticas**: Específicas por servicio

#### Backup y Restore
```bash
# Crear backup
./manage-vault.sh backup

# Restaurar desde backup
./manage-vault.sh restore /path/to/backup
```

#### Logs y Monitoreo
```bash
# Ver logs en tiempo real
./manage-vault.sh logs

# Verificar estado
./manage-vault.sh status
```

### 🛡️ Seguridad

#### Mejores Prácticas Implementadas

1. **Principio de Menor Privilegio**
   - Cada servicio solo accede a sus secretos necesarios
   - Políticas restrictivas por servicio

2. **Rotación de Tokens**
   - Tokens con TTL limitado
   - Auto-renovación implementada
   - Script para renovación manual

3. **Almacenamiento Seguro**
   - Datos cifrados en reposo
   - Claves de desbloqueo separadas
   - Backup seguro de claves

4. **Auditoría**
   - Logs detallados de acceso
   - Monitoreo de operaciones

#### Configuración de Seguridad

**Desbloqueo Manual:**
- Vault requiere desbloqueo manual después del reinicio
- 3 claves de desbloqueo generadas
- Umbral de 2 claves necesarias

**Tokens:**
- Tokens únicos por servicio
- Renovación automática cada 50 minutos
- Revocación automática si no se usan

### 📊 Monitoreo

#### Health Checks
```bash
# Health check general
curl http://localhost:8200/v1/sys/health

# Health check específico del servicio
curl http://localhost:8001/health/vault
```

#### Métricas de Vault
- **Puerto**: 8200
- **Endpoint**: `/v1/sys/metrics`
- **Formato**: Prometheus

#### Integración con Prometheus
```yaml
# prometheus.yml
- job_name: 'vault'
  static_configs:
    - targets: ['vault:8200']
  metrics_path: /v1/sys/metrics
```

### 🔧 Troubleshooting

#### Problemas Comunes

**1. Vault Sellado (Sealed)**
```bash
# Síntomas: Error "Vault is sealed"
# Solución:
./manage-vault.sh unseal
```

**2. Token Expirado**
```bash
# Síntomas: "permission denied" errors
# Solución:
./manage-vault.sh renew
```

**3. Configuración No Encontrada**
```bash
# Síntomas: Servicios usan configuración por defecto
# Verificación:
docker exec hashicorp_vault vault kv list secret/
```

**4. Vault No Responde**
```bash
# Verificar estado del contenedor
docker ps | grep vault
docker logs hashicorp_vault

# Reiniciar si es necesario
docker-compose restart vault
./manage-vault.sh unseal
```

#### Comandos de Diagnóstico
```bash
# Estado detallado de Vault
vault status -format=json

# Información del token actual
vault token lookup

# Verificar políticas
vault policy list
vault policy read auth-service-policy

# Listar secretos
vault kv list secret/
```

#### Logs Importantes
```bash
# Logs de Vault
docker logs hashicorp_vault --tail=100

# Logs de servicios relacionados con Vault
docker logs auth-service | grep -i vault
docker logs game-service | grep -i vault
```

### 📚 Referencias

#### Documentación Oficial
- [HashiCorp Vault](https://www.vaultproject.io/docs)
- [Vault API](https://www.vaultproject.io/api-docs)
- [Vault CLI](https://www.vaultproject.io/docs/commands)

#### Recursos Adicionales
- [Vault Production Hardening](https://learn.hashicorp.com/collections/vault/operations)
- [Vault Security Model](https://www.vaultproject.io/docs/internals/security)

### 🔄 Proceso de Despliegue

#### Primer Despliegue
```bash
# 1. Construir servicios
docker-compose build

# 2. Crear directorios de datos
sudo mkdir -p /tmp/trascender-data/{vault,vault-logs}
sudo chown -R $USER:$USER /tmp/trascender-data

# 3. Iniciar Vault
docker-compose up -d vault

# 4. Inicializar Vault
./manage-vault.sh init

# 5. Sembrar secretos
./manage-vault.sh seed

# 6. Copiar archivo de entorno
cp vault/scripts/.env.vault .env

# 7. Iniciar todos los servicios
docker-compose up -d
```

#### Actualizaciones
```bash
# 1. Backup antes de actualizar
./manage-vault.sh backup

# 2. Parar servicios (excepto Vault)
docker-compose stop auth-service game-service chat-service

# 3. Actualizar servicios
docker-compose up -d --no-deps auth-service game-service chat-service

# 4. Verificar estado
./manage-vault.sh status
```

### 🎯 Consideraciones para Producción Real

> **Nota**: Esta implementación está diseñada para un entorno de estudios. Para producción real, considera:

1. **Auto-unseal** con Cloud KMS (AWS, GCP, Azure)
2. **Alta Disponibilidad** con Consul backend
3. **TLS/SSL** habilitado
4. **Vault Enterprise** para características adicionales
5. **Backup automatizado** a almacenamiento en la nube
6. **Monitoreo avanzado** con alertas

---

**✨ ¡Vault está listo para usar en el proyecto Trascender!**

Para cualquier duda o problema, consulta esta documentación o ejecuta:
```bash
./manage-vault.sh help
```
