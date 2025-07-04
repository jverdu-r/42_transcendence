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
SRC_DIR = ./src
PROJECT_NAME := transcendence
DATA_DIR = /home/data
SECRETS_DIR = ./secrets

SECRET_NAMES := DB_PASSWORD API_KEY RABBITMQ_USER RABBITMQ_PASS

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
	@echo "     ,                                                                          ;                                            , "             
	@echo "     Et           :                                :                            ED.                                :         Et "            
	@echo "     E#t         t#,                              t#,     :      L.             E#Wi                        .     t#,        E#t "           
	@echo "     E##t       ;##W.              .    .        ;##W.    Ef     EW:        ,ft E###G.                     ;W    ;##W.       E##t "          
	@echo "     E#W#t     :#L:WE              Di   Dt      :#L:WE    E#t    E##;       t#E E#fD#W;                   f#E   :#L:WE       E#W#t GEEEEEEEL "
	@echo "     E#tfL.   .KG  ,#D  :KW,      LE#i  E#i    .KG  ,#D   E#t    E###t      t#E E#t t##L                .E#f   .KG  ,#D      E#tfL.,;;L#K;;. "
	@echo "     E#t      EE    ;#f  ,#W:   ,KGE#t  E#t    EE    ;#f  E#t    E#fE#f     t#E E#t  .E#K,             iWW;    EE    ;#f     E#t      t#E   "
	@echo "  ,ffW#Dffj. f#.     t#i  ;#W. jWi E#t  E#t   f#.     t#i E#t fi E#t D#G    t#E E#t    j##f           L##Lffi f#.     t#i ,ffW#Dffj.  t#E   "
	@echo "   ;LW#ELLLf.:#G     GK    i#KED.  E########f.:#G     GK  E#t L#jE#t  f#E.  t#E E#t    :E#K:         tLLG##L  :#G     GK   ;LW#ELLLf. t#E   "
	@echo "     E#t      ;#L   LW.     L#W.   E#j..K#j... ;#L   LW.  E#t L#LE#t   t#K: t#E E#t   t##L             ,W#i    ;#L   LW.     E#t      t#E   "
	@echo "     E#t       t#f f#:    .GKj#K.  E#t  E#t     t#f f#:   E#tf#E:E#t    ;#W,t#E E#t .D#W;             j#E.      t#f f#:      E#t      t#E   "
	@echo "     E#t        f#D#;    iWf  i#K. E#t  E#t      f#D#;    E###f  E#t     :K#D#E E#tiW#G.            .D#j         f#D#;       E#t      t#E   "
	@echo "     E#t         G#t    LK:    t#E f#t  f#t       G#t     E#K,   E#t      .E##E E#K##i             ,WK,           G#t        E#t      t#E   "
	@echo "     E#t          t     i       tDj ii   ii        t      EL     ..         G#E E##D.              EG.             t         E#t       fE   "
	@echo "     ;#t                                                  :                  fE E#t                ,                         ;#t        :   "
	@echo "      :;                                                                      , L:                                            :;  "
	@echo ""
	@echo ""
	@echo "                                                           :::;xx88&&&&&&&&&&&&&88xx; "
	@echo "                                                   ;x8&&&x;x&:;+;X.+;:X::;.x;:+:;x:xxx&8&88x; "
	@echo "                                                  :&&;:;x::x.x+..x8.:::x.:x.+;:+:;x.:;.x::::&&8 "
	@echo "                                                  :&&;.;x::x.x+.:;8.+;:x.:x.+;:x:;x.:..x::x.X&8 "
	@echo "                                                  :&&;:&8::x.8:;x.x.+;:8X;:;88::.+x.x:.x:;x.X&8 "
	@echo "                                                  :&&;:&&8xX&&88Xxx+;;x8&&&&&&&&&&&&&&88x;::8&8 "
	@echo "                                                  :&&&x;:;x+::............+&&&&&&&&&&&&&&&&&&&8 "
	@echo "                                                  :8:..;;..::xx;............:8&&&&&x;:..:8&&&&8 "
	@echo "                                                  :8:..;;x&x;.:xxx::.:;;xxxx::;&Xx;.:+X&;8&&&&8 "
	@echo "                                                  :8:..x.:&&8+:.;:+;.......:::x:+:.:x&&x.x&&&&8 "
	@echo "                                                  :8:..x:.&&&x:.:;;:;.......:;:+:..;X&&x.x&&&&8 "
	@echo "                                                  :8:..:X.&&&&;::;.............:;::x&&&x;&&&&&8 "
	@echo "                                                  :8:...x:.x&&x:..................;&&8:.x&&&&&8 "
	@echo "                                                  :8:...;+..:::....................:::.:8&&&&&8 "
	@echo "                                                  :8:....;x:..........................:&&&&&&&8 "
	@echo "                                                  :8:.....x;......:;+:......;+:......:X&&&&&&&8 "
	@echo "                                                  :8:....;x:..:++::..x+....;:...:;:..:xX&&&&&&8 "
	@echo "                                                  :8:....:8:;..:&+x;X&:....:&x;+xx..:;;8&&&&&&8 "
	@echo "                                                  :8:.....x.:;:.:x&&&&.....:&&&&x..:;:8&&&&&&&x "
	@echo "                                                   xx..x...;+:x;....:;;....:x:....;xx&&&&&&&&&: "
	@echo "                                                   :8x:X;...:x;::;;:.:......::;;:;x&&&&&&&&&&+ "
	@echo "                                                     8&&&x.....::+::;:......:::X&&&&&&&&&&&&x "
	@echo "                                                     :X&&&8;......x+.;.....::.8&&&&&&&&&&&&+ "
	@echo "                                     ;x;++;;;;;;;;;xXXx8xXxXXx;;+;x+..::::::..88888888x;;;;: "
	@echo "                                      :x:.:::;;;;;;;;;;;;:;:;;;:;;xx:.+8&&&;.+;.......x...;: "
	@echo "                                        :;;;;;;;;;;;;;;;;;;+xxx+;;xxx::;8X;.+&&&&&&&&&8;;;; "
	@echo "                                                           :x&&&X:x+..;++;+&&&&&&&&&8; "
	@echo "                                                             :x&&&+:.......:&&&&&&&; "
	@echo "                                                               :+8&;.......:8&&&X: "
	@echo "                                                                  :x8x:...:;88; "
	@echo "                                                                     :;X&&x: "
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
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml logs --tail=100 -f

.PHONY: logs-all
logs-all:
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml logs --tail=100

.PHONY: logs-live
logs-live:
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml logs -f

.PHONY: logs-frontend
logs-frontend:
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml logs frontend --tail=50

.PHONY: logs-nginx
logs-nginx:
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml logs nginx --tail=50

.PHONY: logs-auth
logs-auth:
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml logs backend-auth --tail=50

.PHONY: logs-db
logs-db:
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml logs backend-db-access --tail=50

.PHONY: logs-game
logs-game:
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml logs backend-game --tail=50

.PHONY: logs-database
logs-database:
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml logs database --tail=50

.PHONY: logs-rabbitmq
logs-rabbitmq:
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml logs rabbitmq --tail=50

.PHONY: ps
ps:
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml ps

.PHONY: status
status:
		@echo "=== Container Status ==="
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml ps
		@echo "\n=== Service Health ==="
		@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep transcendence || echo "No transcendence containers running"

.PHONY: health
health:
		@echo "=== Health Check ==="
		@echo "Frontend: " && curl -s -o /dev/null -w "%{http_code}" http://localhost/ || echo "Failed"
		@echo "Auth API: " && curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/health || echo "Failed"
		@echo "Game API: " && curl -s -o /dev/null -w "%{http_code}" http://localhost:8082/health || echo "Failed"
		@echo "RabbitMQ: " && curl -s -o /dev/null -w "%{http_code}" http://localhost:15672/ || echo "Failed"

.PHONY: help
help:
	@echo "Available commands:"
	@echo "  make up               - Start and build the containers."
	@echo "  make down             - Stop the containers."
	@echo "  make restart          - Restart the containers."
	@echo "  make clean            - Remove all volumes, images, and data."
	@echo "  make fclean           - Run clean and remove Docker secrets."
	@echo "  make logs             - Show recent logs."
	@echo "  make ps               - Show running containers."
	@echo "  make exec-nginx       - Access the Nginx container."

.PHONY: clean
clean:
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml down
		$(COMPOSE) -f $(SRC_DIR)/docker-compose.yml rm -f
		docker image prune -a -f
		docker volume prune -f

.PHONY: fclean
fclean: clean
		docker secret rm $(SECRET_NAMES) 2>/dev/null || true
