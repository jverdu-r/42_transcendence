FROM node:20

WORKDIR /app

# Instala dependencias del sistema necesarias para compilar 'canvas' y Vault
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Instala Vault
RUN wget -q https://releases.hashicorp.com/vault/1.15.5/vault_1.15.5_linux_amd64.zip \
    && unzip vault_1.15.5_linux_amd64.zip \
    && mv vault /usr/local/bin/ \
    && rm vault_1.15.5_linux_amd64.zip

# Copia package*.json primero para aprovechar la caché de capas
COPY package*.json ./
COPY types.d.ts ./

# Instala las dependencias de npm
# Fuerza la reconstrucción de canvas desde cero
RUN npm install --build-from-source=canvas && npm install --save-dev @types/nodemailer
RUN npm install axios

# Copia el código fuente (incluyendo src/utils/i18n/)
COPY . .

# ✅ Ahora SÍ existe la carpeta src, así que podemos copiar los archivos .json
RUN mkdir -p dist/utils/i18n && cp -r src/utils/i18n/*.json dist/utils/i18n/

# Compila el proyecto
RUN npm run build

# Copia los archivos de configuración de Vault
COPY agent.hcl secrets.env.tpl start-with-vault.sh ./
RUN chmod +x start-with-vault.sh

EXPOSE 8000

CMD ["./start-with-vault.sh"]