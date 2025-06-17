# --- FASE 1: Construcción de la aplicación ---
# Usamos una imagen de Node.js que incluye npm
FROM node:20-alpine AS build_stage

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de configuración de npm
# Esto es crucial para aprovechar el cache de Docker y solo reinstalar dependencias si cambian
COPY package*.json ./

# Instala todas las dependencias del proyecto (incluido TypeScript y Webpack)
# Si sigues teniendo problemas con EPERM o warnings, puedes intentar:
# RUN npm install --force --unsafe-perm
# Pero lo ideal es que 'npm install' sin flags funcione si tus permisos de host están bien.
RUN npm install

# Copia el resto del código fuente del proyecto al directorio de trabajo
COPY . .

# Ejecuta el script de construcción de tu aplicación.
# Este script (definido en package.json) compilará tu TypeScript a JavaScript
# y empaquetará todos los recursos en la carpeta 'dist'.
RUN npm run build

# --- FASE 2: Servir la aplicación con Nginx ---
# Usamos una imagen de Nginx muy ligera para el servidor web final
FROM nginx:alpine

# Copia tu archivo de configuración de Nginx personalizado al contenedor
COPY nginx.conf /etc/nginx/nginx.conf

# Elimina el contenido por defecto de Nginx para evitar conflictos
RUN rm -rf /usr/share/nginx/html/*

# Copia los archivos de la aplicación compilada (de la fase 'build_stage')
# a la carpeta donde Nginx espera encontrar los archivos estáticos
COPY --from=build_stage /app/dist /usr/share/nginx/html

# Expone el puerto 80 del contenedor, que es donde Nginx estará escuchando
EXPOSE 80

# Define el comando que se ejecuta cuando el contenedor se inicia.
# Inicia Nginx en primer plano para que Docker pueda monitorearlo.
CMD ["nginx", "-g", "daemon off;"]