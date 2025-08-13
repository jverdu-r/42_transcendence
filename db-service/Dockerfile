FROM node:20-alpine

WORKDIR /app

# Instala Python y herramientas necesarias para sqlite3
RUN apk add --no-cache python3 build-base


# Instala Vault CLI
ENV VAULT_VERSION=1.15.5
RUN wget -q https://releases.hashicorp.com/vault/${VAULT_VERSION}/vault_${VAULT_VERSION}_linux_amd64.zip \
	&& unzip vault_${VAULT_VERSION}_linux_amd64.zip \
	&& mv vault /usr/local/bin/ \
	&& rm vault_${VAULT_VERSION}_linux_amd64.zip

COPY package*.json ./
RUN npm install

# Copia el resto del código y compila TypeScript
COPY . .
RUN npm run build

# Instala 'concurrently' para ejecutar server + redis-writer
RUN npm install --save concurrently

EXPOSE 8000


# Copia archivos de Vault Agent
COPY agent.hcl secrets.env.tpl start-with-vault.sh ./
RUN chmod +x start-with-vault.sh

# Usa Vault Agent como entrypoint
ENTRYPOINT ["./start-with-vault.sh"]


