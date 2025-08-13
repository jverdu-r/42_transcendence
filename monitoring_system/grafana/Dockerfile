
FROM grafana/grafana:latest

USER root

# Instala Vault Agent (usando apk para Alpine Linux)
RUN apk add --no-cache wget unzip && \
    wget -O vault_1.20.2_linux_amd64.zip https://releases.hashicorp.com/vault/1.20.2/vault_1.20.2_linux_amd64.zip && \
    ls -lh && \
    unzip vault_1.20.2_linux_amd64.zip && \
    mv vault /usr/local/bin/ && \
    rm vault_1.20.2_linux_amd64.zip

# Copia el script y la plantilla
COPY start-with-vault.sh /app/start-with-vault.sh
COPY secrets.env.tpl /app/secrets.env.tpl
COPY agent.hcl /vault/agent.hcl

RUN chmod +x /app/start-with-vault.sh

ENTRYPOINT ["/app/start-with-vault.sh"]
