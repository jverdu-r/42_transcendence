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

# Instala Vault (añade esto antes de copiar tu código)
RUN apt-get update && apt-get install -y wget gnupg lsb-release && \
    wget -qO- https://apt.releases.hashicorp.com/gpg | gpg --dearmor > /usr/share/keyrings/hashicorp-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" > /etc/apt/sources.list.d/hashicorp.list && \
    apt-get update && apt-get install -y vault

# Copia los archivos de Vault Agent y el script de arranque
COPY start-with-vault.sh agent.hcl secrets.env.tpl ./

# Da permisos de ejecución al script
RUN chmod +x start-with-vault.sh

# Cambia el CMD para usar el script de arranque
CMD ["./start-with-vault.sh"]