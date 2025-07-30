FROM node:20-alpine

WORKDIR /app

# Instala dependencias del sistema para canvas
RUN apk add --no-cache \
    build-base \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev

# Crea directorio de datos con permisos
RUN mkdir -p /app/data && chmod 777 /app/data
RUN npm install @fastify/multipart && npm install --save-dev @types/node && npm install @fastify/cookie

# Copia e instala dependencias de Node
COPY package*.json ./
RUN npm install

# Copia el resto de los archivos y construye
COPY . .
RUN npm run build

EXPOSE 8000
CMD ["npm", "start"]