FROM node:20

WORKDIR /app

# Instala dependencias del sistema necesarias para compilar 'canvas'
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

COPY types.d.ts ./ 
COPY package*.json ./

# Fuerza la reconstrucción de canvas desde cero
RUN npm install --build-from-source=canvas && npm install --save-dev @types/nodemailer

# Copia el código fuente
COPY . .

# Compila el proyecto
RUN npm run build

EXPOSE 8000

CMD ["npm", "start"]