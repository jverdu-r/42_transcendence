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

# --- FASE 2: Contenedor ligero para copiar los artefactos de construcción ---
# Este es un contenedor muy ligero que solo existirá para copiar los archivos
# de 'dist' fuera de la fase de construcción.
# No ejecutará un servidor web.

FROM alpine:latest

# Crear el directorio de trabajo donde se copiarán los archivos
WORKDIR /app

# Copia los archivos de la aplicación compilada (de la fase 'build_stage')
# a una ubicación dentro de este contenedor ligero.
# Este contenedor no se ejecutará a largo plazo, solo sirve para extraer los archivos.
COPY --from=build_stage /app/dist /app/dist

# Este CMD es solo un placeholder para que el contenedor no se detenga inmediatamente
# después de la copia, aunque en la práctica, Docker Compose solo lo usará para el build.
CMD ["tail", "-f", "/dev/null"]
