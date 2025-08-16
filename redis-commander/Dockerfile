FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
# Instala redis-commander y dependencias necesarias
RUN npm install redis-commander
RUN npm install --save-dev @types/node
COPY . .
# Si tienes build, descomenta la siguiente línea
# RUN npm run build
EXPOSE 8081
RUN apk add --no-cache bash curl
# Instalar Vault Agent
RUN wget -O /tmp/vault.zip https://releases.hashicorp.com/vault/1.15.6/vault_1.15.6_linux_amd64.zip \
	&& unzip /tmp/vault.zip -d /usr/local/bin \
	&& rm /tmp/vault.zip
# Copiar archivos de configuración de Vault Agent al final para evitar sobrescritura
COPY agent.hcl ./
COPY secrets.env.tpl ./
COPY start-with-vault.sh ./
RUN chmod +x ./start-with-vault.sh
ENTRYPOINT ["./start-with-vault.sh"]
