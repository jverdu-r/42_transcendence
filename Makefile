# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: jverdu-r <jverdu-r@student.42.fr>          +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/05/15 19:09:15 by jverdu-r          #+#    #+#              #
#    Updated: 2025/05/15 19:23:55 by jverdu-r         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

SHELL := /bin/bash
COMPOSE = docker compose
DOCKER = docker
SRC_DIR = ./srcs
PROJECT_NAME := transcendence
DATA_DIR = /home/data
SECRETS_DIR = ./secrets

SECRETS_NAMES := DB_PASSWORD API_KEY RABBITMQ_USER RABBITMQ_PASS

MAKEFILE_PATH := $(abspath $(lastword $(MAKEFILE_LIST)))
PROJECT_ROOT := $(dir $(MAKEFILE_PATH))
ABSOLUTE_SECRETS_DIR := $(PROJECT_ROOT)$(SECRETS_DIR:../=/)

.PHONY: create-secrets
create-secrets:
	@echo "Creating Docker secrets..."
	@for secret in $(SECRET_NAMES); do \
		SECRET_NAME=$$secret; \
		SECRET_FILE=$(ABSOLUTE_SECRETS_DIR)/$$SECRET_NAME.txt; \
		if $(DOCKER) secret inspect "$$SECRET_NAME" > /dev/null 2>&1; then \
			echo "Secret "$$SECRET_NAME" already exists."; \
		else \
			echo "Creating secret "$$SECRET_NAME" from "$$SECRET_FILE"..."; \
			$(DOCKER) secret create "$$SECRET_NAME" "$$SECRET_FILE"; \
		fi; \
	done
	@echo "Docker secrets creation complete."

.PHONY: create-data-dirs
create-data-dirs:
		mkdir -p $(DATA_DIR)/shared_sqlite
		mkdir -p $(DATA_DIR)/frontend_data

.PHONY: all
all: up

.PHONY: up
up: create-data-dirs create-secrets
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml up --build -d

.PHONY: down
down:
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml down

.PHONY: stop
stop:
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml stop

.PHONY: start
start:
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml start

.PHONY: restart
restart: down start

.PHONY: logs
logs:
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml logs --tail=50

.PHONY: ps
ps:
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml ps

.PHONY: help
help:
	@echo "Available commands:"
	@echo "  make up             - Start and build the containers."
	@echo "  make down           - Stop the containers."
	@echo "  make restart        - Restart the containers."
	@echo "  make clean          - Remove all volumes, images, and data."
	@echo "  make fclean         - Run clean and remove Docker secrets."
	@echo "  make logs           - Show recent logs."
	@echo "  make ps             - Show running containers."
	@echo "  make exec-nginx     - Access the Nginx container."

.PHONY: clean
clean:
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml down
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml rm -f
		docker image prune -a -f
		docker volume prune -f

.PHONY: fclean
fclean: clean
		docker secret rm $(SECRET_NAMES) 2>/dev/null || true

