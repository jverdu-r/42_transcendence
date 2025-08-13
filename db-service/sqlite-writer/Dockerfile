
FROM node:20-alpine as build

WORKDIR /app

# Dependencias necesarias para Vault Agent y build
RUN apk add --no-cache bash curl wget unzip

# Instala dependencias y compila
COPY package.json tsconfig.json ./
RUN npm install
COPY writer.ts ./
RUN npm run build

# Instala Vault Agent
RUN wget -q https://releases.hashicorp.com/vault/1.15.5/vault_1.15.5_linux_amd64.zip && \
	unzip vault_1.15.5_linux_amd64.zip && \
	mv vault /usr/local/bin/ && \
	rm vault_1.15.5_linux_amd64.zip

# Imagen final
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache bash curl

# Copia Vault Agent
COPY --from=build /usr/local/bin/vault /usr/local/bin/vault

# Copia artefactos y scripts
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY agent.hcl secrets.env.tpl start-with-vault.sh ./
RUN chmod +x start-with-vault.sh

CMD ["./start-with-vault.sh"]
