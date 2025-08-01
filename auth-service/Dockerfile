FROM node:20

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

# Fuerza la reconstrucción de canvas desde cero
RUN npm install --build-from-source=canvas

# Copia el código fuente
COPY . .

# Compila el proyecto
RUN npm run build

EXPOSE 8000

CMD ["npm", "start"]