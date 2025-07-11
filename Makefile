COMPOSE = /usr/bin/docker compose -f docker-compose.yml --env-file .env

PROJECT_NAME := transcendence
DATA_PATH ?= $(HOME)/data/$(PROJECT_NAME)
export DATA_PATH
MAKEFILE_PATH := $(abspath $(lastword $(MAKEFILE_LIST)))

# CONSTRUCCION__________________________________________________________________
all: prepare build up

check-secrets:
	@if [ ! -f "secrets/redis/password.txt" ]; then \
		echo "Error: secrets/redis/password.txt no encontrado"; \
		exit 1; \
	fi
	@echo "Todos los secrets existen"

prepare:
	@mkdir -p "$(DATA_PATH)/sqlite"
	@chmod -R 777 "$(DATA_PATH)/sqlite"
	@echo "SQLite data directory prepared at: $(DATA_PATH)/sqlite"

	@mkdir -p "$(DATA_PATH)/redis" secrets/redis
	@chmod 600 secrets/redis/password.txt 2>/dev/null || true
	@chown -R 1000:1000 "$(DATA_PATH)/redis"
	@chmod -R 750 "$(DATA_PATH)/redis"
	@echo "Redis data directory prepared at: $(DATA_PATH)/redis"

	@mkdir -p "$(DATA_PATH)/frontend"
	@if [ ! -f "$(DATA_PATH)/sqlite/transcendance.db" ]; then \
		chmod -R 777 "$(DATA_PATH)/sqlite"; \
	fi
	@echo "Frontend data directory prepared at: $(DATA_PATH)/frontend"


build:
	@$(COMPOSE) build

up:
	@$(COMPOSE) up -d

down:
	@$(COMPOSE) down

start:
	@$(COMPOSE) start

stop:
	@$(COMPOSE) stop

shell:
	@bash -c '\
		read -p "=> Enter service [sqlite/redis]: " service; \
		$(COMPOSE) exec -it $$service /bin/bash || $(COMPOSE) exec -it $$service /bin/sh'

# LIMPIEZA______________________________________________________________________
clean: down

fclean: clean
	@$(COMPOSE) down --volumes --rmi all --remove-orphans 2>/dev/null || true
	@docker network inspect inception_network >/dev/null 2>&1 && \
	docker network rm inception_network || true
	@docker volume prune -f 2>/dev/null || true
	@sudo rm -rf "$(DATA_PATH)"

# REBUILD_______________________________________________________________________
quick-re: clean
	@$(COMPOSE) up -d --force-recreate

re: fclean all

.PHONY: all build up down start stop shell clean fclean re quick-re prepare check-secrets
