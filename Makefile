COMPOSE = /usr/bin/docker compose -f docker-compose.yml --env-file .env

PROJECT_NAME := transcendence
DATA_PATH ?= $(HOME)/data/$(PROJECT_NAME)
export DATA_PATH
MAKEFILE_PATH := $(abspath $(lastword $(MAKEFILE_LIST)))

# CONSTRUCCION__________________________________________________________________

all-auto: ip set-ip prepare build up

ip:
	@./update_machine_ip.sh
	@./generate_prometheus_config.sh

all: prepare build up

prepare:
	@echo "� Generando certificados TLS para Vault..."
	./vault/scripts/generate-certs.sh

	mkdir -p "$(HOME)/data/transcendence/vault"
	chmod -R 755 "$(HOME)/data/transcendence/vault"
	@echo "Vault data directory prepared at: $(HOME)/data/transcendence/vault"

	mkdir -p "$(HOME)/data/transcendence/vault/logs"
	chmod -R 755 "$(HOME)/data/transcendence/vault/logs"
	@echo "Vault logs directory prepared at: $(HOME)/data/transcendence/vault/logs"

	mkdir -p "$(HOME)/data/transcendence/vault/data"
	chmod -R 755 "$(HOME)/data/transcendence/vault/data"
	@echo "Vault data directory prepared at: $(HOME)/data/transcendence/vault/data"

	mkdir -p ./vault/generated
	chmod -R 777 ./vault/generated
	@echo "Vault generated directory prepared at: ./vault/generated"

	mkdir -p "$(HOME)/data/transcendence/sqlite"
	chmod -R 777 "$(HOME)/data/transcendence/sqlite"
	@echo "SQLite data directory prepared at: $(HOME)/data/transcendence/sqlite"

	mkdir -p "$(HOME)/data/transcendence/sqlite"
	chmod -R 777 "$(HOME)/data/transcendence/sqlite"
	@echo "SQLite data directory prepared at: $(HOME)/data/transcendence/sqlite"

	mkdir -p "$(HOME)/data/transcendence/redis"
	chown -R 1000:1000 "$(HOME)/data/transcendence/redis" || true
	chmod -R 750 "$(HOME)/data/transcendence/redis"
	@echo "Redis data directory prepared at: $(HOME)/data/transcendence/redis"

	mkdir -p "$(HOME)/data/transcendence/frontend"

	mkdir -p "$(HOME)/data/transcendence/prometheus"
	chmod -R 777 "$(HOME)/data/transcendence/prometheus"
	@echo "Prometheus data directory prepared at: $(HOME)/data/transcendence/prometheus"

	mkdir -p "$(HOME)/data/transcendence/grafana"
	chmod -R 777 "$(HOME)/data/transcendence/grafana"
	@echo "Grafana data directory prepared at: $(HOME)/data/transcendence/grafana"

	mkdir -p "$(HOME)/data/transcendence/alertmanager"
	chmod -R 777 "$(HOME)/data/transcendence/alertmanager"
	@echo "Alertmanager data directory prepared at: $(HOME)/data/transcendence/alertmanager"
	@echo "Frontend data directory prepared at: $(HOME)/data/transcendence/frontend"

	mkdir -p "$(HOME)/data/transcendence/prometheus"
	chmod -R 777 "$(HOME)/data/transcendence/prometheus"
	@echo "Prometheus data directory prepared at: $(HOME)/data/transcendence/prometheus"

	mkdir -p "$(HOME)/data/transcendence/grafana"
	chmod -R 777 "$(HOME)/data/transcendence/grafana"
	@echo "Grafana data directory prepared at: $(HOME)/data/transcendence/grafana"

	mkdir -p "$(HOME)/data/transcendence/alertmanager"
	chmod -R 777 "$(HOME)/data/transcendence/alertmanager"
	@echo "Alertmanager data directory prepared at: $(HOME)/data/transcendence/alertmanager"

build:
	@$(COMPOSE) build

up:
	@$(COMPOSE) up -d
	@echo "🚀 Ejecutando setup de Vault desde el host..."
	@./vault/scripts/setup-vault.sh

show:
	@./show_services.sh

down:
	@$(COMPOSE) down

start:
	@$(COMPOSE) start
	@echo "🔓 Unsealing Vault..."
	@bash vault/scripts/unseal-vault.sh

stop:
	@$(COMPOSE) stop

shell:
	@bash -c '\
		read -p "=> Enter service: " service; \
		$(COMPOSE) exec -it $$service /bin/bash || $(COMPOSE) exec -it $$service /bin/sh'

# LIMPIEZA______________________________________________________________________
clean: down

fclean: clean
	@echo "Stopping and removing all containers..."
	@$(COMPOSE) down --volumes --rmi all --remove-orphans 2>/dev/null || true
	@echo "Cleaning up any manually created containers..."
	@docker stop WAF nginx-proxy 2>/dev/null || true
	@docker rm WAF nginx-proxy 2>/dev/null || true
	@echo "Cleaning up networks..."
	@docker network inspect inception_network > /dev/null 2>&1 && \
	docker network rm inception_network || true
	@docker network inspect transcendence_net > /dev/null 2>&1 && \
	docker network rm transcendence_net || true
	@echo "Pruning volumes..."
	@docker volume prune -f 2>/dev/null || true
	@echo "Cleaning up Vault files and tokens..."
	@rm -f vault/scripts/vault-keys.json vault/scripts/service-tokens.json vault/scripts/vault-keys.txt .env.tokens .env.generated 2>/dev/null || true
	@rm -f vault-keys.json service-tokens.json .env.vault .env.tokens 2>/dev/null || true
	@rm -rf vault/generated/* vault/generated/.* 2>/dev/null || true
	@echo "Cleaning up Vault certificates..."
	@rm -rf vault/certs/* vault/certs/.* 2>/dev/null || true	
	@echo "Removing data directory..."
	@sudo rm -rf "$(DATA_PATH)"
	@sudo rm -rf "/tmp/trascender-data" 2>/dev/null || true

# REBUILD_______________________________________________________________________
quick-re: clean
	@$(COMPOSE) up -d --force-recreate

re: fclean all

.PHONY: all all-auto build up down start stop shell clean fclean re quick-re prepare set-ip show
