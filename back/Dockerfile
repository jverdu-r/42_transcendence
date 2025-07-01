# back/Dockerfile
# Construimos nuestra propia imagen base con Alpine Linux
FROM alpine:latest

# Instalar Node.js y dependencias usando el gestor de paquetes de Alpine
# Esto es más simple y confiable que compilar desde fuentes
RUN apk add --no-cache \
    nodejs \
    npm \
    curl \
    python3 \
    make \
    g++ \
    linux-headers \
    && addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node \
    # Verificar instalación
    && node --version \
    && npm --version

WORKDIR /usr/src/app
COPY package.json ./
RUN npm install --production # Esto está bien para prod, pero si usas dev dependencies, sería npm install
COPY . .
CMD ["node", "src/app.js"]
