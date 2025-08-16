FROM alpine:3.20

# Instala dependencias necesarias
RUN apk add --no-cache wget unzip ca-certificates

# Descarga e instala redis_exporter
RUN wget -O redis_exporter.tar.gz https://github.com/oliver006/redis_exporter/releases/download/v1.61.0/redis_exporter-v1.61.0.linux-amd64.tar.gz \
    && tar -xzf redis_exporter.tar.gz \
    && mv redis_exporter-v1.61.0.linux-amd64/redis_exporter /usr/local/bin/ \
    && rm -rf redis_exporter*

# Instala Vault Agent
RUN wget -O vault.zip https://releases.hashicorp.com/vault/1.20.2/vault_1.20.2_linux_amd64.zip \
    && unzip vault.zip \
    && mv vault /usr/local/bin/ \
    && rm vault.zip

# Copia el script y la plantilla
COPY start-with-vault.sh /app/start-with-vault.sh
COPY secrets.env.tpl /app/secrets.env.tpl
COPY agent.hcl /vault/agent.hcl

RUN chmod +x /app/start-with-vault.sh

ENTRYPOINT ["/app/start-with-vault.sh"]

