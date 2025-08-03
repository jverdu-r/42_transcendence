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
