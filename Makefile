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

show:
	@./show_services.sh

down:
	@$(COMPOSE) down

start:
	@$(COMPOSE) start

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
	@echo "Removing data directory..."
	@sudo rm -rf "$(DATA_PATH)"

# REBUILD_______________________________________________________________________
quick-re: clean
	@$(COMPOSE) up -d --force-recreate

re: fclean all

.PHONY: all all-auto build up down start stop shell clean fclean re quick-re prepare set-ip show
