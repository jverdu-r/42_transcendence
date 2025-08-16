# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# 1. Copiar solo los archivos de dependencias
COPY package*.json ./

# 2. Instalar dependencias (incluyendo tailwindcss si está en package.json)
RUN npm install

# 3. Verificar que tailwindcss esté instalado y el binario exista
RUN ls -la node_modules/.bin/tailwindcss || \
    (echo "TailwindCSS no está instalado. Instalando..." && \
     npm install -D tailwindcss@latest postcss@latest autoprefixer@latest)

# 4. Crear src/input.css
RUN mkdir -p src && \
    echo '@tailwind base;' > src/input.css && \
    echo '@tailwind components;' >> src/input.css && \
    echo '@tailwind utilities;' >> src/input.css

# 5. Crear tailwind.config.js manualmente
RUN echo 'module.exports = { content: ["./src/**/*.{ts,html}"], theme: { extend: {} }, plugins: [] }' > tailwind.config.js

# 6. Crear postcss.config.js
RUN echo 'module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }' > postcss.config.js

# 7. Copiar el resto del código
COPY . .

# 8. Compilar Tailwind CSS usando npx (ahora debería funcionar)
RUN npx tailwindcss -i src/input.css -o dist/tailwind.css --minify

# 9. Ejecutar tu build (Webpack)
RUN npm run build

# ----------------------------------------------

# Production stage
FROM nginx:alpine

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar assets
COPY --from=builder /app/dist/ /usr/share/nginx/html/

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
