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
PROJECT_NAME := inception
DATA_DIR = /home/jverdu-r/data
SECRETS_DIR = ./secrets

SECRETS_NAMES :=

MAKEFILE_PATH := $(abspath $(lastword $(MAKEFILE_LIST)))
PROJECT_ROOT := $(dir $(MAKEFILE_PATH))
ABSOLUTE_SECRETS_DIR := $(PROJECT_ROOT)$(SECRETS_DIR:../=/)

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

	all: up

	down:

	stop:

	start:

	restart: down start

	logs:

	ps:

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
		@echo "  make exec-wordpress - Access the WordPress container."
		@echo "  make exec-mariadb   - Access the MariaDB container."

	clean:

	fclean: clean

