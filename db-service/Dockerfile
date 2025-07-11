FROM node:20-alpine

WORKDIR /app

# Instala Python y herramientas necesarias para sqlite3
RUN apk add --no-cache python3 build-base

# Instala dependencias de Node.js
COPY package*.json ./
RUN npm install

# Copia el resto del código y compila TypeScript
COPY . .
RUN npm run build

# Instala 'concurrently' para ejecutar server + redis-writer
RUN npm install --save concurrently

EXPOSE 8000

# Ejecuta servidor y consumidor de cola Redis simultáneamente
CMD ["node", "dist/server.js"]


