# --- FASE 1: Construcción de la aplicación ---
# Construimos nuestra propia imagen base con Alpine Linux
FROM alpine:latest AS build_stage

# Instalar Node.js y dependencias usando el gestor de paquetes de Alpine
# Esto es más simple y confiable que compilar desde fuentes
RUN apk add --no-cache \
    nodejs \
    npm \
    python3 \
    make \
    g++ \
    linux-headers \
    && addgroup -g 1000 node \
    && adduser -u 1000 -G node -s /bin/sh -D node \
    # Verificar instalación
    && node --version \
    && npm --version

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de configuración de npm
# Esto es crucial para aprovechar el cache de Docker y solo reinstalar dependencias si cambian
COPY package*.json ./

# Instala todas las dependencias del proyecto (incluido TypeScript y Webpack)
# Usar --production=false para asegurar que se instalen las devDependencies
RUN npm ci --production=false

# Copia el resto del código fuente del proyecto al directorio de trabajo
COPY . .

# Ejecuta el script de construcción de tu aplicación.
# Este script (definido en package.json) compilará tu TypeScript a JavaScript
# y empaquetará todos los recursos en la carpeta 'dist'.
RUN npm run build

# --- FASE 2: Servir la aplicación con Nginx ---
# Construimos nuestra propia imagen con Nginx desde Alpine
FROM alpine:latest

# Instalar Nginx y dependencias necesarias
RUN apk add --no-cache \
    nginx \
    curl \
    && mkdir -p /var/log/nginx \
    && mkdir -p /var/lib/nginx/tmp \
    && mkdir -p /run/nginx \
    && chown -R nginx:nginx /var/log/nginx \
    && chown -R nginx:nginx /var/lib/nginx \
    && chown -R nginx:nginx /run/nginx

# Crear directorio para archivos web
RUN mkdir -p /usr/share/nginx/html \
    && chown -R nginx:nginx /usr/share/nginx/html

# Copia tu archivo de configuración de Nginx personalizado al contenedor
COPY nginx.conf /etc/nginx/nginx.conf

# Copia los archivos de la aplicación compilada (de la fase 'build_stage')
# a la carpeta donde Nginx espera encontrar los archivos estáticos
COPY --from=build_stage /app/dist /usr/share/nginx/html

# Expone el puerto 80 del contenedor, que es donde Nginx estará escuchando
EXPOSE 80

# Define el comando que se ejecuta cuando el contenedor se inicia.
# Inicia Nginx en primer plano para que Docker pueda monitorearlo.
CMD ["nginx", "-g", "daemon off;"]